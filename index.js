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
const db = require('mongoskin').db('mongodb://localhost:27017/medicalrecords');
const bodyParser = require('body-parser')


let http_api = express();
http_api.use(busboy());
http_api.use( bodyParser.json() );       // to support JSON-encoded bodies
http_api.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));

// Activate CORS
http_api.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*")
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept")
  next()
})


/**
* This should not take any data.
*/
http_api.listen(3000, function () {
  console.log('THUS SPOKE ZARATHUSTRA')
})