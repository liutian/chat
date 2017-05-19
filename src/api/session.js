const sessionService = require('../service/session-service');


module.exports = function (router) {
  /**
   * @api {post} /api/session 创建会话
   * @apiName create-session
   * @apiGroup session
   *
   * @apiParam {String} name 会话名称
   * @apiParam {String} [des] 会话描述
   * @apiParam {Number} [maxMemberCount] 会话最大成员数
   * @apiParam {Number} [mute] 是否禁言 1是 0 否
   * @apiParam {String} [avator] 会话头像
   * @apiParam {Number} [joinStrategy] 加入策略 1:自由加入 2:需要审核 3拒绝加入
   * @apiParam {Number} [inviteStrategy] 邀请策略 1:会话中的任何人都可以邀请他人加入 2:只有管理员才可以邀请他人加入
   * @apiParam {[Object]} members 邀请列表 [{type: String,id: String}] type => U:用户 S:会话
   *
   * @apiSuccess {String} id 会话ID
   *
   */
  router.post('/api/session', saveSession);

  /**
   * @api {post} /api/invite 邀请加入会话
   * @apiName invite
   * @apiGroup session
   *
   * @apiParam {String} id 会话ID
   * @apiParam {[Object]} members 邀请列表 [{type: String,id: String}] type => U:用户 S:会话
   *
   * @apiSuccess {String} id 会话ID
   *
   */
  router.post('/api/invite', invite);
}


//********************************************************* */


async function saveSession(ctx, next) {
  let id = ctx.request.body.id;
  if (id) {

  } else {
    ctx.request.body.founder = ctx.session.user.id;
    let newSession = await sessionService.create(ctx.request.body);
    ctx.body = { id: newSession.id };
  }
}


async function invite(ctx, next) {
  ctx.request.body.userId = ctx.session.user.id;
  await sessionService.invite(ctx.request.body);
  ctx.body = {};
}

