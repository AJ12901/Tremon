const AppError = require('./appError');
const catchAsync = require('./catchAsync');
const UserModel = require('./usersModel');
const factory = require('./handlerFactory');

function filterObj(obj, ...allowedFields) {
  let newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) {
      newObj[el] = obj[el];
    }
  });

  return newObj;
}

const getAllUsers = catchAsync(async function (req, res, next) {
  const users = await UserModel.find();

  res.status(500).json({
    status: 'success',
    data: {
      users: users,
    },
  });
});

const updateMe = catchAsync(async function (req, res, next) {
  // 1) Make sure if password is sent along with the request, we immediately send an error
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'You cannot update password here, use /updateMyPassword to do so.',
        400
      )
    );
  }

  // 2) Filter through body to only include name and email and use it to then update user (we can't use .save here since that would run validators on fields like password which aren't even supposed to be here)
  const filteredBody = filterObj(req.body, 'name', 'email');

  const updatedUser = await UserModel.findByIdAndUpdate(
    req.user.id,
    filteredBody,
    {
      new: true,
      runValidators: true,
    }
  );

  res.status(200).json({
    status: 'success',
    user: updatedUser,
  });
});

const deleteMe = catchAsync(async function (req, res, next) {
  await UserModel.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

function addUser(req, res) {
  res.status(500).json({
    status: 'internal server error',
    message: 'undefined route, use /signup instead',
  });
}

function getMe(req, res, next) {
  req.params.id = req.user.id;
  next();
}

// These functions are only for admins (and only for data other than password)
const getUser = factory.getOne(UserModel);
const modifyUser = factory.updateOne(UserModel);
const deleteUser = factory.deleteOne(UserModel);

module.exports = {
  getAllUsers,
  getUser,
  addUser,
  modifyUser,
  deleteUser,
  updateMe,
  deleteMe,
  getMe,
};
