const express = require('express');
const authControllers = require('./authControllers');
const reviewControllers = require('./reviewControllers');

// By setting mergeParam: true, we get access to the request parameter :tourId defind in the tourRoutes
const router = express.Router({ mergeParams: true });

// Routes below this are only open to logged in users so we use middelware in the line below to protect all the routes that are below this point
router.use(authControllers.protect);

router
  .route('/')
  .get(reviewControllers.getAllReviews)
  .post(
    authControllers.restrictTo('user'),
    reviewControllers.setTourIds,
    reviewControllers.addReview
  );

router
  .route('/:id')
  .get(reviewControllers.getReview)
  .delete(
    authControllers.restrictTo('user', 'admin'),
    reviewControllers.deleteReview
  )
  .patch(
    authControllers.restrictTo('user', 'admin'),
    reviewControllers.modifyReview
  );

module.exports = router;
