const express = require('express');
const sharp = require('sharp');
const server = express();
const request = require('request')


server.get('/', (req, res) => {
  // Extract the query-parameter
  let {width, height} = req.query;

  // Parse to integer if possible
  if (width) {
    width = parseInt(width);
  }

  if (height) {
    height = parseInt(height);
  }

  // Set the content-type of the response
  // res.type(`image/${format || 'png'}`); // `image/${format || 'png'}`


  let transform = sharp();

  if (width || height) {
    transform = transform.resize(width, height);
  }

  // readStream.pipe(transform).pipe(res);
  // request.get('https://images-na.ssl-images-amazon.com/images/M/MV5BMTUyMjM2NTgwNl5BMl5BanBnXkFtZTgwMTUzOTUwMjI@._V1_SX1777_CR0,0,1777,999_AL_.jpg')
  request.get('http://192.168.1.25:9000/abc.jpg')
    .pipe(transform)
    .pipe(res);
});

server.listen(8000, () => {
  console.log('Server started!');
});
