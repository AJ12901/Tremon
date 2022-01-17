const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        minlength: [2, 'name must be at least 2 characters long'],
    },

    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        validate: [validator.isEmail, 'Email is not valid'],
    },

    photo: { type: String },

    role: {
        type: String,
        default: 'user',
        enum: ['user', 'admin'],
    },

    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [8, 'Password must be at least 8 characters long'],
        select: false,
    },

    passwordConfirm: {
        type: String,
        required: [true, 'Password confirmation is required'],
        validate: {
            validator: function (el) {
                return el === this.password;
            },

            message: 'Passwords must match',
        },
    },

    passwordChangedAt: {
        type: Date,
    },

    passwordResetToken: String,
    passwordResetExpires: Date,
    active: {
        type: Boolean,
        default: true,
        select: false,
    },
});

userSchema.pre('save', async function (next) {
    // makes it so encryption only runs when password is created/modified (for eg, we don't want to re-encrypt it if only the email is modified)
    if (!this.isModified('password')) return next();

    this.password = await bcrypt.hash(this.password, 12); // hashes the pass with a cost of 12
    this.passwordConfirm = undefined; // this works even though passwordConfirm is a required field since its only "required" to be inputted into the DB, not to always persist in the DB

    next();
});

// When changing password, this automatically sets the passwordChangedAt property in the db
userSchema.pre('save', function (next) {
    if (!this.isModified('password') || this.isNew) return next(); // makes it so this middleware won't do anything if a new document is created or if password is not being changed

    this.passwordChangedAt = Date.now() - 1000; // -1000 is there since sometimes it takes some time to save and set this property into the DB and we don't want it to set after we send the JWT in the resetPassword function
    next();
});

// This query middleware will run before any find request to make sure that users with active: false are not sent in the response
userSchema.pre(/^find/, function (next) {
    this.find({ active: { $ne: false } }); // this points to current query
    next();
});

// by defining a checkPass function like this, we get access to it on every document in the user collection
userSchema.methods.checkPass = async function (pass, hashedPass) {
    return await bcrypt.compare(pass, hashedPass); // returns true if passwords are the same
};

// we call this method on the currentUser in the protect function in the authController to check if user changed password after jwt was issued
userSchema.methods.checkPasswordChange = function (JWTIssuedAt) {
    if (this.passwordChangedAt) {
        // only want to check if the password has ever been changed
        let changedTimestamp = this.passwordChangedAt.getTime();
        changedTimestamp = parseInt(changedTimestamp / 1000, 10); // /1000 is to convert ms to s, and parseInt and ,10 is to parse the base 10 number into an integer
        return changedTimestamp > JWTIssuedAt;
    }

    return false;
};

userSchema.methods.createPasswordResetToken = function () {
    const resetToken = crypto.randomBytes(32).toString('hex'); // creates a random 32 bit token and converts it to a hexadecimal string

    this.passwordResetToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex'); // creates an hexadecimal encrypted version of resetToken based on sha256 encryption
    this.passwordResetExpires = Date.now() + 600000; // reset timeout should only give 10 minutes to reset password (so 10 min is 10*60*1000 in ms)

    console.log(resetToken, this.passwordResetToken);

    return resetToken; // return this since we actually wanna send this to the client
};

const UserModel = mongoose.model('Users', userSchema);

module.exports = UserModel;
