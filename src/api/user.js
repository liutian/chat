const logger = require('log4js').getLogger('api-user');
const mongoose = require('mongoose');

const userService = require('../service/user-service');

module.exports = function (router) {

  /**
     * @api {post} /server-api/user 创建用户
     * @apiName create User
     * @apiGroup user
     *
     * @apiParam {String} nickname 用户昵称
     * @apiParam {String} refKey 用户在第三方服务器中的唯一标示一般为用户ID
     * @apiParam {String} [avator] 用户头像
     * @apiParam {Number} [sex] 用户性别 1:男 2:女 3:其他
     * @apiParam {[Number]} [location] 用户地理位置
     *
     * @apiSuccess {String} _id 用户唯一标示，第三方服务器需要保证该结果
     *
     */

  /**
     * @api {post} /server-api/user 更新用户信息
     * @apiName update User
     * @apiGroup user
     *
     * @apiParam {String} id 用户ID
     * @apiParam {String} [nickname] 用户昵称
     * @apiParam {String} [avator] 用户头像
     * @apiParam {Number} [sex] 用户性别 1:男 2:女 3:其他
     * @apiParam {[Number]} [location] 用户地理位置
     * @apiParam {Number} [del] 是否删除
     * @apiParam {Number} [lock] 是否锁定
     *
     */
  router.post('/server-api/user', saveUser);

  /**
     * @api {get} /server-api/user/auth 获取客户端认证Token
     * @apiName get client Token
     * @apiGroup user
     *
     * @apiParam {String} uid 用户ID
     *
     * @apiSuccess {String} token 客户端请求接口时的认证token
     */
  router.get('/server-api/user/auth', auth);

  /**
     * @api {post} /api/user 更新用户信息 [客户端]
     * @apiName update User[client]
     * @apiGroup user
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

async function saveUser(ctx, next) {
  let id = ctx.request.body.id;
  ctx.request.body.appId = ctx.get('AppKey');
  if (id) {
    await userService.updateUser(ctx.request.body);
    ctx.body = {};
  } else {
    let result = await userService.createUser(ctx.request.body);
    ctx.body = result;
  }
}

async function updateUser(ctx, next) {
  let data = ctx.request.body;
  data.id = ctx.session.user.id;
  data.appId = ctx.session.user.appId;
  delete data.del;
  delete data.lock;
  await userService.updateUser(data);
  ctx.body = {};
}

async function auth(ctx, next) {
  let uid = ctx.request.query.uid;
  let appId = ctx.get('AppKey');
  let expiry = ctx.request.query.expiry;
  let result = await userService.auth(uid, appId, expiry);
  ctx.body = result;
}
