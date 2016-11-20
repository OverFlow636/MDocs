"use strict";

const fs         = require('fs');
const request    = require('request');
const express    = require('express');
const bodyParser = require('body-parser');

const markdown = require('./src/markdown');
const github   = require('./src/github');
const app      = express();

app.use(bodyParser.urlencoded({
  extended: false
}));

app.use(bodyParser.json());

app.use(express.static('webroot'));

app.all('/', function (req, res) {

  if (req.query.code) {
    request({
      method : 'POST',
      uri    : 'https://github.com/login/oauth/access_token',
      json   : {
        client_id    : process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SEC,
        code         : req.query.code
      },
      headers: {
        Accept: 'application/json'
      }
    }, function (err, response, body) {

      //@TODO: save auth token
      console.log(err, response, body);

    })
  }

  if (req.body.path) {
    github.grabPath(req.body.path)
      .then(function (data) {
        fs.writeFileSync('./output.json', JSON.stringify(data));

        return res.json(data);
      })
  }

  res.send('<form method="post">Path: <input type="text" name="path"><input type="submit"></form>')
});

app.get('/dev', function(req, res) {

  var out = fs.readFileSync('./template.html').toString();

  var html = markdown.compile(fs.readFileSync('./' + req.query.path ).toString());
  var page = `<section>${html}</section>`;

  out = out.replace('#SECTIONS#', page);

  res.type('html').send(out);
});

app.get('/test', function (req, res) {

  var out        = fs.readFileSync('./template.html').toString();
  var data       = require('./output.json');
  var navigation = markdown.getNavigation(data, 1, '');
  var page       = markdown.buildPages(data, 0);

  out = out.replace('#NAV#', navigation);
  out = out.replace('#SECTIONS#', page);

  res.type('html').send(out);
});

app.listen(2255, function () {
  console.log('MDocs listening on port 2255!')
});
