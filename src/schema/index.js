const fs = require('fs');
const mongoose = require('mongoose');

const logger = require('log4js').getLogger('schema-index');

const config = require('../config');

/**
 *
   var thingSchema = new Schema({..}, { timestamps: { createdAt: 'created_at' } });
   var Thing = mongoose.model('Thing', thingSchema);
   var thing = new Thing();
   thing.save(); // `created_at` & `updatedAt` will be included
 */
mongoose.plugin(function (schema, options) {
  schema.pre('save', updateDate);
  schema.pre('update', updateDate);
  schema.pre('findOneAndUpdate', updateDate);
  schema.virtual('obj').get(function () {
    let obj = this.toObject();
    obj.id = obj._id;
    delete obj._id;
    delete obj.__v;
    return obj;
  });
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
