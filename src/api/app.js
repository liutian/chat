const config = require('../config');
const appServer = require('../service/app-service');


module.exports = function (router) {

  router.post('/platform-api/app', platformSave);

  router.post('/server-api/app', update);
}

//********************************************************* */

async function platformSave(ctx, next) {
  let id = ctx.request.body.id;
  if (id) {
    await appServer.updateApp(ctx.request.body);
    ctx.body = {};
  } else {
    ctx.body = await appServer.createApp(ctx.request.body);
  }
}

async function update(ctx, next) {
  ctx.request.body.id = ctx.get('AppKey');
  await appServer.updateApp(ctx.request.body);
  ctx.body = {};
}
