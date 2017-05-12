const crypto = require("crypto");
const logger = require('log4js').getLogger('api-user');
const mongoose = require('mongoose');

const config = require('../config');
const redisConn = require('../util/redis-factory').getInstance(true);
const UserModel = mongoose.model('user');

module.exports = function (router) {
  router.get('/server-api/user/auth', auth);
}

async function auth(ctx, next) {
  let uid = ctx.request.query.uid;
  if (!uid) {
    ctx.throw(400, { code: 1007 });
  }

  let user = await UserModel.findById(uid, 'appId sim refKey');

  if (!user) {
    ctx.throw(401, 'uid invalid');
  } else if (user.appId.toString() !== ctx.get('AppKey')) {
    ctx.throw(401, { code: 1013 });
  } else if (user.lock === 1) {
    ctx.throw(401, { code: 1011 });
  } else if (user.del === 1) {
    ctx.throw(401, { code: 1012 });
  }

  let token;
  for (let i = 0; i < 5; i++) {
    try {
      token = await random();
      let isExists = await redisConn.exists(config.redis_client_token_prefix + token);
      if (!isExists) {
        break;
      }
    } catch (e) {
      logger.warn('client auth error: ' + e);
    }
  }

  if (!token) {
    ctx.throw(429, { code: 10008 })
  }

  let tokenKey = config.redis_client_token_prefix + token;
  let userObj = {
    id: user.id,
    appKey: user.appId,
    refKey: user.refKey
  }
  //token有效期为60秒，同时一个token仅提供一次授权登录
  await redisConn.multi().set(tokenKey, JSON.stringify(userObj)).expire(tokenKey, 60).exec();

  ctx.body = { token: token };
}

function random() {
  return new Promise(function (resolve, reject) {

    crypto.randomBytes(10, function (err, buf) {
      if (err) {
        reject(err);
      } else {
        resolve(buf.toString('hex'));
      }
    });
  });
}
