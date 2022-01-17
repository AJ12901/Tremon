function catchAsync(anAsyncFx) {
  return (req, res, next) => {
    anAsyncFx(req, res, next).catch((err) => next(err));
  };
}

module.exports = catchAsync;
