const nodemailer = require('nodemailer');
const catchAsync = require('./catchAsync');

const sendEmail = catchAsync(async function (options) {
  // 1) Transporter is the service that actually sends the email (so nodemailer doesn't do that itself)
  // We use mailtrap for testing which is a fake email sending service meant for development

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  // 2) Email Options

  const mailOptions = {
    from: 'AJ <hehehe@gmail.com>',
    to: options.email,
    subject: options.subject,
    text: options.message,
  };

  // 3) Use nodemailer to send email

  await transporter.sendMail(mailOptions);
});

module.exports = sendEmail;
