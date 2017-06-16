const url = require('url');
const logger = require('log4js').getLogger('api-user');
const mongoose = require('mongoose');

const userService = require('../service/user-service');

module.exports = function (router) {

  /**
   * @api {post} /server-api/user 创建用户[第三方服务器]
   * @apiName create user
   * @apiGroup user
   *
   * @apiUse server_auth
   *
   * @apiParam {String} nickname 用户昵称
   * @apiParam {String} refKey 用户在第三方服务器中的唯一标示一般为用户ID
   * @apiParam {String} [avator] 用户头像
   * @apiParam {Number} [sex] 用户性别 1:男 2:女 3:其他
   * @apiParam {[Number]} [location] 用户地理位置
   * @apiParam {String} [des] 用户自己描述
   *
   * @apiSampleRequest /server-api/user
   *
   * @apiSuccess {String} id 用户唯一标示
   * @apiSuccess {String} appId 所属app的ID
   * @apiSuccess {String} sysSessionId 每一个用户创建的时候都会创建一个系统会话，用于接收系统消息，包括审批流程
   * @apiSuccess {Number} sim 是否是模拟用户，模拟用户用来发系统消息给普通用户
   * @apiSuccess {String} refKey 第三方服务器用户系统唯一标示，如果是模拟用户对应值为：'simuser_' + appId
   * @apiSuccess {String} nickname 用户昵称
   * @apiSuccess {String} letterNickname 用户昵称首字母大写
   * @apiSuccess {String} avator 用户头像
   * @apiSuccess {Number} sex 用户性别 1男 2女 3其他
   * @apiSuccess {[Number]} location 用户坐标数组，数组只有两项
   * @apiSuccess {String} token 用户登录授权的校验码
   * @apiSuccess {Number} tokenExpiry 用户登录授权的校验码有效期，单位小时
   * @apiSuccess {Number} joinSessionAgree 被邀请加入会话是否需要同意
   * @apiSuccess {Number} del 用户是否删除
   * @apiSuccess {String} lock 用户是否锁定，锁定之后不能进行任何操作也不能登录
   * @apiSuccess {String} des 用户个人描述
   *
   */
  router.post('/server-api/user', serverCreateUser);

  /**
   * @api {post} /server-api/user/:refKey 更新用户信息[第三方服务器]
   * @apiName update user
   * @apiGroup user
   *
   * @apiUse server_auth
   *
   * @apiParam {String} refKey 用户在第三方服务器中的唯一标示一般为用户ID
   * @apiParam {String} [nickname] 用户昵称
   * @apiParam {String} [avator] 用户头像
   * @apiParam {Number} [sex] 用户性别 1:男 2:女 3:其他
   * @apiParam {[Number]} [location] 用户地理位置
   * @apiParam {String} [des] 用户自己描述
   * @apiParam {Number} [del] 是否删除
   * @apiParam {Number} [lock] 是否锁定
   *
   * @apiSampleRequest /server-api/user/:refKey
   *
   */
  router.post('/server-api/user/:refKey', serverUpdateUser);

  /**
   * @api {get} /server-api/user/:refKey/auth 获取客户端认证Token[第三方服务器]
   * @apiName get client Token
   * @apiGroup user
   *
   * @apiUse server_auth
   *
   * @apiParam {String} refKey 用户在第三方服务器中的唯一标示一般为用户ID
   *
   * @apiSampleRequest /server-api/user/:refKey/auth
   *
   * @apiSuccess {String} token 客户端请求接口时的认证token
   * @apiSuccess {String} [tokenExpiry] token有效期单位小时
   */
  router.get('/server-api/user/:refKey/auth', auth);

  /**
   * @api {post} /api/user 更新用户信息[客户端]
   * @apiName update self
   * @apiGroup user
   *
   * @apiUse client_auth
   *
   * @apiParam {String} [nickname] 用户昵称
   * @apiParam {String} [avator] 用户头像
   * @apiParam {Number} [sex] 用户性别 1:男 2:女 3:其他
   * @apiParam {[Number]} [location] 用户地理位置
   * @apiParam {String} [des] 用户自己描述
   * @apiParam {Number} [joinSessionAgree] 被邀请加入会话是否需要同意
   *
   * @apiSampleRequest /api/user
   *
   */
  router.post('/api/user', updateUser);

  /**
   * @api {get} /api/user 查询用户[客户端]
   * @apiName search user
   * @apiGroup user
   *
   * @apiUse client_auth
   *
   *
   * @apiParam {String} [nickname] 用户昵称
   * @apiParam {String} [letterNickname] 用户昵称首字母大写
   * @apiParam {String} [name] 用户昵称或者首字母大写复合查询
   * @apiParam {Number} [sex] 用户性别 1:男 2:女 3:其他
   * @apiParam {[Number]} [location] 用户地理位置
   * @apiParam {Number} [locationRadius] 搜索半径
   * @apiParam {Number} [del] 用户地理位置
   * @apiParam {Number} [lock] 用户地理位置
   * @apiParam {Number} [page] 分页页数
   * @apiParam {Number} [pageSize] 每一页显示数据量
   * @apiParam {Number} [searchCount] 是否返回符合条件的总数据个数,可以在响应头的searchCount字段获取该值
   *
   * @apiSampleRequest /api/user
   *
   */
  router.get('/api/user', findUser);

  /**
   * @api {get} /api/user/push-online-auth 接收并验证推送服务发来的验证请求[第三方服务器]
   * @apiName auth user from push
   * @apiGroup user
   *
   * @apiUse server_auth
   *
   *
   * @apiParam {String} [userid] 用户refKey
   * @apiParam {String} [appid] 用户所属的appid
   * @apiParam {String} [token] 用户验证token
   *
   * @apiSampleRequest /api/user/push-online-auth
   *
   * @apiSuccess {[string]} rooms 返回用户所有的会话ID
   *
   */
  router.get('/api/user/push-online-auth', pushOnlineAuth);

}

//********************************************************* */

async function serverCreateUser(ctx, next) {
  ctx.request.body.appId = ctx.get('AppKey');
  ctx.body = await userService.createUser(ctx.request.body);
}

async function serverUpdateUser(ctx, next) {
  let data = ctx.request.body;
  data.refKey = ctx.params.refKey;
  data.appId = ctx.get('AppKey');
  ctx.body = await userService.updateUser(data);
}

async function updateUser(ctx, next) {
  let data = ctx.request.body;
  data.refKey = ctx.session.user.refKey;
  data.appId = ctx.session.user.appId;
  delete data.del;
  delete data.lock;
  ctx.body = await userService.updateUser(data);
}

async function auth(ctx, next) {
  let refKey = ctx.params.refKey;
  let appId = ctx.get('AppKey');
  let tokenExpiry = ctx.request.query.tokenExpiry;
  ctx.body = await userService.auth(refKey, appId, tokenExpiry);
}

async function findUser(ctx, next) {
  let data = ctx.request.query;
  data.appId = ctx.session.user.appId;
  let list = await userService.list(data);
  if (+data.searchCount == 1) {
    ctx.set('searchCount', list.pop());
  }

  ctx.body = list;
}


async function pushOnlineAuth(ctx, next) {
  let sessionIdList = await userService.pushOnlineAuth(ctx.request.query);
  ctx.body = { rooms: sessionIdList };
}
