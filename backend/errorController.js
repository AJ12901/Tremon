const AppError = require('./appError');

function sendErrDev(err, res) {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stackTrace: err.stack,
  });
}

function sendErrProd(err, res) {
  // If err is a known operational error that's known to occur
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });

    // Some random unknown error
  } else {
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong :(',
    });
  }
}

function handleCastErrorDB(err) {
  return new AppError(`Invalid ${err.path} with a value of ${err.value}`, 400);
}

function handleDuplicateFieldDB(err) {
  const objKey = Object.keys(err.keyValue)[0];
  const objVal = Object.values(err.keyValue)[0];

  return new AppError(
    `Duplicate Field Error! ${objVal} is not a unique value for the property: ${objKey}`,
    400
  );
}

function handleMongoValidationDB(err) {
  const objVals = Object.values(err.errors).map((el) => el.message);

  return new AppError(`Invalid data input: ${objVals.join('. ')}`, 400);
}

function handleJsonWebTokenError(err) {
  return new AppError(
    `Please login again! JSON Web Token Error: ${err.message}`,
    401
  );
}

function handleTokenExpiredError(err) {
  return new AppError(
    `Please login again! Token Expired Error: ${err.message}`,
    401
  );
}

function globalErrorMiddleware(err, req, res, next) {
  err.status = err.status || 'error';
  err.statusCode = err.statusCode || 500;

  if (process.env.NODE_ENV === 'development') {
    sendErrDev(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = JSON.stringify(err);
    error = JSON.parse(error);

    // In case we get a casterror with a mismatched id or name etc, we use a handleCastErrorDB function to make sure that's marked as an operational error
    if (error.name === 'CastError') {
      error = handleCastErrorDB(error);
    }

    if (error.code === 11000) {
      error = handleDuplicateFieldDB(error);
    }

    if (error.name === 'ValidationError') {
      error = handleMongoValidationDB(error);
    }

    if (error.name === 'JsonWebTokenError') {
      error = handleJsonWebTokenError(error);
    }

    if (error.name === 'TokenExpiredError') {
      error = handleTokenExpiredError(error);
    }

    sendErrProd(error, res);
  }
}

module.exports = globalErrorMiddleware;
