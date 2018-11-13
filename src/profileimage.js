const config = require('config.json')('./config.json');
const express = require('express');
const path = require('path');
const needle = require('needle');
const uri_normalize = require('./uri_normalize');
const chainLib = require('@whaleshares/wlsjs');
const sharp = require('sharp');

chainLib.api.setOptions({url: 'https://rpc.whaleshares.io'});
chainLib.config.set('address_prefix', 'WLS');
chainLib.config.set('chain_id', 'de999ada2ff7ed3d3d580381f229b40b5a0261aec48eb830e540080817b72866');

const accepted_content_types = [ 'image/gif', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

let router = express.Router();

const get_image_url = async (accountname) => {
  let url = null;

  try {
    let accs = await chainLib.api.getAccountsAsync([accountname]);

    if (accs.length > 0) {
      let acc = accs[0];
      let json_metadata = acc.json_metadata;
      let md = JSON.parse(json_metadata);

      if (md.profile.profile_image) {
        url = md.profile.profile_image;
      }

      // console.log("url=" + url);
      if ((typeof url === 'undefined') || (url === null)) {
        url = null;
      }
    }
  } catch (e) {
    // console.log(e.message);
    url = null;
  }

  return url;
};

request_remote_image = (url) => {
  console.log(`url: ${url}`);

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


router.get('/:accountname/:size?', async function (req, res) {
  try {
    let img_size = 64; // default is 64
    const {accountname, size} = req.params;

    let isValidUsername = chainLib.utils.validateAccountName(accountname);
    if (isValidUsername) {
      throw new Error(isValidUsername);
    }

    let url = await get_image_url(accountname);

    if ((typeof url === 'undefined') || (url === null)) {
      throw new Error(`no profile image for ${accountname}`);
    }

    url = uri_normalize(url);
    if (!url) {
      throw new Error("invalid url");
    }

    const img_res = await request_remote_image(url);
    if (img_res.statusCode !== 200) {
      throw new Error(`error on remote response (${img_res.statusCode})`);
    }

    const content_length = img_res.headers['content-length'];
    if (content_length > config.max_size) {
      throw new Error(`Resource size exceeds limit (${content_length})`);
    }

    let img = img_res.body;

    if (size === "32x32") {
      img_size = 32;
    } else if (size === "48x48") {
      img_size = 48;
    } else if (size === "64x64") {
      img_size = 64;
    } else if (size === "96x96") {
      img_size = 96;
    } else if (size === "128x128") {
      img_size = 128;
    }

    img = await sharp(img, {failOnError: true})
      .resize(img_size, img_size)
      .toBuffer();

    const content_type = img_res.headers["content-type"];
    if (!accepted_content_types.includes(content_type)) {
      throw new Error(`Unsupported content-type (${content_type})`);
    }

    res.set('content-type', content_type);
    res.set('Cache-Control', 'public,max-age=86400,immutable');

    res.end(img, 'binary');
  } catch (e) {
    console.log(e.message);

    res.set('content-type', 'image/png');
    res.set('Cache-Control', 'public,max-age=600,immutable'); // cache 10 min
    res.sendFile('user.png', { root: path.join(__dirname, '../assets') });
  }
});



module.exports = router;
