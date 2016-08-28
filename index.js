"use strict";

/**
* Import Packages
*/
// To create a nice http api
const express = require('express')
// for file handling
const busboy = require('connect-busboy')
//used for file path
let path = require('path')
// Medicalrecords database
// const db = require('mongoskin').db('mongodb://localhost:27017/medicalrecords');
const bodyParser = require('body-parser')
const _ = require('lodash');
var request = require('request');
const q = require('q');

let base_url = 'https://vivid-inferno-9795.firebaseio.com/';
let token ="EAAJRYk107AABALB6dAbSYnM6wUwfSwSuDLmZCb3swunuhO5dqPu7KfRqcBn6Sw5Kt53GIwJglaZA5ue6v5EeTLRU6fhnKUwOIufRaHysGZAE3L6QclFAFXEjo9RT6db4dS4xRCNf58mIxZCt7pZBBMyD8VY5HJG7lLwXMo6i1qQZDZD"
// Creates a segment of a UUID
let s4 = () => {
    return Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1);
}

// Generates UUID
let guid = () => {
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
    s4() + '-' + s4() + s4() + s4();
};



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

// [{"conversation":0,"name":"user1","current_state":"sending_photo","waiting":false}]

app.get('/gifwar/webhook', function (req, res) {
  if (req.query['hub.verify_token'] === 'YOUR_VERIFY_TOKEN') {
    res.send(req.query['hub.challenge']);
  } else {
    res.send('Error, wrong validation token');    
  }
});

app.get('/gifwar/', function (req, res) {
  res.send("HELLO")
});


function patch_firebase(json){
  request.patch({ url: base_url+'/.json', json: { slash: json} }, function (error, response, body) {
    // console.log(body);
  });
}

app.get('/start', function(req, res){
  let name = req.query['name'];
  request(base_url+'slash/.json', function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var json = JSON.parse(body);
      var should_join_existing_conversation = (_.filter(json, { waiting: false }).length % 5) >= 3;
      var conversations = _.union(json.map(function(value) { return parseInt(value.conversation); }));
      if(should_join_existing_conversation){
        console.log("should_join_existing_conversation");
        var conversation_to_join = 0;
        var current_state = '';
        for(let i = 0; i < conversations.length; i++){
          var users_in_conversation = _.filter(json, { conversation: conversations[i], waiting: false });
          if(users_in_conversation.length < 5){
            conversation_to_join = conversations[i];
            current_state = users_in_conversation.current_state;
            break;
          }
        }
        var new_user = {"conversation":conversation_to_join,"name": name,"current_state":current_state, "waiting":false, "unique_id": guid()};
        json.push(new_user);
        console.log(new_user);
      } else {
        console.log("not should_join_existing_conversation");
        var people_in_queue = _.filter(json, { waiting: true });
        var at_least_two_people_in_queue = (people_in_queue.length) >= 2;
        var conversation_to_join = _.max(conversations) + 1;
        if(at_least_two_people_in_queue){
          console.log("at_least_two_people_in_queue");
          console.log(people_in_queue);
          for(let j = 0; j < json.length; j++){
            for(let k = 0; k < people_in_queue.length; k++){
              if(json[j].unique_id == people_in_queue[k].unique_id){
                json[j].waiting = false;
                json[j].conversation = conversation_to_join;
                json[j].current_state = "sending_photo";
              }
            }
          }
          var new_user = {"conversation":conversation_to_join,"name": name,"current_state": "sending_photo", "waiting":false, "unique_id": guid()};
          json.push(new_user);
        } else {
          console.log("not at_least_two_people_in_queue");
          var new_user = {"conversation":0,"name": name,"current_state": "sending_photo", "waiting":true, "unique_id": guid()};
          json.push(new_user);
        }
      }
      patch_firebase(json);
      console.log(should_join_existing_conversation);
      //(json.length % 5)
      console.log(json.length) // Show the HTML for the Google homepage.
      res.send(json);
      //ar 
    }
  })
});

app.get("/leave", function(req, res){
  var unique_id = req.query['unique_id'];
  request(base_url+'slash/.json', function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var json = JSON.parse(body);
      var user = _.find(json, { unique_id: unique_id });
      console.log(user);
      if(user.waiting == false){
        console.log("user not waiting")
        var people_in_conversation = [];
        for(let i = 0; i < json.length; i++){
          if(json[i].conversation == user.conversation)
            people_in_conversation.push(i);
        }
        console.log("people_in_conversation")
        console.log(people_in_conversation);
        if(people_in_conversation.length <= 3 ){
          console.log("people_in_conversation less or equal than 3")
          for(var i = 0; i < people_in_conversation.length; i++){
            json[people_in_conversation[i]].waiting = true;
            json[people_in_conversation[i]].conversation = 0;
            json[people_in_conversation[i]].current_state = "sending_photo";
          }
        } else {
          console.log("people_in_conversation greater than 3")
        }
      } else {
        console.log("user not waiting")
      }
      json = _.pull(json, user);
      patch_firebase(json);
      res.send(json);
    }
  });
});

app.get("/send_photo", function(req, res){
  var unique_id = req.query['unique_id'];
  request(base_url+'slash/.json', function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var json = JSON.parse(body);
      var user_index = _.findIndex(json, { unique_id: unique_id });
      var user = json[user_index];
      if(user.waiting == false){
        var people_in_conversation = [];
        for(let i = 0; i < json.length; i++){
          if(json[i].conversation == user.conversation)
            people_in_conversation.push(i);
        }
        json[user_index].current_state = "sent_photo";
        var done_sending_photos = true;
        for(var i = 0; i < people_in_conversation.length; i++){
          if(json[people_in_conversation[i]].current_state != "sent_photo"){
            done_sending_photos = false;
            break;
          }
        }
        if(done_sending_photos){
          console.log("done_sending_photos")
          for(var i = 0; i < people_in_conversation.length; i++){
            json[people_in_conversation[i]].current_state = "writing_captions"
          }
        }
        patch_firebase(json);
        res.send(json);
      }
    } else {
      console.log("user is waiting")
      res.send(json);
    }
  });
});

