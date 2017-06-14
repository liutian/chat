const config = require('../config');
const appServer = require('../service/app-service');


module.exports = function (router) {

  /**
   * @api {post} /platform-api/app 创建App[平台]
   * @apiName create App[admin]
   * @apiGroup app
   *
   * @apiUse platform_auth
   *
   * @apiParam {String} name 名称
   * @apiParam {String} [des] 描述
   * @apiParam {Number} [maxSessionCount] 每个用户拥有会话最大数(拥有会话指：用户属于会话的超级管理员，该会话的owner等于该用户的refkey)
   * @apiParam {Number} [maxMemberCount] 每个会话拥有的成员最大数
   * @apiParam {String} [pushAuth] 推送服务器认证信息
   * @apiParam {String} [pushApnsName] 推送消息的apnsName 详情见推送服务器接口文档说明
   *
   * @apiSampleRequest /platform-api/app
   *
   * @apiSuccess {String} id app唯一标示
   * @apiSuccess {String} secret 认证秘钥
   * @apiSuccess {String} simUser app系统模拟用户refKey，每一个app都有一个对应的模拟用户，用来给其他用户发送系统通知消息
   * @apiSuccess {String} name app名称，全平台唯一
   * @apiSuccess {String} des app描述
   * @apiSuccess {Number} [maxSessionCount] 每个用户拥有会话最大数(拥有会话指：用户属于会话的超级管理员，该会话的owner等于该用户的refkey)
   * @apiSuccess {Number} [maxMemberCount] 每个会话拥有的成员最大数
   * @apiSuccess {String} [pushAuth] 推送服务器认证信息
   * @apiSuccess {String} [pushApnsName] 推送消息的apnsName 详情见推送服务器接口文档说明
   * @apiSuccess {Number} del 是否删除，使用该字段需要特别小心，如果标记为删除状态，系统会在必要时候进行物理删除，以后永远都无法找回
   * @apiSuccess {Number} lock 是否锁定，被锁定后该app下的所有用户都不能进行任何操作
   *
   */

  /**
   * @api {post} /platform-api/app 更新App[平台]
   * @apiName update App[admin]
   * @apiGroup app
   *
   * @apiUse platform_auth
   *
   * @apiParam {String} id app唯一标示
   * @apiParam {String} [des] 描述
   * @apiParam {Number} [maxSessionCount] 每个用户拥有会话最大数(拥有会话指：用户属于会话的超级管理员，该会话的owner等于该用户的refkey)
   * @apiParam {Number} [maxMemberCount] 每个会话拥有的成员最大数
   * @apiParam {String} [pushAuth] 推送服务器认证信息
   * @apiParam {String} [pushApnsName] 推送消息的apnsName 详情见推送服务器接口文档说明
   * @apiParam {Number} [del] 是否删除
   * @apiParam {Number} [lock] 是否锁定
   *
   * @apiSampleRequest /platform-api/app
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
   * @apiSampleRequest /server-api/app
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
