"use strict";

const md5      = require('md5');
const marked   = require('marked');

var navTree = {};
var renderer = new marked.Renderer({
  plugins: {

    alert(params, block) {
      block = marked(block, {plugins: true, renderer: renderer});
      return `<div class="alert alert-${params}" role="alert">${block}</div>`;
    },

    label(params) {
      params = params.split(', ');
      return `<span class="label label-${params[0]}">${params[1]}</span>`
    }
  },
});

renderer.table = function (header, body) {
  return '<table class="table">\n'
         + '<thead>\n'
         + header
         + '</thead>\n'
         + '<tbody>\n'
         + body
         + '</tbody>\n'
         + '</table>\n';
};

renderer.code    = function (code, lang, escaped) {
  var out = require('highlight.js')
    .highlightAuto(code).value;
  if (out != null && out !== code) {
    escaped = true;
    code    = out;
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

renderer.link    = function (href, title, text) {
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

renderer.heading = function (text, level, raw) {
  return '<h'
         + (parseInt(level, 10) + 1)
         + ' id="'
         + raw.toLowerCase()
           .replace(/[^\w]+/g, '-')
         + '">'
         + text
         + '</h'
         + (parseInt(level, 10) + 1)
         + '>\n';
};

function buildPages(data, depth, parent) {
  var ret = '';

  data.forEach(function (d, i) {
    if (d.path === 'index.md') {
      var id   = md5(d.fullPath.replace('/index.md', ''));
      var name = fixName(parent.path);

      ret += '<section id="section' + id + '">';
      ret += '<h' + depth + ' id="' + name + '"><a href="#' + name + '">' + name + '</a></h' + depth + '>';
      ret += marked(d.data, {plugins: true, renderer: renderer});
      ret += '</section>';
    }
  });

  data.forEach(function (d, i) {
    if (d.data && d.path != 'index.md') {
      if (d.path[0] == '_') return;

      var id = md5(d.fullPath);

      var name = fixName(d.path);

      ret += '<section id="section' + id + '">';
      ret += '<h' + depth + ' id="' + name + '"><a href="#' + name + '">' + name + '</a></h' + depth + '>';
      ret += marked(d.data, {plugins: true, renderer: renderer});
      ret += '</section>';
    }

    if (d.folder) {
      ret += buildPages(d.folder, depth + 1, d);
    }
  });

  return ret;
}

function getNavigation(data, depth, prefix) {

  var nav = '';
  data.forEach(function (file, i) {
    var id                       = md5(file.fullPath);
    var name                     = fixName(file.path);
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

function compile(md) {
  return marked(md, {plugins: true, renderer: renderer});
}

module.exports = {
  buildPages,
  getNavigation,
  compile,
  marked
};
