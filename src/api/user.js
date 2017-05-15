const logger = require('log4js').getLogger('api-user');
const mongoose = require('mongoose');

const userService = require('../service/user-service');

module.exports = function (router) {
  router.get('/server-api/user/auth', auth);

  router.post('/server-api/user', saveUser);
}

async function saveUser(ctx, next) {
  let id = ctx.request.body.id;
  if (id) {
    ctx.request.body.appId = ctx.get('AppKey');
    await userService.updateUser(ctx.request.body);
    ctx.body = {};
  } else {
    ctx.request.body.appId = ctx.get('AppKey');
    let result = await userService.createUser(ctx.request.body);
    ctx.body = { id: result.id };
  }
}

async function auth(ctx, next) {
  let uid = ctx.request.query.uid;
  let appId = ctx.get('AppKey');
  let result = await userService.auth(uid, appId);
  ctx.body = result;
}
