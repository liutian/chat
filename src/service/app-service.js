const mongoose = require('mongoose');
const util = require('util');

const redisConn = require('../util/redis-factory').getInstance(true);
const config = require('../config');
const apiError = require('../util/api-error');
const userService = require('./user-service');
const _util = require('../util/util');
const letter = require('../util/letter');


const appModel = mongoose.model('app');
const userModel = mongoose.model('user');

//获取app信息尽量从缓存中获取
exports.get = getFn;

//创建app
exports.createApp = createAppFn;

//更新app
exports.updateApp = updateAppFn;

/*---------------------------------------- 分割线 ------------------------------------------------*/

async function createAppFn(data) {
  data = _util.pick(data || {}, appModel.schema.obj);
  //基本数据校验
  if (!data.name) apiError.throw('name cannot be empty');

  //校验数据是否唯一
  let appCount = await appModel.count({ name: data.name });
  if (appCount > 0) apiError.throw('app already exists');

  //生成数据
  data.secret = await _util.random(10);
  let newApp = await appModel.create(data);

  //生成对应的模拟用户
  let newSimUserData = {
    appId: newApp.id,
    sim: 1,
    refKey: 'simuser_' + (await _util.random(5)),
    nickname: '模拟用户'
  }
  newSimUserData.letterNickname = letter(newSimUserData.nickname)[0];
  await userModel.create(newSimUserData);

  //更新app的simUser
  newApp.simUser = newSimUserData.refKey;
  await newApp.save();

  return newApp.obj;
}

async function updateAppFn(data) {
  data = _util.pick(data || {}, 'id des maxSessionCount maxMemberCount lock del pushAuth pushApnsName');

  //基本数据校验
  if (!data.id) apiError.throw('id cannot be empty');

  //更新数据库
  let app = await appModel.findByIdAndUpdate(data.id, data, { runValidators: true, new: true });

  if (!app) apiError.throw('app cannot find');

  //同步缓存
  await syncAppToRedis(app.obj);

  return app.obj;
}

async function syncAppToRedis(app) {
  await redisConn.hmset(config.redis_app_prefix + app.id, app);
}

async function getFn(id) {
  let app = await redisConn.hgetall(config.redis_app_prefix + id);
  if (!app || !app.id || app.id != id) {
    app = await appModel.findById(id, '-extra');
    if (app) {
      await syncAppToRedis(app.obj);
    } else {
      return null;
    }
  }

  return app;
}


