const mongoose = require('mongoose')
const redisConn = require('../util/redis-factory').getInstance(true);
const config = require('../config');

const appModel = mongoose.model('app');

exports.get = async function getApp(id) {
  let app = await redisConn.hgetall(config.redis_app_prefix + id);
  if (!app || !app.id || app.id != id) {
    app = await appModel.findById(id);
    if (app) {
      await redisConn.hmset(config.redis_app_prefix + id, app);
    } else {
      // await appModel.create({ secret: '232323', name: 'sss' });
      return null;
    }
  }

  return app;
}


