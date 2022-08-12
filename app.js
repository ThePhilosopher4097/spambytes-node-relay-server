var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
require('dotenv').config()
const cors = require("cors");

const Logger = require('logger-nodejs');
const log = new Logger();

var app = express();

app.use(cors());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
// app.set('view engine', 'jade');
const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://spambytes:spambytes@cluster0.viuzp9j.mongodb.net/dev?retryWrites=true&w=majority',
{
  useUnifiedTopology: true,
},
async (error) => {

  if(error) log.error("MONGODB CONNECTION ERROR : " , error);
  else log.info("MONGODB CONNECTION ESTABLISHED SUCCESFULLY.");
  const { authRouter } = require("node-mongoose-auth");


// var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var emailRouter = require('./routes/email');



app.use('/auth', authRouter);
app.use('/users', usersRouter);
app.use('/email', emailRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
});

});

module.exports = app;