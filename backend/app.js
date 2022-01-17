const path = require('path');
const express = require('express');
const morgan = require('morgan');
const app = express();
const mongoose = require('mongoose');
const assetsRouter = require('./assetsRoutes');
const usersRouter = require('./usersRoutes');
const reviewsRouter = require('./reviewRoutes');
const AppError = require('./appError');
const globalErrorMiddleware = require('./errorController');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const xssClean = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
// const viewRouter = require('./viewRoutes');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const authController = require('./authControllers');
const assetControllers = require('./assetControllers');

// app.set('view engine', 'pug'); // sets our dynamic template engine to pug
// app.set('views', path.join(__dirname, 'views')); // sets the 'views' folder that pug needs to the views folder that we created

// 1) GLOBAL MIDDLEWARES
app.use(helmet()); // sets secuirty http headers
app.use(morgan('dev')); // logging requests

const limit = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 100,
  message: 'Too many requests from this IP, try again in an hour',
});
app.use('/api', limit); // limits requests from same IP's

app.use(
  cors({
    origin: 'http://127.0.0.1:3000',
    credentials: true,
  })
);
// app.use(cors({ credentials: true }));

app.use(express.json({ limit: '10kb' })); // body parser (reading data from body into req.body)
app.use(cookieParser());

app.use(mongoSanitize()); // Data sanitization against NoSQL query injection
app.use(xssClean()); // Data sanitization against XSS

app.use(
  hpp({
    // prevents parameter pollution (so if we have ?sort=duration&sort=price, it'll ignore the first one since we can't really sort by 2 properties)
    whitelist: [
      'duration',
      'ratingsAverage',
      'ratingsQuantity',
      'maxGroupSize',
      'difficulty',
      'price',
    ], // whitelist is to make sure some parameters are allowed multiple properties since it makes sense in some cases
  })
);

app.use(express.static(path.join(__dirname, 'public'))); // serving static files like html/images etc

// testing middeware that doesn't do anything useful lol
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  console.log(req.cookies);
  next();
});

app.get('/isloggedin', authController.isLoggedIn);
app.get('/logout', authController.logout);
app.get('/getassets', assetControllers.getAllTours);
app.use('/api/v1/assets', assetsRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/reviews', reviewsRouter);
// app.use('/', viewRouter);

app.use('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server`, 404));
});

app.use(globalErrorMiddleware);

module.exports = app;
