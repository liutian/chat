const fs = require('fs');
const mongoose = require('mongoose');
const util = require('util');

const _util = require('../util/util');
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
  schema.virtual('obj').get(function () {
    let obj = this.toObject();
    Object.keys(obj).forEach(function (key) {
      if (obj[key] instanceof mongoose.Types.ObjectId) {
        obj[key] = obj[key].toString();
      }
    })
    obj.id = obj._id;
    delete obj._id;
    delete obj.__v;
    if (util.isDate(this.createdAt)) {
      obj.createdAt = _util.formatDate(this.createdAt);
    }
    if (util.isDate(this.updatedAt)) {
      obj.updatedAt = _util.formatDate(this.updatedAt);
    }
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
  useMongoClient: true,
  poolSize: config.mongo_pool,
  keepAlive: 100,
  promiseLibrary: global.Promise
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

