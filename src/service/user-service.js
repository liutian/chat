const mongoose = require('mongoose');
const logger = require('log4js').getLogger('user-service');

const redisConn = require('../util/redis-factory').getInstance(true);
const config = require('../config');
const util = require('../util/util');
const apiError = require('../util/api-error');
const letter = require('../util/letter');
const _util = require('../util/util');

const userModel = mongoose.model('user');


exports.createUser = createUserFn;
exports.updateUser = updateUserFn;
exports.auth = authFn;
exports.get = getFn;


/*---------------------------------------- 分割线 ------------------------------------------------*/

async function createUserFn(data) {
  data = _util.pick(data || {}, userModel.schema.obj);
  //基本数据校验
  if (!data.refKey) apiError.throw('refKey cannot be empty');
  if (!data.nickname) apiError.throw('nickname cannot be empty');
  if (!data.appId) apiError.throw('appId cannot be appId');
  //判断用户唯一
  let userCount = await userModel.count({ refKey: data.refKey, appId: data.appId });
  if (userCount > 0) apiError.throw('user already exists');
  //存储数据
  data.letterNickname = letter(data.nickname)[0];
  let result = await userModel.create(data);

  return result;
}

async function updateUserFn(data) {
  data = _util.pick(data || {}, 'id appId refKey nickname avator sex del lock blackLList');
  //基本数据校验
  if (!data.id || !data.appId) apiError.throw('id and appId cannot be empty');
  //校验用户是否存在
  let userCount = await userModel.count({ id: data.id, appId: data.appId });
  if (userCount > 0) apiError.throw('user not exists ');

  //更新数据到数据库
  let user = await userModel.findByIdAndUpdate(data.id, data, { 'new': true });

  await syncUserToRedis(user);
}


async function authFn(uid, appId) {
  if (!uid) apiError.throw(1007);
  //该出不读缓存，防止缓存数据有误造成不必要的后果
  let user = await userModel.findById(uid, 'appId sim refKey');
  //用户信息校验
  if (!user) {
    apiError.throw('uid invalid', 401);
  } else if (user.appId.toString() !== appId) {
    apiError.throw(1013, 401);
  } else if (user.lock === 1) {
    apiError.throw(1011, 401);
  } else if (user.del === 1) {
    apiError.throw(1012, 401);
  }

  //生成token
  let token;
  for (let i = 0; i < 5; i++) {
    try {
      token = await _util.random();
      let isExists = await redisConn.exists(config.redis_client_token_prefix + token);
      if (!isExists) {
        break;
      }
    } catch (e) {
      logger.warn('client auth error: ' + e);
    }
  }
  //如果多次无法生成token则直接报错
  if (!token) apiError.throw(1008, 429);

  //保存token信息到缓存中
  let tokenKey = config.redis_client_token_prefix + token;
  let userObj = {
    id: user.id,
    appId: user.appId.toString(),
    refKey: user.refKey
  }
  //token有效期为60秒，同时一个token仅提供一次授权登录
  await redisConn.multi().set(tokenKey, JSON.stringify(userObj)).expire(tokenKey, 60).exec();

  return { token: token };
}


async function getFn(id) {
  let user = await redisConn.hgetall(config.redis_user_prefix + id);
  if (!user || !user.id || user.id != id) {
    user = await userModel.findById(id, '-blackLList -extra');
    if (user) {
      user = user.toObject();
      user.id = user._id;
      await syncUserToRedis(user);
    } else {
      return null;
    }
  }

  return user;
}

async function syncUserToRedis(user) {
  let pickList = 'id appId sim refKey nickname letterNickname avator sex location del lock';
  user = _util.pick(user, pickList);
  await redisConn.hmset(config.redis_user_prefix + user.id, user);
}
