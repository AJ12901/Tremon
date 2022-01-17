const UserModel = require('./usersModel');
const catchAsync = require('./catchAsync');
const jwt = require('jsonwebtoken');
const AppError = require('./appError');
const util = require('util');
const sendEmail = require('./email');
const crypto = require('crypto');

function returnJWT(id) {
  return jwt.sign({ id: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
}

function createSendJWT(user, statusCode, res) {
  const token = returnJWT(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    sameSite: 'none',
    secure: true,
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);
  user.password = undefined; // sets it so it doesn't show up in the output (still exists in the DB)

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user,
    },
  });
}

const signUp = catchAsync(async function (req, res, next) {
  // const newUser = await UserModel.create({
  //   name: req.body.name,
  //   email: req.body.email,
  //   password: req.body.password,
  //   passwordConfirm: req.body.passwordConfirm,
  //   passwordChangedAt: req.body.passwordChangedAt,
  // });

  const newUser = await UserModel.create(req.body);

  // logs user into the app (only after signup ofcourse, not during regular logins) by sending it the json web token
  // define jwt payload, secret, and options here
  createSendJWT(newUser, 201, res);
});

const login = catchAsync(async function (req, res, next) {
  const userEmail = req.body.email;
  const userPassword = req.body.password;

  // checking if user actually even inputted both fields
  if (!userEmail || !userPassword) {
    return next(new AppError('email and password must be entered!', 400));
  }

  const user = await UserModel.findOne({ email: userEmail }).select(
    '+password'
  ); // select('+password') makes it so the "user" object actually shows the password even though it usually wont since select is set to false in our Model schema

  if (!user || !(await user.checkPass(userPassword, user.password))) {
    return next(new AppError('Incorrect email or password!', 401));
  }

  createSendJWT(user, 200, res);
});

// This middleware function is used when we want to authenticate that a user is logged in before they try accessing a protected resource
const protect = catchAsync(async function (req, res, next) {
  let token = undefined;

  // 1) Checking if a token was sent in the header alongside the request

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // standard way of client sending a token to a server is sending it via a request header with the key "Authorization" with a value of "Bearer tokkenGoesHere"
    token = req.headers.authorization.split(' ');
    token = token[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError('You are not logged in! Login to get access'),
      401
    );
  }

  // 2) Checking token validity

  const decodedToken = await util.promisify(jwt.verify)(
    token,
    process.env.JWT_SECRET
  );

  // 3) Check if user still even exists in the DB

  const currentUser = await UserModel.findById(decodedToken.id);

  if (!currentUser) {
    return next(
      new AppError('The user corresponding to the token no longer exists', 401)
    );
  }

  // 4) Check if user changed password after token was issued

  if (currentUser.checkPasswordChange(decodedToken.iat)) {
    return next(
      new AppError('Password changed after the Token was issued', 401)
    );
  }

  req.user = currentUser;
  next();
});

async function isLoggedIn(req, res, next) {
  try {
    if (req.cookies.jwt) {
      console.log('cookie received');
      let status = 200;
      token = req.cookies.jwt;

      const decodedToken = await util.promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      const currentUser = await UserModel.findById(decodedToken.id);
      if (!currentUser) {
        status = 401;
      }

      if (currentUser.checkPasswordChange(decodedToken.iat)) {
        status = 401;
      }

      let response;

      if (currentUser) {
        response = {
          status,
          loggedIn: true,
          currentUser,
        };
      } else {
        response = {
          status,
          loggedIn: false,
        };
      }

      res.json(response);

      // res.locals is available in our html
      // res.locals.user = currentUser;
      // return next();
    } else {
      console.log('cookie NOT received');
      res.json({ status: 401, loggedIn: false });
    }
  } catch (err) {
    res.json({ status: 401, loggedIn: false });
  }
}

function logout(req, res) {
  const cookieOptions = {
    expires: new Date(Date.now() + 10000),
    httpOnly: true,
    sameSite: 'none',
    secure: true,
  };

  res.cookie('jwt', 'anyRandomText', cookieOptions);
  res.json({ status: 'success' });
}

// AUTHORIZATION is just checking if a certain type of user has the right to access a certain resource
function restrictTo(...roles) {
  return function (req, res, next) {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action'),
        403
      );
    }
    next();
  };
}

// runs when user clicks the forgot password button before logging in
const forgotPassword = catchAsync(async function (req, res, next) {
  // 1) Find user based on email sent in the post
  const user = await UserModel.findOne({ email: req.body.email });

  if (!user) {
    return next(new AppError('The email address provided is not valid!', 404));
  }

  // 2) Create reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false }); // since we changed database data in the instance method, we need to save it (validateBeforeSave is there since we're only giving email in this case so not all the regularly required data)

  // 3) Send it to user's email
  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/users/resetPassword/${resetToken}`;
  const message = `Submit a PATCH request with your new password and passwordConfirm to ${resetURL} to reset your password.\nIf you didn't forget your password, please ignore this email`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Password reset token valid for 10 minutes',
      message: message,
    });

    res.status(200).json({
      status: 'success',
      message: 'token sent to email',
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        'There was a problem sending the email! Try again later',
        500
      )
    );
  }
});

// runs when user clicks the email link so they can reset their pass
const resetPassword = catchAsync(async function (req, res, next) {
  // 1) Get token from req param and (since its the default one), encrypt it so we can compare it to the one in the db
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  // 2) Get user based on that token (and only get user if token hasn't expired based on the timestamp stored in the db)
  const user = await UserModel.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  // 3) Update User data
  if (!user) {
    return next(
      new AppError(
        'Token is invalid or has expired! Try resetting your password again.',
        400
      )
    );
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // 4) Update password changed at property using mongoose middleware

  // 5) Log user in via sending them a JWT

  createSendJWT(user, 200, res);
});

// runs when a logged in user wants to update their password
const updatePassword = catchAsync(async function (req, res, next) {
  // 1) Find user based on ID which we have access to since user is logged in
  const user = await UserModel.findById(req.user.id).select('+password');

  // 2) Check if current password provided in body is correct
  if (!(await user.checkPass(req.body.passwordCurrent, user.password))) {
    return next(
      new AppError('The current password provided is not correct', 401)
    );
  }

  // 3) Update password and log user in
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  createSendJWT(user, 200, res);
});

module.exports = {
  signUp,
  login,
  protect,
  restrictTo,
  forgotPassword,
  resetPassword,
  updatePassword,
  isLoggedIn,
  logout,
};
