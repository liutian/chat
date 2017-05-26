const sessionService = require('../service/session-service');


module.exports = function (router) {
  /**
   * @api {post} /api/session 创建会话[客户端]
   * @apiDescription 当members只有一个元素而且type为 'U' 时，系统优先判断当前用户和该member是否创建过私聊会话，如果有则直接返回该会话
   * @apiName create-session
   * @apiGroup session
   *
   * @apiUse client_auth
   *
   * @apiParam {String} [name] 会话名称
   * @apiParam {String} [avator] 会话头像
   * @apiParam {String} [des] 会话描述
   * @apiParam {Number} [anonymously] 是否可以匿名发送消息
   * @apiParam {Number} [maxMemberCount] 会话最大成员数
   * @apiParam {Number} [mute] 是否禁言
   * @apiParam {Number} [category] 会话类型，具体指有第三方服务器维护，暂时预留
   * @apiParam {Number} [hideNickname] 是否只有管理员才可以查看会话成员的昵称
   * @apiParam {Number} [freeze] 是否冻结会话，不允许成员变动
   * @apiParam {Number} [joinStrategy] 加入策略 1:自由加入 2:需要审核 3拒绝加入
   * @apiParam {Number} [inviteStrategy] 邀请策略 1:会话中的任何人都可以邀请他人加入 2:只有管理员才可以邀请他人加入
   * @apiParam {[Object]} [members] 邀请列表 [{type: String,id: String}] type => U:用户 (id:用户refKey字段) S:会话 (id:会话ID)
   *
   * @apiSuccess {String} id 会话ID
   * @apiSuccess {Number} type 会话类型 1:普通 2:系统会话
   * @apiSuccess {Number} category 会话类别
   * @apiSuccess {Number} hideNickname 是否只有管理员才能看到成员的昵称
   * @apiSuccess {Number} private 是否是私聊会话
   * @apiSuccess {Number} anonymously 是否可以匿名发送消息
   * @apiSuccess {String} name 会话名称
   * @apiSuccess {String} avator 会话头像
   * @apiSuccess {Number} joinStrategy 会话加入策略 1:自由加入 2:需要审核 3:拒绝加入 默认自由加入
   * @apiSuccess {Number} inviteStrategy 会话邀请策略只针对普通用户有效 1:会话中的任何人都可以邀请他人加入 2:只有管理员才可以邀请他人加入
   * @apiSuccess {String} founder 会话创建者
   * @apiSuccess {Object} notice 会话公告
   * @apiSuccess {String} des 会话描述
   * @apiSuccess {Number} maxMemberCount 限制会话中成员数
   * @apiSuccess {Number} msgMaxCount 会话中的总消息数
   * @apiSuccess {Object} latestMessage 会话中最新的消息，参见消息接口
   * @apiSuccess {String} owner 会话所有者
   * @apiSuccess {[String]} admins 会话管理员
   * @apiSuccess {Number} freeze 禁止成员变动(不包括主动退出群)只有会话所有者才能操作
   * @apiSuccess {Number} mute 禁言只有会话所有者才能操作，禁言之后只有会话所有者才能发言
   * @apiSuccess {Number} del 会话是否删除
   * @apiSuccess {String} updatedAt 会话信息最后一次更新的时间
   * @apiSuccess {String} createdAt 会话创建时间
   * @apiSuccess {String} joinQuestion 加入会话时需要回答的问题
   * @apiSuccess {String} joinAnswer 加入会话时需要回答的问题的答案
   */

  /**
   * @api {post} /api/session 更新信息会话[客户端]
   * @apiName update-session
   * @apiGroup session
   *
   * @apiUse client_auth
   *
   *
   * @apiParam {String} sessionId 会话ID
   * @apiParam {String} [name] 会话名称
   * @apiParam {String} [des] 会话描述
   * @apiParam {String} [hideNickname] 是否只有管理员才能看到昵称
   * @apiParam {String} [avator] 会话头像
   * @apiParam {String} [anonymously] 是否允许匿名发消息
   * @apiParam {Number} [maxMemberCount] 会话允许最大成员数
   * @apiParam {Number} [joinStrategy] 加入策略
   * @apiParam {Number} [inviteStrategy] 邀请策略
   * @apiParam {Number} [freeze] 是否冻结会话
   * @apiParam {Number} [mute] 是否禁言 1是 0 否
   * @apiParam {Number} [lock] 是否锁定会话(只有会话所有者可以更改)
   * @apiParam {Number} [del] 是否删除会话(只有会话所有者可以更改)
   * @apiParam {String} [owner] 会话所有者(只有会话所有者可以更改)
   * @apiParam {[String]} [admins] 会话管理员(只有会话所有者可以更改)
   * @apiParam {Number} [changeNotice] 是否根据修改字段生成相应的会话消息，作为记录
   * @apiParam {String} [joinQuestion] 加入会话时需要回答的问题
   * @apiParam {String} [joinAnswer] 加入会话时需要回答的问题的答案
   *
   */
  router.post('/api/session', saveSession);

  /**
   * @api {post} /api/invite 邀请加入会话[客户端]
   * @apiName invite
   * @apiGroup session
   *
   * @apiUse client_auth
   *
   * @apiParam {String} sessionId 会话ID
   * @apiParam {[Object]} members 邀请列表 [{type: String,id: String}] type => U:用户 S:会话
   * @apiParam {Number} [backView] 是否可以查看加入会话之前的会话消息，默认是不可以
   *
   * @apiSuccess {Object} result 请求返回参数，参考创建会话接口
   */
  router.post('/api/invite', invite);


  /**
   * @api {get} /api/session 查询会话列表[客户端]
   * @apiName search session list
   * @apiGroup session
   *
   * @apiUse client_auth
   *
   * @apiParam {Number} [searchAll] 是否查询所有相关会话, 1 查询所有会话 0 排除从列表中主动删除的会话
   *
   * @apiSuccess {[Object]} result 请求返回参数，参考创建会话接口
   */
  router.get('/api/session', findSession);


  /**
   * @api {get} /api/session/:id 查询会话详情[客户端]
   * @apiName session detail
   * @apiGroup session
   *
   * @apiUse client_auth
   *
   * @apiParam {String} sessionId 会话ID
   *
   * @apiSuccess {Object} result 请求返回参数，参考创建会话接口
   */
  router.get('/api/session/:id', getSession);



  /**
    * @api {post} /api/session-info 更新和用户自己相关的会话信息[客户端]
    * @apiName update-session-info
    * @apiGroup session
    *
    * @apiUse client_auth
    *
    *
    * @apiParam {String} sessionId 会话ID
    * @apiParam {String} [nickname] 在会话中的昵称
    * @apiParam {String} [background] 会话背景图
    * @apiParam {String} [stick] 会话置顶
    * @apiParam {String} [quiet] 会话推送免打扰
    * @apiParam {Number} [remove] 从历史会话中清除
    * @apiParam {String} [remark] 私聊时用户可以备注对方,该字段有对方修改自己不能修改
    *
    */
  router.post('/api/session-info', saveSessionInfo);
}


