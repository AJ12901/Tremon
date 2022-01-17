const dotenv = require('dotenv');
const app = require('./app');
const mongoose = require('mongoose');

// THIS HANDLER SHOULD BE AT THE TOP OF OUR CODE SINCE WE WANT TO START LISTENING FOR UNCAUGHTEXCEPTIONS RIGHT FROM THE START
// Errors/bugs in our sync code that aren't caught anywhere are called uncaughtExceptions
process.on('uncaughtException', (err) => {
  console.log('ERROR: Uncaught Exception! App shutting down ...');
  console.log(err);
  server.close(1);
});

dotenv.config({ path: './config.env' });

// console.log(process.env);
console.log(app.get('env'));

let DB = process.env.MONGO;
DB = DB.replace('<PASSWORD>', process.env.MONGO_PASS);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
  })
  .then((con) => {
    // console.log(con.connections);
  });

const port = 8081;
const server = app.listen(port, () => {
  console.log('running on port ', port);
});

// This eventEmitter catches any unhandled promise Rejections not previously caught by our error handlers in our async code
// process.on('unhandledRejection', (err) => {
//   console.log('ERROR: Uncaught Rejection! App shutting down ...');
//   console.log(err);
//   server.close(() => {
//     process.exit(1);
//   });
// });
