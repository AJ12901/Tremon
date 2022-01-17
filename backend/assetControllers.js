const AssetModel = require('./assetModel');
const catchAsync = require('./catchAsync');
const AppError = require('./appError');
const mongoose = require('mongoose');
const factory = require('./handlerFactory');

function getTopFiveCheap(req, res, next) {
  req.query.sort = '-ratingAverage,price';
  req.query.limit = '5';
  next();
}

// Factory handler allows us to use one core function to delete stuff from different models since the core delete functionality is the same across all the models
const getAllTours = factory.getAll(AssetModel);
const getTour = factory.getOne(AssetModel, { path: 'reviews' });
const addTour = factory.createOne(AssetModel);
const modifyTour = factory.updateOne(AssetModel);
const deleteTour = factory.deleteOne(AssetModel);

const calcStats = catchAsync(async function (req, res, next) {
  const stats = await AssetModel.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.2 } },
    },
    {
      $group: {
        _id: { $toUpper: '$difficulty' }, // id defines what we want to group by (in this case, the difficulty and just for lols, we uppercase it)
        numTours: { $sum: 1 }, // for each document matching the id, 1 is added to the sum, giving us the num of tours matching that id
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
      },
    },
    {
      $sort: {
        avgPrice: 1, // here, we use the name from the previous step in the pipeline (so 'avgPrice' to sort by price) and not the name in the original documents (so just 'price') (1 is for ascending and -1 for descending)
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats: stats,
    },
  });
});

const calcPlan = catchAsync(async function (req, res, next) {
  const year = Number(req.params.year);
  const plan = await AssetModel.aggregate([
    {
      $unwind: '$startDates',
      // makes it so if a tour has multiple start dates, it gets seperated into new tours with all the other data remaining the same
    },
    {
      $match: {
        // only matches tours from the year specified in the URL
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: { $month: '$startDates' }, // groups by the months specified in each of the start dates
        numToursStart: { $sum: 1 }, // shows how many tours in that month
        name: { $push: '$name' },
      },
    },
    {
      $addFields: {
        month: '$_id', // adds a 'month' value set to the _id value so we actually know what _id represents
      },
    },
    {
      $project: {
        _id: 0, // hides the _id value since the "month" now represents that
      },
    },
    {
      $sort: {
        numToursStart: -1,
      },
    },
    {
      $limit: 12,
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      plan,
    },
  });
});

const getToursWithin = catchAsync(async function (req, res, next) {
  const { distance, latlng, unit } = req.params; // destructuring to get params
  const [lat, lng] = latlng.split(','); // destructuring to get lat and lng
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1; // converts distance we want to search into radians using the values of distance, units, and radius of the earth

  if (!lat || !lng) {
    return next(
      new AppError(
        'Latitude and Longitude not defined correctly in the URl, please define them as lat,lng',
        400
      )
    );
  }

  // for this to work, startLocation must be indexed as a 2dsphere in the AssetModel
  const tours = await AssetModel.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } }, // filter object using geospatial operators (we specify that the startLocation should be a geoWithin sphere and that sphere is defined using centreSphere)
  });

  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      tours,
    },
  });
});

const getDistances = catchAsync(async function (req, res, next) {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');
  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

  if (!lat || !lng) {
    return next(
      new AppError(
        'Latitude and Longitude not defined correctly in the URl, please define them as lat,lng',
        400
      )
    );
  }

  const distanceData = await AssetModel.aggregate([
    {
      $geoNear: {
        near: {
          // defines at what point we want to calculate distance from
          type: 'Point',
          coordinates: [lng * 1, lat * 1],
        },
        distanceField: 'distance', // field in which value will be set is equal to 'distance'
        distanceMultiplier: multiplier, // multiplies distance with this to correct the units since default one is in metres
      },
    },
    {
      $project: {
        name: 1,
        distance: 1,
      },
    },
  ]);

  res.status(200).json({
    status: 'success',
    data: { distanceData },
  });
});

module.exports = {
  getAllTours,
  getTour,
  addTour,
  modifyTour,
  deleteTour,
  getTopFiveCheap,
  calcStats,
  calcPlan,
  getToursWithin,
  getDistances,
};
