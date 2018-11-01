const config = require('config.json')('./config.json');
const express = require('express');
const path = require('path');
const sharp = require('sharp');
const app = express();
const needle = require('needle');
const uri_normalize = require('./uri_normalize');

let router = express.Router();

request_remote_image = (url) => {
  const options = {
    open_timeout: 15 * 1000,
    response_timeout: 45 * 1000,
    read_timeout: 60 * 1000,
    compressed: true,
    parse_response: false,
    // follow_max: 5,
  };

  return new Promise((resolve, reject) => {
    needle.get(url, options, (error, response) => {
      if (error) {
        reject(error)
      } else {
        resolve(response)
      }
    })
  })
};

router.get('/:width(\\d+)x:height(\\d+)/*?', async (req, res, next) => {
  try {
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


    url = uri_normalize(url);
    if (!url) {
      throw new Error("invalid url");
    }

    const img_res = await request_remote_image(url);
    if (img_res.statusCode !== 200) {
      throw new Error(`error on remote response (${img_res.statusCode})`);
    }

    const size = img_res.headers['content-length'];
    if (size > config.max_size) {
      throw new Error(`Resource size exceeds limit (${size})`);
    }

    let img = img_res.body;

    if (width || height) {
      img = await sharp(img).resize(width, height).toBuffer();
    }

    //////////
    const content_type = img_res.headers["content-type"];
    const accepted_content_types = [ 'image/gif', 'image/jpeg', 'image/png', 'image/webp'];
    if (!accepted_content_types.includes(content_type)) {
      throw new Error("Unsupported content-type (${content_type})");
    }
    res.set('content-type', content_type);
    res.set('Cache-Control', 'public,max-age=29030400,immutable');

    res.end(img, 'binary');
  } catch (e) {
    console.log(e.message);

    res.set('content-type', 'image/png');
    res.set('Cache-Control', 'public,max-age=600,immutable'); // cache 10 min
    res.sendFile('error.png', { root: path.join(__dirname, '../assets') });
  }
});

app.use('/', router);
app.listen(8000, () => {
  console.log('Server started!');
});
