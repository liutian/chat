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


/*---------------------------------------- 分割线 ------------------------------------------------*/

async function createUserFn(data) {
  data = _util.pick(data || {}, userModel.schema.obj);

  if (!data.refKey) apiError.throw('refKey cannot be empty');
  if (!data.nickname) apiError.throw('nickname cannot be empty');
  if (!data.appId) apiError.throw('appId cannot be appId');

  let userCount = await userModel.count({ refKey: data.refKey, appId: data.appId });

  if (userCount > 0) apiError.throw('user already exists');
  data.letterNickname = letter(data.nickname)[0];

  let result = await userModel.create(data);

  return result;
}

async function updateUserFn(data) {
  data = _util.pick(data || {}, 'id appId refKey nickname avator sex del lock blackLList');

  if (!data.id || !data.appId) apiError.throw('id and appId cannot be empty');
  let userCount = await userModel.count({ id: data.id, appId: data.appId });
  if (userCount > 0) apiError.throw('user not exists ');

  await userModel.findByIdAndUpdate(data.id, data);

}


async function authFn(uid, appId) {
  if (!uid) {
    apiError.throw(1007);
  }

  let user = await userModel.findById(uid, 'appId sim refKey');

  if (!user) {
    apiError.throw('uid invalid', 401);
  } else if (user.appId.toString() !== appId) {
    apiError.throw(1013, 401);
  } else if (user.lock === 1) {
    apiError.throw(1011, 401);
  } else if (user.del === 1) {
    apiError.throw(1012, 401);
  }

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

  if (!token) {
    apiError.throw(1008, 429);
  }

  let tokenKey = config.redis_client_token_prefix + token;
  let userObj = {
    id: user.id,
    appKey: user.appId,
    refKey: user.refKey
  }
  //token有效期为60秒，同时一个token仅提供一次授权登录
  await redisConn.multi().set(tokenKey, JSON.stringify(userObj)).expire(tokenKey, 60).exec();

  return { token: token };
}

