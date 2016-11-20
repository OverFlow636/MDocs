"use strict";

//@TODO: oauth redirect
//https://github.com/login/oauth/authorize?client_id= process.env.CLIENT_ID &redirect_uri=http://mdocs.overflow636.com&scope=repo

const GitHubApi = require("github");
const github = new GitHubApi();
const request    = require('request');

// hardcoding my key directly for now.
github.authenticate({
  type: "oauth",
  token: process.env.MY_TOKEN
});


function grabPath(path) {
  return new Promise(function(res, rej) {

    github.repos.getContent({
      owner: 'overflow636',
      repo: 'MDocs',
      path: path
    }, function(err, data) {
      if (err) throw new Error(err);

      let proms = [];

      data.forEach(function(entry) {
        proms.push(new Promise((resolve, reject) => {
          var fileOrDir = {
            type: entry.type,
            fullPath: path + '/' + entry.name,
            path: entry.name
          };

          if (entry.type === 'dir') {
            grabPath(path + '/' + entry.name)
              .then(data => {
                fileOrDir.folder = data;
                resolve(fileOrDir);
              })
          } else if (entry.type === 'file' && entry.name.indexOf('.md') > -1) {
            grabData(entry.download_url)
              .then(data => {
                fileOrDir.data = data;
                resolve(fileOrDir);
              });
          } else {
            fileOrDir.binary = true;
            resolve(fileOrDir);
          }
        }));
      });

      Promise
        .all(proms)
        .then(function(data) {
          res(data);
        });
    });

  });

}

function grabData(path) {
  //console.log('grabData: ' + path);
  return new Promise((resolve, reject) => {
    request({
      uri: path
    }, function(err, response, body) {
      if (err) {
        reject(err);
      } else {
        resolve(body);
      }
    })
  });
}

module.exports = {
  grabPath
};
