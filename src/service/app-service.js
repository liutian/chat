const mongoose = require('mongoose');
const util = require('util');

const redisConn = require('../util/redis-factory').getInstance(true);
const config = require('../config');
const apiError = require('../util/api-error');
const userService = require('./user-service');
const _util = require('../util/util');


const appModel = mongoose.model('app');
const userModel = mongoose.model('user');

exports.get = getFn;
exports.createApp = createAppFn;
exports.updateApp = updateAppFn;

/*---------------------------------------- 分割线 ------------------------------------------------*/

async function createAppFn(data) {
  data = _util.pick(data || {}, appModel.schema.obj);
  if (!data.name) apiError.throw('name cannot be empty');

  let appCount = await appModel.count({ name: data.name });
  if (appCount > 0) apiError.throw('app already exists');
  data.secret = await _util.random();
  let newApp = await appModel.create(data);

  let newUserData = {
    appId: newApp.id,
    sim: 1,
    refKey: 'sim-user-' + newApp.id,
    nickname: '模拟用户'
  }

  let newUser = await userService.createUser(newUserData);

  newApp.simUser = newUser;
  await newApp.save();

  await syncAppToRedis(newApp.toObject());

  return newApp;
}

async function updateAppFn(data) {
  data = _util.pick(data || {}, 'id des maxSessionCount maxMemberCount lock del');

  if (!data.id) apiError.throw('id cannot be empty');

  await appModel.findByIdAndUpdate(data.id, data);

  await syncAppToRedis(data);
}

async function syncAppToRedis(app) {
  if (util.isObject(app.simUser) && app.simUser.id) {
    app.simUser = app.simUser.id;
  }
  await redisConn.hmset(config.redis_app_prefix + app.id, app);
}

async function getFn(id) {
  let app = await redisConn.hgetall(config.redis_app_prefix + id);
  if (!app || !app.id || app.id != id) {
    app = await appModel.findById(id);
    if (app) {
      await syncAppToRedis(app.toObject());
    } else {
      return null;
    }
  }

  return app;
}


