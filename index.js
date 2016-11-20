"use strict";
var fs = require('fs');

var GitHubApi = require("github");

var github = new GitHubApi();

//https://github.com/login/oauth/authorize?client_id= process.env.CLIENT_ID &redirect_uri=http://mdocs.overflow636.com&scope=repo


// hardcoding my key directly for now.
github.authenticate({
  type: "oauth",
  token: process.env.MY_TOKEN
});

var navTree = {};


var request = require('request');

var express = require('express');
var app = express();
var bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static('webroot'));

app.all('/', function (req, res) {

  if (req.query.code) {
    request({
      method: 'POST',
      uri: 'https://github.com/login/oauth/access_token',
      json: {
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SEC,
        code: req.query.code
      },
      headers: {
        Accept: 'application/json'
      }
    }, function(err, response, body) {

      console.log(err, response, body);

    })
  }

  if (req.body.path) {
    grabPath(req.body.path)
      .then(function(data) {
        fs.writeFileSync('./output.json', JSON.stringify(data));

        return res.json(data);
      })
  }


  res.send('<form method="post">Path: <input type="text" name="path"><input type="submit"></form>')
});






app.get('/test', function(req, res) {

  var out = fs.readFileSync('./template.html').toString();

  out = out.replace('#NAV#', navigation);
  out = out.replace('#SECTIONS#', page);

  res.type('html').send(out);

});


app.listen(2255, function () {
  console.log('Example app listening on port 2255!')
});


var marked = require('marked');
var renderer = new marked.Renderer({
  plugins: {
    alert(params, block) {
      block = marked(block, {plugins: true, renderer: renderer});
      return `<div class="alert alert-${params}" role="alert">${block}</div>`;
    }
  },
});

renderer.table = function(header, body) {
  return '<table class="table">\n'
         + '<thead>\n'
         + header
         + '</thead>\n'
         + '<tbody>\n'
         + body
         + '</tbody>\n'
         + '</table>\n';
};
renderer.code = function(code, lang, escaped) {


  var out = require('highlight.js').highlightAuto(code).value;
  if (out != null && out !== code) {
    escaped = true;
    code = out;
  }


  if (!lang) {
    return '<pre><code>'
           + (escaped ? code : escape(code, true))
           + '\n</code></pre>';
  }

  return '<pre class="line-numbers"><code class="'
         + this.options.langPrefix
         + escape(lang, true)
         + '">'
         + (escaped ? code : escape(code, true))
         + '\n</code></pre>\n';

};
renderer.link = function(href, title, text) {
  if (href[0] === '!') {
    href = '/' + href.substr(1);
  }

  var match = navTree[href] || navTree[href.replace(/_/g, ' ')];
  if (match) {
    href = '#section' + match;
  }

  var out = '<a href="' + href + '"';
  if (title) {
    out += ' title="' + title + '"';
  }
  out += '>' + text + '</a>';
  return out;
};
renderer.heading = function(text, level, raw) {
  return '<h'
         + (parseInt(level, 10) + 1)
         + ' id="'
         + raw.toLowerCase().replace(/[^\w]+/g, '-')
         + '">'
         + text
         + '</h'
         + (parseInt(level, 10) + 1)
         + '>\n';
};

//


function grabPath(path) {
  //console.log('grabPath: ' + path);

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


var data = require('./output.json');
var md5 = require('md5');


function buildPages(data, depth, parent) {
  var ret = '';

  data.forEach(function(d, i) {
    if (d.path === 'index.md') {
      var id = md5(d.fullPath.replace('/index.md', ''));
      var name = fixName(parent.path);

      ret += '<section id="section' + id + '">';
      ret += '<h' + depth + ' id="' + name + '"><a href="#' + name + '">' + name + '</a></h' + depth + '>';
      ret += marked(d.data, {plugins: true, renderer: renderer });
      ret += '</section>';
    }
  });

  data.forEach(function(d, i) {
    if (d.data && d.path != 'index.md') {
      if (d.path[0] == '_') return;

      var id = md5(d.fullPath);

      var name = fixName(d.path);

      ret += '<section id="section' + id + '">';
      ret += '<h' + depth + ' id="' + name + '"><a href="#' + name + '">' + name + '</a></h' + depth + '>';
      ret += marked(d.data, {plugins: true, renderer: renderer });
      ret += '</section>';
    }

    if (d.folder) {
      ret += buildPages(d.folder, depth + 1, d);
    }
  });

  return ret;
}

var navigation = getNavigation(data, 1, '');
var page = buildPages(data, 0);




function getNavigation(data, depth, prefix) {

  var nav = '';
  data.forEach(function(file, i) {
    var id = md5(file.fullPath);
    var name =  fixName(file.path);
    navTree[prefix + '/' + name] = id;

    if (file.folder) {
      nav += '<li><a href="#section' + id + '">' + name + '</a>';

      if (file.folder.length > 1) {
        nav += '<ul>' + getNavigation(file.folder, depth + 1, prefix + '/' + name) + '</ul>';
      }

      nav += '</li>';
    } else {
      if (depth > 1 && file.path !== 'index.md') {
        nav += '<li><a href="#section' + id + '">' + name + '</a></li>';
      }
    }
  });

  return nav;
}





function fixName(pre) {

  if (pre.indexOf('.md') > -1) {
    pre = pre.substr(0, pre.indexOf('.md'));
  }

  if (/^\d+_/.test(pre)) {
    pre = pre.substr(3);
  }

  pre = pre.replace(/_/g, ' ');

  return pre;
}



/*
grabPath('docs/md')
  .then(function(data) {
    console.log(JSON.stringify(data));
  })
*/