app.get("/write_caption", function(req, res){
  var unique_id = req.query['unique_id'];
  request(base_url+'slash/.json', function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var json = JSON.parse(body);
      var user_index = _.findIndex(json, { unique_id: unique_id });
      var user = json[user_index];
      if(user.waiting == false){
        var people_in_conversation = [];
        for(let i = 0; i < json.length; i++){
          if(json[i].conversation == user.conversation)
            people_in_conversation.push(i);
        }
        json[user_index].current_state = "wrote_caption";
        var done_sending_photos = true;
        for(var i = 0; i < people_in_conversation.length; i++){
          if(json[people_in_conversation[i]].current_state != "wrote_caption"){
            done_sending_photos = false;
            break;
          }
        }
        if(done_sending_photos){
          console.log("done_sending_photos")
          for(var i = 0; i < people_in_conversation.length; i++){
            json[people_in_conversation[i]].current_state = "voting"
          }
        }
        patch_firebase(json);
        res.send(json);
      }
    } else {
      console.log("user is waiting")
      res.send(json);
    }
  });
});

app.get("/vote", function(req, res){
  var unique_id = req.query['unique_id'];
  request(base_url+'slash/.json', function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var json = JSON.parse(body);
      var user_index = _.findIndex(json, { unique_id: unique_id });
      var user = json[user_index];
      if(user.waiting == false){
        var people_in_conversation = [];
        for(let i = 0; i < json.length; i++){
          if(json[i].conversation == user.conversation)
            people_in_conversation.push(i);
        }
        json[user_index].current_state = "voted";
        var done_sending_photos = true;
        for(var i = 0; i < people_in_conversation.length; i++){
          if(json[people_in_conversation[i]].current_state != "voted"){
            done_sending_photos = false;
            break;
          }
        }
        if(done_sending_photos){
          console.log("done_sending_photos")
          for(var i = 0; i < people_in_conversation.length; i++){
            json[people_in_conversation[i]].current_state = "sending_photo"
          }
        }
        patch_firebase(json);
        res.send(json);
      }
    } else {
      console.log("user is waiting")
      res.send(json);
    }
  });
});


function sendTextMessage(sender, text) {
    let messageData = { text:text }
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token:token},
        method: 'POST',
        json: {
            recipient: {id:sender},
            message: messageData,
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending messages: ', error)
        } else if (response.body.error) {
            console.log('Error: ', response.body.error)
        }
    })
}


function sendImage(sender) {
    let messageData = {
        "attachment": {
            "type": "image",
            "payload": {
                "url": "https://media.giphy.com/media/l3vRkn7F5yV6wFBlu/giphy.gif"
            }
        }
    }
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token:token},
        method: 'POST',
        json: {
            recipient: {id:sender},
            message: messageData,
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending messages: ', error)
        } else if (response.body.error) {
            console.log('Error: ', response.body.error)
        }
    })
}

function sendGenericMessage(sender) {
    let messageData = {
        "attachment": {
            "type": "template",
            "payload": {
                "template_type": "generic",
                "elements": [{
                    "title": "First card",
                    "subtitle": "Element #1 of an hscroll",
                    "image_url": "http://messengerdemo.parseapp.com/img/rift.png",
                    "buttons": [{
                        "type": "web_url",
                        "url": "https://www.messenger.com",
                        "title": "web url"
                    }, {
                        "type": "postback",
                        "title": "Postback",
                        "payload": "Payload for first element in a generic bubble",
                    }],
                }, {
                    "title": "Second card",
                    "subtitle": "Element #2 of an hscroll",
                    "image_url": "https://media.giphy.com/media/l3vRkn7F5yV6wFBlu/giphy.gif",//"http://messengerdemo.parseapp.com/img/gearvr.png",
                    "buttons": [{
                        "type": "postback",
                        "title": "Postback",
                        "payload": "Payload for second element in a generic bubble",
                    }],
                }, {
                    "title": "THIRD card",
                    "image_url": "https://media.giphy.com/media/l3vRkn7F5yV6wFBlu/giphy.gif",
                }]
            }
        }
    }
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: {access_token:token},
        method: 'POST',
        json: {
            recipient: {id:sender},
            message: messageData,
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending messages: ', error)
        } else if (response.body.error) {
            console.log('Error: ', response.body.error)
        }
    })
}

app.post('/gifwar/webhook/', function (req, res) {
     let messaging_events = req.body.entry[0].messaging
    for (let i = 0; i < messaging_events.length; i++) {
      let event = req.body.entry[0].messaging[i]
      let sender = event.sender.id
      if (event.message && event.message.text) {
        let text = event.message.text
        if (text === 'Generic') {
            // sendGenericMessage(sender)
            sendImage(sender)
            continue
        }
        sendTextMessage(sender, "Text received, echo: " + text.substring(0, 200))
      }
      if (event.postback) {
        let text = JSON.stringify(event.postback)
        sendTextMessage(sender, "Postback received: "+text.substring(0, 200), token)
        continue
      }
    }
    res.sendStatus(200)
})
/**
* This should not take any data.
*/
app.listen(3333, function () {
  console.log('THUS SPOKE ZARATHUSTRA')
});

