const fs = require('fs');
const Koa = require('koa');
const Router = require('koa-router');
const session = require('koa-session');
const bodyParser = require('koa-bodyparser');
const mongoose = require('mongoose');
const util = require('util');

const config = require('../config');
const cert = require('../util/certification.js');
const logger = require('log4js').getLogger('api-index');
const apiError = require('../util/api-error');

const app = new Koa();
const router = new Router();

//替换koa默认的异常处理
app.on('error', onerror);

//cookie签名的key
app.keys = [(config.cookie_keys || 'ichat-cookie-zaq12wsx')];

//记录响应时间
app.use(responseTime);

// 客户端接口认证
const sessionMiddleware = session({
  key: (config.session_keys || 'ichat-session-mko09ijn'),
  maxAge: config.cookie_session_expiry * 1000 * 60
}, app);
router.all('/api/*', sessionMiddleware, cert.client, bodyParser());

// 第三方服务器认证
router.all('/server-api/*', cert.server, bodyParser());

// 平台接口认证
router.all('/platform-api/*', cert.platform, bodyParser());

// 加载所有接口
fs.readdirSync(__dirname).forEach(function (filename) {
  if (!/\.js$/.test(filename) || filename == 'index.js' || filename.indexOf('_') == 0) return;
  require('./' + filename)(router);
});

// 载入路由服务
app.use(router.routes());

app.listen(config.port, function (err) {
  console.warn('listen on port ' + config.port);
});


// *******************************************************************

async function responseTime(ctx, next) {
  let start = Date.now();
  await next();
  ctx.set('X-Response-Time', (Date.now() - start) + 'ms');
}

function onerror(err) {
  if (404 == err.status) return;

  if (util.isString(err.message) && !err.expose) {
    err.message = err.message.replace(/"/gmi, '\\"');
  }

  //如果有错误码追加错误码到错误信息中
  if (err.code) {
    err.message = '{"code": ' + err.code + ',"msg": "' + (apiError.codeMap['code_' + err.code] || err.message) + '"}';
  }

  if (err instanceof mongoose.Error) {
    err.expose = true;
    err.status = 400;

    err.message = '{"code": 1015,"msg": "' + (err.message || 'db error') + '"}';
  }

  //如果服务器报错打印错误信息到日志中
  if (!err.status || err.status == 500) {
    logger.error(err.stack || err.toString());
    err.expose = true;
    err.message = '{"code": 9999,"msg": "' + (err.message || 'server error') + '"}';
  }
}
