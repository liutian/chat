const config = require('../config');
const appServer = require('../service/app-service');


module.exports = function (router) {

  /**
   * @api {post} /platform-api/app 创建App[平台管理员]
   * @apiName create App[admin]
   * @apiGroup app
   *
   * @apiUse platform_auth
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
   * @apiSuccess {String} simUser app模拟用户id
   * @apiSuccess {String} name app名称，全平台唯一
   * @apiSuccess {String} des app描述
   * @apiSuccess {Number} [maxSessionCount] 每个用户拥有的会话最大数(拥有指用户属于会话的超级管理员)
   * @apiSuccess {Number} [maxMemberCount] 每个会话拥有的成员最大数
   * @apiSuccess {String} [pushAuth] 推送服务器认证信息
   * @apiSuccess {String} [pushApnsName] 推送消息的apnsName 详情见推送服务器接口文档说明
   * @apiSuccess {Number} [del] 是否删除
   * @apiSuccess {Number} [lock] 是否锁定
   *
   */

  /**
   * @api {post} /platform-api/app 更新App[平台管理员]
   * @apiName update App[admin]
   * @apiGroup app
   *
   * @apiUse platform_auth
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
   * @apiSuccess {Object} result 请求返回参数，参考创建app接口
   *
   */
  router.post('/platform-api/app', platformSave);


  /**
   * @api {post} /server-api/app 更新App[第三方服务器]
   * @apiName update App
   * @apiGroup app
   *
   * @apiUse server_auth
   *
   * @apiParam {String} [des] 描述
   * @apiParam {Number} [maxSessionCount] 每个用户拥有的会话最大数(拥有指用户属于会话的超级管理员)
   * @apiParam {Number} [maxMemberCount] 每个会话拥有的成员最大数
   * @apiParam {String} [pushAuth] 推送服务器认证信息
   * @apiParam {String} [pushApnsName] 推送消息的apnsName 详情见推送服务器接口文档说明
   * @apiParam {Number} [del] 是否删除
   * @apiParam {Number} [lock] 是否锁定
   *
   * @apiSuccess {Object} result 请求返回参数，参考创建app接口
   */
  router.post('/server-api/app', serverUpdate);
}

//********************************************************* */

async function platformSave(ctx, next) {
  let id = ctx.request.body.id;
  if (id) {
    ctx.body = await appServer.updateApp(ctx.request.body);
  } else {
    ctx.body = await appServer.createApp(ctx.request.body);
  }
}

async function serverUpdate(ctx, next) {
  ctx.request.body.id = ctx.get('AppKey');
  ctx.body = await appServer.updateApp(ctx.request.body);
}
