// Extending a class from Error still gives it access to all of the Error class's functions
class AppError extends Error {
  constructor(message, statusCode) {
    super(message); // runs the constructor of the default Error class with the message (just as we would do so regularly)

    this.statusCode = statusCode;
    this.status = String(statusCode).startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; // tells us that any error created by this class is an operational one (so that other errors not created via this class can be handled differently)

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
