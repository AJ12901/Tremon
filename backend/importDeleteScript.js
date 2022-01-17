const dotenv = require('dotenv');
const mongoose = require('mongoose');
const fs = require('fs');
const AssetModel = require('./assetModel');
const UserModel = require('./usersModel');
const ReviewModel = require('./reviewModel');

dotenv.config({ path: './config.env' });

let DB = process.env.MONGO;
DB = DB.replace('<PASSWORD>', process.env.MONGO_PASS);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
  })
  .then((con) => {
    // console.log(con.connections);
  });

const assetsData = JSON.parse(
  fs.readFileSync('../public/data/models.json', 'utf-8')
);
// const usersData = JSON.parse(
//   fs.readFileSync('../dev-data/data/users.json', 'utf-8')
// );
// const reviewsData = JSON.parse(
//   fs.readFileSync('../dev-data/data/reviews.json', 'utf-8')
// );

async function importData() {
  try {
    await AssetModel.create(assetsData);
    // await UserModel.create(usersData, { validateBeforeSave: false });
    // await ReviewModel.create(reviewsData);

    console.log('Data Uploaded!');
  } catch (err) {
    if (err) throw err;
  }
  process.exit();
}

async function deleteData() {
  try {
    await AssetModel.deleteMany();
    // await UserModel.deleteMany();
    // await ReviewModel.deleteMany();

    console.log('Data Deleted!');
  } catch (err) {
    if (err) throw err;
  }
  process.exit();
}

// process.argv is an array of all the things we run using node
// console.log(process.env);

if (process.argv[2] === '--import') {
  importData();
} else if (process.argv[2] === '--delete') {
  deleteData();
}
