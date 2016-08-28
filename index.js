"use strict";

/**
* Import Packages
*/
const http = require('http')
// To create a nice http api
const express = require('express')
// for file handling
const busboy = require('connect-busboy')
//used for file path
let path = require('path')
// Medicalrecords database
// const db = require('mongoskin').db('mongodb://localhost:27017/medicalrecords');
const bodyParser = require('body-parser')


let app = express();
app.use(busboy());
app.use( bodyParser.json() );       // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));

// Activate CORS
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*")
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
  next()
})


/**
* This should not take any data.
*/
app.listen(3000, function () {
  console.log('THUS SPOKE ZARATHUSTRA')
});

app.get('/webhook', function (req, res) {
  if (req.query['hub.verify_token'] === 'YOUR_VERIFY_TOKEN') {
    res.send(req.query['hub.challenge']);
  } else {
    res.send('Error, wrong validation token');    
  }
});