const express = require('express');
const usersControllers = require('./usersControllers');
const authControllers = require('./authControllers');

const router = express.Router();

// Routes open to everyone
router.post('/signup', authControllers.signUp);
router.post('/login', authControllers.login);
router.post('/forgotPassword', authControllers.forgotPassword);
router.patch('/resetPassword/:token', authControllers.resetPassword);

// Routes below this are only open to logged in users so we use middelware in the line below to protect all the routes that are below this point
router.use(authControllers.protect);

router.patch('/updateMyPassword', authControllers.updatePassword);
router.patch('/updateMe', usersControllers.updateMe);
router.delete('/deleteMe', usersControllers.deleteMe);
router.get('/getMe', usersControllers.getMe, usersControllers.getUser);

// Routes below this are only open to admins so we use middelware in the line below to restrict them only to admins
router.use(authControllers.restrictTo('admin'));

router
  .route('/')
  .get(usersControllers.getAllUsers)
  .post(usersControllers.addUser);

router
  .route('/:id')
  .get(usersControllers.getUser)
  .patch(usersControllers.modifyUser)
  .delete(usersControllers.deleteUser);

module.exports = router;
