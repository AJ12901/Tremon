const mongoose = require('mongoose');
const slugify = require('slugify');
const UserModel = require('./usersModel');

const assetSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A 3D asset must have a name'],
      unique: true,
      maxlength: [40, 'Name must be 5-40 characters'],
      minlength: [5, 'Name must be 5-40 characters'],
      // both of the above are string validators
    },

    slug: String,

    price: {
      type: Number,
      required: [true, 'A 3D asset must have a price'],
      // select: false this would permanantly hide the price parameter and value from ever being sent to the client
    },

    priceDiscount: {
      type: Number,
      validate: {
        validator: function (value) {
          return value < this.price;
        },
        message: 'Discount cannot be greater than the price',
      },
    },

    ratingsAverage: {
      type: Number,
      default: 4.0,
      set: (value) => Math.round(value * 10) / 10, // set runs everytime there's a new value on ratings average and we use this function to round the value
      min: [1, 'A rating must be between 1.0-5.0'],
      max: [5, 'A rating must be between 1.0-5.0'],
      // min and max are validators for the Number and Date data types
    },

    ratingsQuantity: {
      type: Number,
      default: 0,
    },

    description: {
      type: String,
      trim: true,
    },

    isSecret: {
      type: Boolean,
      default: false,
    },

    imageCover: {
      type: String,
      trim: true,
      required: [true, 'A 3D asset must have a summary'],
    },

    images: [String],

    createdAt: {
      type: Date,
      default: Date.now(),
    },

    createdBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'Users',
      immutable: true,
    },

    category: {
      type: String,
      required: [true, 'An asset must belong to a category'],
      enum: [
        'architecture',
        'vehicles',
        'characters',
        'furniture',
        'electronics',
        'nature',
        'other',
      ],
      default: 'other',
    },

    fileType: {
      type: String,
      required: [true, 'An asset must have a filetype'],
      enum: ['.blend', '.obj', '.max', '.c4d', '.fbx', '.ma'],
    },

    fileDirectory: {
      type: String,
    },
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// INDEXING makes it so querying documents based on query fields like price and ratingsAverage is faster since the app doesn't have to search through all documents (instead it searches through indexes created based on the price and ratingsAverage properties)
assetSchema.index({ price: 1, ratingsAverage: -1 }); // compound index allows us to query using price and ratingsAverage together (or seperately as well)
assetSchema.index({ slug: 1 });
// we don't create indexes for all properties since each index we create uses some space in our DB

// VIRTUAL PROPERTY
// assetSchema.virtual('durationWeeks').get(function () {
//   return this.duration / 7;
// });

// VIRTUAL POPULATE ('reviews' is the field that will be virtually created)
assetSchema.virtual('reviews', {
  ref: 'Review', // just like a ref in the schema where it's the name of the model we want to reference
  foreignField: 'tour', // corresponds to the 'tour' property (in the model specified above) where the reference to the current model is stored
  localField: '_id', // corresponds to the property in this model where that same value is stored (so both foreginField and localField correspond to the same objectId)
});

// 1) DOCUMENT MIDDLEWARE: Here we simply run a pre save middleware to create and save a lowercase slug property in our DB out of the name property we already have
assetSchema.pre('save', function (next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

// 1) DOCUMENT MIDDLEWARE: In post middleware we get access to a doc parameter as well which is the document that was just processed
assetSchema.post('save', function (doc, next) {
  // console.log(doc.slug);
  next();
});

// 2) QUERY MIDDLEWARE: We want to hide all our tours that are secret so we run a .find() on the query (since "this" is just a query) and exlcude the ones that are secret
assetSchema.pre(/^find/, function (next) {
  this.find({ isSecret: { $ne: true } });
  next();
});

assetSchema.post(/^find/, function (docs, next) {
  // console.log(docs);
  next();
});

// 3) AGGREGATION MIDDLEWARE: Here we want to also exclude the secret tours in our agregations (so our stats and plan get requests)
assetSchema.pre('aggregate', function (next) {
  // makes sure there's no geoNear stage in the pipeline because if it is, it must be the first stage to function correctly and we can't add the match stage for isSecret
  if (!(this.pipeline().length > 0 && '$geoNear' in this.pipeline()[0])) {
    this.pipeline().unshift({ $match: { isSecret: { $ne: true } } }); // unshift is just a JS array method to add an element to the start of the array
  }

  console.log(this.pipeline());
  next();
});

const AssetModel = mongoose.model('assets', assetSchema);

module.exports = AssetModel;
