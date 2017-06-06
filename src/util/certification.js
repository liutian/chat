const userModel = require('mongoose').model('user');
const crypto = require('crypto');

const config = require('../config');
const appService = require('../service/app-service');
const redisConn = require('../util/redis-factory').getInstance(true);
const apiError = require('./api-error');

//第三方服务器接口访问校验
exports.server = async function serverCert(ctx, next) {
  let appKey = ctx.get('AppKey');
  let nonce = ctx.get('Nonce');
  let timestamp = ctx.get('Timestamp');
  let signature = ctx.get('Signature');
  if (!appKey || !nonce || !timestamp || !signature) {
    ctx.throw(401, { code: 1001 });
  }

  let timeDiff = Date.now() - timestamp;
  //时间戳
  if (timeDiff > config.server_timestamp_expiry * 60 * 60 * 1000) {
    ctx.throw(401, { code: 1002 });
  }

  //**************************************************
  //**********后续改进，直接从缓存中读取，通过redis广播订阅机制保持同步更新
  let app = await appService.get(appKey);
  if (!app) {
    ctx.throw(401, { code: 1003 });
  } else if (app.lock == 1) {
    ctx.throw(401, { code: 1004 });
  } else if (app.del == 1) {
    ctx.throw(401, { code: 1005 });
  }

  let data = app.secret + nonce + timestamp;
  let sign = crypto.createHash('sha1').update(data).digest('hex');

  if (sign != signature) {
    ctx.throw(401, { code: 1006 });
  }

  await next();
}

//客户端接口访问校验
exports.client = async function clientCert(ctx, next) {
  //该Token由第三方服务器通过接口请求后返回给客户端
  //客户端携带该字段进行接口访问
  //服务器会在没有session或者session失效后提前该字段进行权限校验
  //该字段必须不能为空，给负载均衡提供hash值
  let refKey = ctx.get('RefKey');
  let token = ctx.get('Token');
  let appId = ctx.get('AppId');
  if (!refKey || !token || !appId) {
    ctx.throw(401, { code: 1007 });
  }

  if (!ctx.session.user || (ctx.session.user.refKey != refKey || ctx.session.user.appId != appId)) {

    //判断app是否有效
    let app = await appService.get(appId);
    if (!app) apiError.throw('appId invalid');
    if (app.lock == 1) apiError.throw(1018);
    if (app.del == 1) apiError.throw(1019);

    let user = await userModel.findOne({
      refKey: refKey,
      appId: appId,
      token: token
    }, 'appId refKey tokenExpiry');
    if (!user) {
      ctx.throw(401, { code: 1010 });
    } else if (user.tokenExpiry && Date.now() > user.tokenExpiry) {
      ctx.throw(401, { code: 1025 });
    } else if (user.lock == 1) {
      ctx.throw(401, { code: 1011 });
    } else if (user.del == 1) {
      ctx.throw(401, { code: 1012 });
    }

    ctx.session.user = user.obj;
  }


  await next();
}

//平台管理接口访问校验
exports.platform = async function platformCert(ctx, next) {
  let adminKey = ctx.get('AdminKey');
  let nonce = ctx.get('Nonce');
  let timestamp = ctx.get('Timestamp');
  let signature = ctx.get('Signature');
  if (!adminKey || !nonce || !timestamp || !signature) {
    ctx.throw(401, { code: 1001 });
  }
  if (adminKey !== config.platform_username) {
    ctx.throw(401, { code: 1003 });
  }

  let timeDiff = Date.now() - timestamp;
  if (timeDiff > config.server_timestamp_expiry * 60 * 60 * 1000) {
    ctx.throw(401, { code: 1002 });
  }

  let data = config.platform_password + nonce + timestamp;
  let sign = crypto.createHash('sha1').update(data).digest('hex');

  if (sign != signature) {
    ctx.throw(401, { code: 1006 });
  }

  await next();
}
