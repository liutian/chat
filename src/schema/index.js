const fs = require('fs');
const mongoose = require('mongoose');

const logger = require('log4js').getLogger('schema-index');

const config = require('../config');

mongoose.plugin(function (schema, options) {
  schema.pre('save', updateDate);
  schema.pre('update', updateDate);
  schema.pre('findOneAndUpdate', updateDate);
});

//替换mongoose默认的Promise实现
mongoose.Promise = global.Promise;
let mongo_url = config.mongo_address;
if (Array.isArray(mongo_url)) {
  mongo_url = mongo_url.join(',');
}

//连接数据库
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

function updateDate(next) {
  this.updateDate = new Date;
  next();
}