//********************************************************* */

async function getSession(ctx, next) {
  ctx.request.query.refKey = ctx.session.user.refKey;
  ctx.request.query.appId = ctx.session.user.appId;
  ctx.request.query.sessionId = ctx.params.id;
  ctx.body = await sessionService.detail(ctx.request.query);
}

async function findSession(ctx, next) {
  ctx.request.query.refKey = ctx.session.user.refKey;
  ctx.request.query.appId = ctx.session.user.appId;
  ctx.body = await sessionService.list(ctx.request.query);
}

async function saveSession(ctx, next) {
  if (ctx.request.body.sessionId) {
    ctx.request.body.refKey = ctx.session.user.refKey;
    ctx.request.body.appId = ctx.session.user.appId;
    await sessionService.update(ctx.request.body);
    ctx.body = {};
  } else {
    ctx.request.body.founder = ctx.session.user.refKey;
    ctx.request.body.appId = ctx.session.user.appId;
    ctx.body = await sessionService.create(ctx.request.body);
  }
}

async function invite(ctx, next) {
  ctx.request.body.refKey = ctx.session.user.refKey;
  ctx.request.body.appId = ctx.session.user.appId;
  await sessionService.invite(ctx.request.body);
  ctx.body = {};
}

async function saveSessionInfo(ctx, next) {
  ctx.request.body.refKey = ctx.session.user.refKey;
  ctx.request.body.appId = ctx.session.user.appId;
  await sessionService.updateSessionInfo(ctx.request.body);
  ctx.body = {};
}
