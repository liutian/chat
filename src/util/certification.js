const crypto = require('crypto');

const config = require('../config');
const appService = require('../service/app-service');
const redisConn = require('../util/redis-factory').getInstance(true);

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
  //时间戳不能超过30分钟
  if (timeDiff > 30 * 60 * 1000) {
    ctx.throw(401, { code: 1002 });
  }

  //**************************************************
  //**********后续改进，直接从缓存中读取，通过redis广播订阅机制保持同步更新
  let app = await appService.get(appKey);
  if (!app) {
    ctx.throw(401, { code: 1003 });
  } else if (+app.lock === 1) {
    ctx.throw(401, { code: 1004 });
  } else if (+app.del === 1) {
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
  if (!ctx.get('Token')) {
    ctx.throw(401, { code: 1009 });
  }

  if (!ctx.session || !ctx.session.user) {

    let user = await redisConn.get(config.redis_client_token_prefix + ctx.get('Token'));
    if (!user) {
      ctx.throw(401, { code: 1010 });
    }
    // else {
    //   await redisConn.del(config.redis_client_token_prefix + ctx.get('Token'));
    // }

    ctx.session.user = JSON.parse(user);
  }

  //判断app是否有效
  let app = await appService.get(ctx.session.user.appId);
  if (app.lock == 1) apiError.throw(1018);
  if (app.del == 1) apiError.throw(1019);


  await next();
}

//平台管理接口访问校验
exports.platform = async function platformCert(ctx, next) {
  let appKey = ctx.get('AppKey');
  let nonce = ctx.get('Nonce');
  let timestamp = ctx.get('Timestamp');
  let signature = ctx.get('Signature');
  if (!appKey || !nonce || !timestamp || !signature) {
    ctx.throw(401, { code: 1001 });
  }
  if (appKey !== config.platform_username) {
    ctx.throw(401, { code: 1003 });
  }

  let timeDiff = Date.now() - timestamp;
  if (timeDiff > 30 * 60 * 1000) {
    ctx.throw(401, { code: 1002 });
  }

  let data = config.platform_password + nonce + timestamp;
  let sign = crypto.createHash('sha1').update(data).digest('hex');

  if (sign != signature) {
    ctx.throw(401, { code: 1006 });
  }

  await next();
}
