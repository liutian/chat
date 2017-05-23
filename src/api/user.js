const logger = require('log4js').getLogger('api-user');
const mongoose = require('mongoose');

const userService = require('../service/user-service');

module.exports = function (router) {

  /**
     * @api {post} /server-api/user/create 创建用户
     * @apiName create User
     * @apiGroup user
     *
     * @apiUse server_auth
     *
     * @apiParam {String} nickname 用户昵称
     * @apiParam {String} refKey 用户在第三方服务器中的唯一标示一般为用户ID
     * @apiParam {String} [avator] 用户头像
     * @apiParam {Number} [sex] 用户性别 1:男 2:女 3:其他
     * @apiParam {[Number]} [location] 用户地理位置
     *
     * @apiSuccess {String} id 用户唯一标示
     *
     */
  router.post('/server-api/user/create', serverCreateUser);

  /**
     * @api {post} /server-api/user 更新用户信息
     * @apiName update User
     * @apiGroup user
     *
     * @apiUse server_auth
     *
     * @apiParam {String} refKey 用户在第三方服务器中的唯一标示一般为用户ID
     * @apiParam {String} [nickname] 用户昵称
     * @apiParam {String} [avator] 用户头像
     * @apiParam {Number} [sex] 用户性别 1:男 2:女 3:其他
     * @apiParam {[Number]} [location] 用户地理位置
     * @apiParam {Number} [del] 是否删除
     * @apiParam {Number} [lock] 是否锁定
     *
     */
  router.post('/server-api/user/update', serverUpdateUser);

  /**
     * @api {get} /server-api/user/auth 获取客户端认证Token
     * @apiName get client Token
     * @apiGroup user
     *
     * @apiUse server_auth
     *
     * @apiParam {String} refKey 用户在第三方服务器中的唯一标示一般为用户ID
     *
     * @apiSuccess {String} token 客户端请求接口时的认证token
     */
  router.get('/server-api/user/auth', auth);

  /**
     * @api {post} /api/user 更新用户信息 [客户端]
     * @apiName update User[client]
     * @apiGroup user
     *
     * @apiUse client_auth
     *
     * @apiParam {String} [nickname] 用户昵称
     * @apiParam {String} [avator] 用户头像
     * @apiParam {Number} [sex] 用户性别 1:男 2:女 3:其他
     * @apiParam {[Number]} [location] 用户地理位置
     *
     */
  router.post('/api/user', updateUser);

}

//********************************************************* */

async function serverCreateUser(ctx, next) {
  ctx.request.body.appId = ctx.get('AppKey');
  ctx.body = await userService.createUser(ctx.request.body);
}

async function serverUpdateUser(ctx, next) {
  ctx.request.body.appId = ctx.get('AppKey');
  await userService.updateUser(ctx.request.body);
  ctx.body = {};
}

async function updateUser(ctx, next) {
  let data = ctx.request.body;
  data.refKey = ctx.session.user.refKey;
  data.appId = ctx.session.user.appId;
  delete data.del;
  delete data.lock;
  await userService.updateUser(data);
  ctx.body = {};
}

async function auth(ctx, next) {
  let refKey = ctx.request.query.refKey;
  let appId = ctx.get('AppKey');
  let expiry = ctx.request.query.expiry;
  ctx.body = await userService.auth(refKey, appId, expiry);
}
