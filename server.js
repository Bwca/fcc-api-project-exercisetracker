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
