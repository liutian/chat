const config = require('../config');
const appServer = require('../service/app-service');


module.exports = function (router) {

  /**
   * @api {post} /platform-api/app 创建App[超级管理员]
   * @apiName create App[admin]
   * @apiGroup app
   *
   * @apiParam {String} name 名称
   * @apiParam {String} [des] 描述
   * @apiParam {Number} [maxSessionCount] 每个用户拥有的会话最大数(拥有指用户属于会话的超级管理员)
   * @apiParam {Number} [maxMemberCount] 每个会话拥有的成员最大数
   * @apiParam {String} [pushAuth] 推送服务器认证信息
   * @apiParam {String} [pushApnsName] 推送消息的apnsName 详情见推送服务器接口文档说明
   *
   * @apiSuccess {String} id app唯一标示
   * @apiSuccess {String} secret 认证秘钥
   *
   */

  /**
   * @api {post} /platform-api/app 更新App[超级管理员]
   * @apiName update App[admin]
   * @apiGroup app
   *
   * @apiParam {String} id app唯一标示
   * @apiParam {String} [des] 描述
   * @apiParam {Number} [maxSessionCount] 每个用户拥有的会话最大数(拥有指用户属于会话的超级管理员)
   * @apiParam {Number} [maxMemberCount] 每个会话拥有的成员最大数
   * @apiParam {String} [pushAuth] 推送服务器认证信息
   * @apiParam {String} [pushApnsName] 推送消息的apnsName 详情见推送服务器接口文档说明
   * @apiParam {Number} [del] 是否删除
   * @apiParam {Number} [lock] 是否锁定
   *
   *
   */
  router.post('/platform-api/app', platformSave);


  /**
   * @api {post} /server-api/app 更新App[第三方服务器]
   * @apiName update App
   * @apiGroup app
   *
   * @apiParam {String} [des] 描述
   * @apiParam {Number} [maxSessionCount] 每个用户拥有的会话最大数(拥有指用户属于会话的超级管理员)
   * @apiParam {Number} [maxMemberCount] 每个会话拥有的成员最大数
   * @apiParam {String} [pushAuth] 推送服务器认证信息
   * @apiParam {String} [pushApnsName] 推送消息的apnsName 详情见推送服务器接口文档说明
   * @apiParam {Number} [del] 是否删除
   * @apiParam {Number} [lock] 是否锁定
   *
   *
   */
  router.post('/server-api/app', serverUpdate);
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

async function serverUpdate(ctx, next) {
  ctx.request.body.id = ctx.get('AppKey');
  await appServer.updateApp(ctx.request.body);
  ctx.body = {};
}
