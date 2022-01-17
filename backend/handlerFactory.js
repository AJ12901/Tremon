const catchAsync = require('./catchAsync');
const AppError = require('./appError');
const APIFeatures = require('./apiFeatures');

function deleteOne(Model) {
  return catchAsync(async function (req, res, next) {
    const deletedDoc = await Model.findByIdAndDelete(req.params.id);

    if (!deletedDoc) {
      console.log(deletedDoc);
      return next(new AppError('No document with that ID was found', 404));
    }

    res.status(204).json({
      status: 'success',
      data: null,
    });
  });
}

function updateOne(Model) {
  return catchAsync(async function (req, res, next) {
    const updatedDoc = await Model.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updatedDoc) {
      console.log(updatedDoc);
      return next(new AppError('No document with that ID was found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: updatedDoc,
      },
    });
  });
}

function createOne(Model) {
  return catchAsync(async function (req, res, next) {
    req.body.createdBy = req.user.id;
    const newObject = await Model.create(req.body);

    // if (newObject.price) {
    //   newObject.createdBy = req.user.id;
    //   newObject.save();
    // }

    res.status(201).json({
      status: 'success',
      data: {
        data: newObject,
      },
    });
  });
}

function getOne(Model, populateOps) {
  return catchAsync(async function (req, res, next) {
    let query = Model.findById(req.params.id);
    if (populateOps) query = query.populate(populateOps);
    const requestedDoc = await query;

    if (!requestedDoc) {
      return next(new AppError('No document with that ID was found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: requestedDoc,
      },
    });
  });
}

function getAll(Model) {
  return catchAsync(async function (req, res, next) {
    // Allows for neted GET review on tour
    let filter = {};
    if (req.params.tourID) filter = { tour: req.params.tourID };

    let features = new APIFeatures(Model.find(filter), req.query); // filter's gonna be empty incase of users or tours
    features = features.filter().sort().limitFields().paginate();

    const data = await features.query;

    res.status(200).json({
      status: 'success',
      results: data.length,
      time: req.requestTime,
      data,
    });
  });
}

module.exports = {
  deleteOne,
  updateOne,
  createOne,
  getOne,
  getAll,
};
