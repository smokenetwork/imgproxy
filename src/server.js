const config = require('config.json')('./config.json');
const express = require('express');
const path = require('path');
const sharp = require('sharp');
const app = express();
const request = require('request');
const uri_normalize = require('./uri_normalize');

let router = express.Router();

client_error_handler = (err, req, res, next) => {
  if (req.xhr) {
    res.status(500).send({ error: 'Something failed!' })
  } else {
    next(err)
  }
};

error_handler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err)
  }
  res.set('content-type', 'image/png');
  res.set('Cache-Control', 'public,max-age=600,immutable'); // cache 10 min
  res.sendFile('error.png', { root: path.join(__dirname, '../assets') });

  // console.error(err.stack)
  // res.status(500).send('Something broke!');
};

// router.get('/:width(\\d+)x:height(\\d+)/:url(.*)', proxyHandler)
router.get('/:width(\\d+)x:height(\\d+)/*?', (req, res, next) => {
  let {width, height} = req.params;
  let url = req.params[0];

  if (width) {
    width = parseInt(width);
    if (width === 0) {
      width = null;
    }
    if (width > 1024) {
      width = 1024;
    }
  }

  if (height) {
    height = parseInt(height);
    if (height === 0) {
      height = null;
    }
    if (height > 2048) {
      height = 2048;
    }
  }

  let transform = sharp();
  transform.on('error', function(err) {
    next(err);
  });

  if (width || height) {
    transform = transform.resize(width, height);
  }

  url = uri_normalize(url);
  if (!url) {
    throw new Error("invalid url");
  }

  // readStream.pipe(transform).pipe(res);
  request.get(url)
    .on('error', function(err) {
      next(err);
    })
    .on('response', function(url_res) {
      const size = url_res.headers['content-length'];
      if (size > config.max_size) {
        console.log('Resource size exceeds limit (' + size + ')');
        next(new Error('Resource size exceeds limit (' + size + ')'));
      }

      //////////
      const content_type = url_res.headers["content-type"];
      const accepted_content_types = [ 'image/gif', 'image/jpeg', 'image/png', 'image/webp'];
      if (!accepted_content_types.includes(content_type)) {
        next(new Error("Unsupported content-type"));
      }
      res.set('content-type', content_type);
      res.set('Cache-Control', 'public,max-age=29030400,immutable');
    })
    .pipe(transform)
    .pipe(res);
});

app.use('/', router);
app.use(client_error_handler);
app.use(error_handler); // define error-handling middleware last, after other app.use() and routes calls
app.listen(8000, () => {
  console.log('Server started!');
});
