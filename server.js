const express = require('express');
const sharp = require('sharp');
const app = express();
const request = require('request');

let router = express.Router();


// router.get('/:width(\\d+)x:height(\\d+)/:url(.*)', proxyHandler)
router.get('/:width(\\d+)x:height(\\d+)/*?', (req, res) => {
  // throw new Error("BROKEN"); // Express will catch this on its own.

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

  // Set the content-type of the response
  // res.type(`image/${format || 'png'}`); // `image/${format || 'png'}`

  let transform = sharp();
  if (width || height) {
    transform = transform.resize(width, height);
  }

  // readStream.pipe(transform).pipe(res);
  request.get(url)
    .on('error', err => {
      res.status(500).send(err.message);
    })
    .pipe(transform)
    .on('error', err => {
      res.status(500).send(err.message);
    })
    .pipe(res);
});


app.use('/', router);
// define error-handling middleware last, after other app.use() and routes calls
app.use(function (err, req, res, next) {
  // console.error(err.stack)
  res.status(500).send('Something broke!');
});

app.listen(8000, () => {
  console.log('Server started!');
});
