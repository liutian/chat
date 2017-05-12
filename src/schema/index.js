const fs = require('fs');
const mongoose = require('mongoose');

const logger = require('log4js').getLogger('schema-index');

const config = require('../config');

mongoose.Promise = global.Promise;
let mongo_url = config.mongo_address;
if (Array.isArray(mongo_url)) {
  mongo_url = mongo_url.join(',');
}

mongoose.connect(mongo_url, {
  server: {
    poolSize: config.mongo_pool,
    socketOptions: { keepAlive: 100 },
    promiseLibrary: global.Promise
  }
}, function (err) {
  if (err) {
    logger.error('mongo connection error', err);
  } else {
    logger.warn('mongo connection ready');
  }
});

//载入数据模型
fs.readdirSync(__dirname).forEach(function (filename) {
  if (!/\.js$/.test(filename) || filename == 'index.js') return;
  require('./' + filename);
});
