//提供性能
//global.Promise = require('bluebird');

const fs = require('fs');
const Koa = require('koa');
const Router = require('koa-router');
const session = require('koa-session');
const koaBody = require('koa-body')({ multipart: true });
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

//跨域请求处理
app.use(cors);

// 客户端接口认证
const sessionMiddleware = session({
  key: (config.session_keys || 'ichat-session-mko09ijn'),
  maxAge: config.cookie_session_expiry * 1000 * 60
}, app);

router.all('/api/*', corsFilter, sessionMiddleware, cert.client, koaBody);

// 第三方服务器认证
router.all('/server-api/*', corsFilter, cert.server, koaBody);

// 平台接口认证
router.all('/platform-api/*', corsFilter, cert.platform, koaBody);

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

async function cors(ctx, next) {

  await next();

  //只需要检查options类型的请求，因为系统所有接口的Content-Type都为application/json，所有浏览器肯定会先发送预检请求
  ctx.set('Access-Control-Allow-Origin', ctx.get('Origin'));
  ctx.set('Access-Control-Allow-Credentials', true);
  if (ctx.method == 'OPTIONS') {
    ctx.set('Access-Control-Allow-Methods', 'GET, POST');
    ctx.set('Access-Control-Allow-Headers', 'Content-Type, AdminKey, Nonce, Timestamp, Signature, AppKey, Token, AppId, RefKey');
    ctx.set('Access-Control-Max-Age', 2592000);//有效期30天
  }
}

async function corsFilter(ctx, next) {
  if (ctx.method == 'OPTIONS') {
    ctx.body = '';
  } else {
    await next();
  }
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

    if (err.name == 'ValidationError') {
      let message = '';
      Object.keys(err.errors).forEach(function (key) {
        message += err.errors[key].message;
      });
      err.message = message;
    } else {
      err.message = '{"code": 1015,"msg": "' + (err.message || 'db error') + '"}';
    }
  }

  //如果服务器报错打印错误信息到日志中
  if (!err.status || err.status == 500) {
    logger.error(err.stack || err.toString());
    err.expose = true;
    err.message = '{"code": 9999,"msg": "' + (err.message || 'server error') + '"}';
  }
}
