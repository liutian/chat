const logger = require('log4js').getLogger('api-user');
const mongoose = require('mongoose');

const userService = require('../service/user-service');

module.exports = function (router) {
  router.get('/server-api/user/auth', auth);

  router.post('/server-api/user', saveUser);

  router.post('/api/user', updateUser);

}

//********************************************************* */

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

async function updateUser(ctx, next) {
  ctx.request.body.id = ctx.session.user.id;
  ctx.request.body.appId = ctx.session.user.appId;
  await userService.updateUser(ctx.request.body);
  ctx.body = {};
}

async function auth(ctx, next) {
  let uid = ctx.request.query.uid;
  let appId = ctx.get('AppKey');
  let result = await userService.auth(uid, appId);
  ctx.body = result;
}
