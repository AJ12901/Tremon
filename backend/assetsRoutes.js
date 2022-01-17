const express = require('express');
const assetControllers = require('./assetControllers');
const authControllers = require('./authControllers');
const reviewControllers = require('./reviewControllers');
const reviewRouter = require('./reviewRoutes');

const router = express.Router();

// aggregation pipeline route
// router.route('/tours-stats').get(assetControllers.calcStats);
// router
//     .route('/tours-plan/:year')
//     .get(
//         authControllers.protect,
//         authControllers.restrictTo('admin', 'lead-guide', 'guide'),
//         assetControllers.calcPlan
//     );

// router
//     .route('/top-5-cheap-tours')
//     .get(assetControllers.getTopFiveCheap, assetControllers.getAllTours);

router
    .route('/')
    .get(assetControllers.getAllTours)
    .post(authControllers.protect, assetControllers.addTour);

router
    .route('/:id')
    .get(assetControllers.getTour)
    .patch(authControllers.protect, assetControllers.modifyTour)
    .delete(authControllers.protect, assetControllers.deleteTour);

// If we get a req like this, we send it off to the reviewRouter with the tourID param value (by setting mergeParam: true in that router)
router.use('/:tourID/reviews', reviewRouter);

module.exports = router;
