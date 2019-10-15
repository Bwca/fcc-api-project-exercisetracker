require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');

const UserLog = require('./user-log.model');

const app = express();
const mongoErrorResponses = new Map([[11000, 'Error! Username already exists.']]);
mongoose.connect(process.env.MLAB_URI, { useMongoClient: true });
mongoose.Promise = global.Promise;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('public'));


/** Retrieve a full exercise log of any user */
app.get('/api/exercise/log', (req, res) => {

  const userId = req.query.userId;

  if (!userId) {
    res.send('Error! User id not provided!');
    return;
  }

  let fromDate;
  if (req.query.from) {
    fromDate = convertFilterStringDateToDateObject(req.query.from);
  }

  if (fromDate && !fromDate instanceof Date) {
    res.send('Error! Invalid from date provided!');
    return;
  }

  let toDate;
  if (req.query.to) {
    toDate = convertFilterStringDateToDateObject(req.query.to);
  }

  if (toDate && !toDate instanceof Date) {
    res.send('Error! Invalid to date provided!');
    return;
  }

  if (fromDate > toDate) {
    res.send('Error! From date cannot be after To date!');
    return;
  }

  const numberLimit = Number(req.query.limit);

  const limit = Number.isInteger(numberLimit) ? numberLimit : undefined;

  if (!limit && numberLimit) {
    res.send('Error! Invalid limit provided!');
    return;
  }

  const selectFields = {
    "_id": 1,
    "username": 1,
    "log.description": 1,
    "log.duration": 1,
    "log.date": 1
  };

  UserLog.findById(userId, selectFields).exec((err, doc) => {

    if(err){
      res.send('Error! Something has gone wrong');
      return;
    }

    const displayLog = doc.log.map(i => ({ description: i.description, duration: i.duration, date: getDisplayDateString(i.date) }));

    res.json({ _id: doc._id, username: doc.username, count: displayLog.length, log: displayLog });
  });

});


/** Create new user log */
app.post('/api/exercise/new-user', (req, res) => {
  const user = new UserLog({
    username: req.body.username
  });

  user.save((err, doc) => {
    if (err) {
      res.send(mongoErrorResponses.get(err.code));
      return;
    }
    res.json({ "username": doc.username, "_id": doc._id });
  });
});


/** Retrieve the list of all users */
app.get('/api/exercise/users', (req, res) => {

  const visibleDocFields = {
    "_id": 1,
    "username": 1,
    "__v": 1
  };

  UserLog.find({}).select(visibleDocFields).exec((err, docs) => {
    if (err) {
      res.send('Something went wrong, please try again later.');
    }
    res.json(docs);
  });
});


/** Add exercise to a user */
app.post('/api/exercise/add', (req, res) => {

  const userId = req.body.userId;
  if (!userId) {
    sendEmptyInputFieldError('userId', res);
    return;
  }

  const description = req.body.description;
  if (!description) {
    sendEmptyInputFieldError('description', res);
    return;
  }

  const duration = req.body.duration;
  if (!duration) {
    sendEmptyInputFieldError('duration', res);
    return;
  }
  if (!Number.isInteger(Number(duration))) {
    res.send('Error, duration must be an integer!');
    return;
  }

  const date = getNewLogEntryDate(req.body.date);
  if (!date instanceof Date) {
    res.send('Error, invalid date provided!');
    return;
  }

  const filter = { _id: userId };

  const log = {
    description,
    duration,
    date
  };

  const update = { $push: { log } };

  const updateOptions = { new: true };

  UserLog.findOneAndUpdate(filter, update, updateOptions).exec((err, doc) => {
    res.json(doc);
  });

});


app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


// Not found middleware
app.use((req, res, next) => {
  return next({ status: 404, message: 'not found' })
});


// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
});


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
});

/** Convert filter date to Date object if possible */
function convertFilterStringDateToDateObject(dateString) {
  if (isValidISODatestring(dateString)) {
    return new Date(dateString);
  }
  return 'Invalid Date Provided';
}


function getDisplayDateString(date) {
  /** Thu Dec 13 1990 */

  const days = new Map([[0, 'Sun'], [1, 'Mon'], [2, 'Tue'], [3, 'Wed'], [4, 'Thu'], [5, 'Fri'], [6, 'Sat']]);
  const months = new Map([[0, 'Jan'], [1, 'Feb'], [2, 'Mar'], [3, 'Apr'], [4, 'May'], [5, 'Jun'], [6, 'Jul'], [7, 'Aug'], [8, 'Sep'], [9, 'Oct'], [10, 'Nov'], [11, 'Dec']]);

  const day = days.get(date.getDay());
  const month = months.get(date.getMonth());

  return `${day} ${month} ${date.getDate()} ${date.getFullYear()}`;
}


/** Notify that a required field was not filled */
function sendEmptyInputFieldError(fieldName, res) {
  res.send(`Error, ${fieldName} field cannot be empty!`);
}


/** Get a date object or Invalid date for a new log entry */
function getNewLogEntryDate(postDate) {

  if (isValidISODatestring(postDate)) {
    return new Date(postDate);
  }

  if (!postDate) {
    return new Date();
  }

  return 'Invalid date';
}


/** Check a string to be a valid ISO8601 */
function isValidISODatestring(date) {
  return /^\d{4}(-\d{2}){2}$/.test(date);
}