const ReviewModel = require('./reviewModel');
const catchAsync = require('./catchAsync');
const factory = require('./handlerFactory');

// MIDDLEWARE that runs before addReview in the router file to set the id's
function setTourIds(req, res, next) {
  if (!req.body.tour) req.body.tour = req.params.tourID;
  if (!req.body.user) req.body.user = req.user.id;
  next();
}

const getAllReviews = factory.getAll(ReviewModel);
const getReview = factory.getOne(ReviewModel);
const addReview = factory.createOne(ReviewModel);
const deleteReview = factory.deleteOne(ReviewModel);
const modifyReview = factory.updateOne(ReviewModel);

module.exports = {
  getAllReviews,
  addReview,
  deleteReview,
  modifyReview,
  setTourIds,
  getReview,
};
