const mongoose = require('mongoose');
const AssetModel = require('./assetModel');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review cannot be empty'],
    },

    rating: {
      type: Number,
      required: true,
      min: [1, 'A rating must be between 1.0-5.0'],
      max: [5, 'A rating must be between 1.0-5.0'],
    },

    createdAt: {
      type: Date,
      default: Date.now(),
    },

    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tours',
      required: [true, 'A review must belong to a tour'],
    },

    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'Users',
      required: [true, 'A review must belong to a user'],
    },
  },
  {
    // these options make it so virtual properties also show up in JSON and Object type outputs
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

reviewSchema.index({ tour: 1, user: 1 }, { unique: true }); // makes it so one user can't write multiple reviews for the same tour (as the combo of tour and user properties is forced to be unique)

reviewSchema.pre(/^find/, function (next) {
  //   this.populate({
  //     path: 'tour',
  //     select: 'name',
  //   });
  this.populate({
    path: 'user',
    select: 'name photo',
  });
  next();
});

// .aggregate() can only be called on a model so we use a static method (instead of an instance method) to define our aggregation pipeline
reviewSchema.statics.calcAvgRatings = async function (tourId) {
  const stats = await this.aggregate([
    {
      $match: { tour: tourId }, // matches all the reviews corresponding to the tour ID passed in
    },
    {
      $group: {
        _id: '$tour', // this defines the common field that all of the documents have in common that we'll group by (in this case its the 'tour' field as all reviews have the same tour property, that's equal to tourId, as selected in the match stage)
        numRatings: { $sum: 1 }, // adds 1 to the numRatings for each tour with tour: tourId
        avgRating: { $avg: '$rating' },
      },
    },
  ]);

  if (stats.length > 0) {
    await AssetModel.findByIdAndUpdate(tourId, {
      ratingsAverage: stats[0].avgRating,
      ratingsQuantity: stats[0].numRatings,
    });
  } else {
    await AssetModel.findByIdAndUpdate(tourId, {
      ratingsAverage: 4,
      ratingsQuantity: 0,
    });
  }
};

// POST save middleware (we dont use pre-save as we need the review to actually be uploaded into the db before we can calc ratings) that calls the static method to calc and update ratings when a review is created
reviewSchema.post('save', function () {
  this.constructor.calcAvgRatings(this.tour); // this.constructor points to the ReviewModel
});

// PRE QUERY middleware that finds a document (when updating/deleting) and saves that review to that query (in the this.rev) so we may use it in the POST query middleware below
reviewSchema.pre(/^findOneAnd/, async function (next) {
  this.rev = await this.findOne();
  next();
});
reviewSchema.post(/^findOneAnd/, async function () {
  await this.rev.constructor.calcAvgRatings(this.rev.tour); // this line is very simple to the post save middleware one function above except "this.rev" points to the current review instead of "this" (because its a query middleware and not a document one)
});

const ReviewModel = mongoose.model('Review', reviewSchema);

module.exports = ReviewModel;
