const sessionService = require('../service/session-service');


module.exports = function (router) {
  /**
   * @api {post} /api/session 创建会话[客户端]
   * @apiDescription 当members只有一个元素而且type为 'U' 时，系统优先查询当前用户和该member是否创建过私聊会话，如果有则直接返回该会话
   * @apiName create session
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
   * @apiParam {Number} [publicSearch] 是否可以公开搜索到
   * @apiParam {Number} [joinStrategy] 加入方式 1自由进入 2进入时需要审核 3需要回答问题 4需要回答问题并由管理员审核 5拒绝进入
   * @apiParam {Number} [inviteStrategy] 普通成员邀请他人进入会话的方式 1无需审核直接邀请进入 2需要管理员审核 3人数达到移动数量才进行审核
   * @apiParam {String} [joinQuestion] 加入会话的方式为3或4时，问题描述
   * @apiParam {String} [joinAnswer] 加入会话的方式为3或4时，问题的正确答案
   * @apiParam {[Object]} [members] 邀请列表 结构：[{type: String,id: String}] 可能的值：type=U代表用户，id为用户refKey字段 或者  type=S代表会话，id为会话ID
   *
   * @apiSampleRequest /api/session
   *
   * @apiSuccess {String} id 会话ID
   * @apiSuccess {String} id 会话所属的appId
   * @apiSuccess {String} name 会话名称
   * @apiSuccess {String} letterName 会话名称首字母大写
   * @apiSuccess {String} avator 会话头像
   * @apiSuccess {Number} type 会话类型 1:普通用户会话 2:系统级会话
   * @apiSuccess {Number} category 会话类别比如运动，读书，旅游，美食，具体值由第三方服务器维护
   * @apiSuccess {Number} publicSearch 是否可以公开搜索到
   * @apiSuccess {Number} private 是否是私聊会话
   * @apiSuccess {Number} privateKey 保存私聊会话成员的refKey，降序排列以 '_' 分割
   * @apiSuccess {Number} anonymously 是否可以发送匿名消息
   * @apiSuccess {Number} joinStrategy 加入方式 1自由进入 2进入时需要审核 3需要回答问题 4需要回答问题并由管理员审核 5拒绝进入
   * @apiSuccess {Number} inviteStrategy 普通成员邀请他人进入会话的方式 1无需审核直接邀请进入 2需要管理员审核 3人数达到移动数量才进行审核
   * @apiSuccess {String} founder 会话创建者,不代表可以管理会话只有会话拥有者和管理员可以管理会话，创建会话时同时是创建者也是拥有者
   * @apiSuccess {Number} maxMemberCount 限制会话最大成员数
   * @apiSuccess {Number} msgMaxCount 会话中的总消息数
   * @apiSuccess {String} des 会话描述
   * @apiSuccess {Object} notice 会话公告
   * @apiSuccess {Number} memberCount 会话中的成员数
   * @apiSuccess {Object} latestMessage 会话中最新的消息，参见消息接口
   * @apiSuccess {String} owner 会话所有者，值为用户的refKey
   * @apiSuccess {[String]} admins 会话管理员，值为用户的refKey
   * @apiSuccess {Number} mute 禁言只有会话所有者才能操作，禁言之后只有会话所有者才能发言
   * @apiSuccess {Number} del 会话是否删除
   * @apiSuccess {Number} lock 锁定会话，锁定后禁止修改会话信息，禁言，禁止邀请或者加入会话
   * @apiSuccess {String} updatedAt 会话信息最后一次更新的时间
   * @apiSuccess {String} createdAt 会话创建时间
   * @apiSuccess {String} joinQuestion 加入会话时需要回答的问题
   * @apiSuccess {String} joinAnswer 加入会话时需要回答的问题的答案
   * @apiSuccess {[String]} [noAuditAdmin] 不需要接收审核消息的管理员列表(用户的refKey)
   * @apiSuccess {Date} [updateDate] 更新会话本身时才会更新该字段(普通成员变动不会更新该字段)
   */

  /**
   * @api {post} /api/session 更新会话信息[客户端]
   * @apiName update session
   * @apiGroup session
   *
   * @apiUse client_auth
   *
   * @apiParam {String} sessionId 会话ID
   * @apiParam {String} [name] 会话名称，可能会在会话中自动生成一条消息
   * @apiParam {String} [avator] 会话头像
   * @apiParam {String} [des] 会话描述，可能会在会话中自动生成一条消息
   * @apiParam {Number} [anonymously] 是否可以匿名发送消息
   * @apiParam {Number} [maxMemberCount] 会话最大成员数
   * @apiParam {Number} [mute] 是否禁言，可能会在会话中自动生成一条消息
   * @apiParam {Number} [category] 会话类型，具体指有第三方服务器维护，暂时预留
   * @apiParam {Number} [publicSearch] 是否可以公开搜索到
   * @apiParam {Number} [joinStrategy] 加入方式 1自由进入 2进入时需要审核 3需要回答问题 4需要回答问题并由管理员审核 5拒绝进入
   * @apiParam {Number} [inviteStrategy] 普通成员邀请他人进入会话的方式 1无需审核直接邀请进入 2需要管理员审核 3人数达到移动数量才进行审核
   * @apiParam {String} [joinQuestion] 加入会话的方式为3或4时，问题描述
   * @apiParam {String} [joinAnswer] 加入会话的方式为3或4时，问题的正确答案
   * @apiParam {String} [notice] 会话公告，可能会在会话中自动生成一条消息
   * @apiParam {[String]} [noAuditAdmin] 不需要接收审核消息的管理员列表(用户的refKey)
   * @apiParam {Number} [lock] 是否锁定会话(只有会话所有者可以更改)，可能会在会话中自动生成一条消息
   * @apiParam {Number} [del] 是否删除会话(只有会话所有者可以更改)，可能会在会话中自动生成一条消息
   * @apiParam {String} [owner] 会话所有者(只有会话所有者可以更改)，可能会在会话中自动生成一条消息
   * @apiParam {[String]} [admins] 会话管理员(只有会话所有者可以更改)
   * @apiParam {Number} [changeNotice] 是否根据修改字段生成相应的会话消息，作为记录
   *
   * @apiSampleRequest /api/message
   *
   */
  router.post('/api/session', saveSession);

  /**
   * @api {post} /api/session/enter 加入会话[客户端]
   * @apiName enter session
   * @apiGroup session
   * @apiDescription 邀请加入或者自己加入会话
   *
   * @apiUse client_auth
   *
   * @apiParam {String} sessionId 会话ID
   * @apiParam {[Object]} [members] 邀请人员列表，只有管理员可以一次邀请多个，该选项为空则为自己加入会话，非邀请加入会话 [{type: String,id: String}] type => U:用户 S:会话
   * @apiParam {Number} [backView] 是否可以查看加入会话之前的会话消息，默认是不可以
   * @apiParam {String} [joinAnswer] 如果会话需要回答问题该字段用于用户提交的答案
   *
   * @apiSampleRequest /api/session/enter
   *
   * @apiSuccess {Object} result 请求返回参数，参考创建会话接口
   */

  /**
   * @api {post} /api/session/enter 管理员审核用户是否可以加入会话[客户端]
   * @apiName audit enter session
   * @apiGroup session
   * @apiDescription 包括用户自己加入会话时需要的审核和成员邀请其他人加入会话时的审核
   *
   * @apiUse client_auth
   *
   * @apiParam {String} sysMsgId 系统通知消息的ID
   * @apiParam {Number} [backView] 是否可以查看加入会话之前的会话消息，默认是不可以
   * @apiParam {String} [rejectReason] 审核不通过的原因
   * @apiParam {Number} resolve 审核是否通过
   *
   * @apiSampleRequest /api/session/enter
   *
   * @apiSuccess {Object} result 请求返回参数，参考创建会话接口
   */

  /**
   * @api {post} /api/session/enter 用户同意或者拒绝被邀请加入会话[客户端]
   * @apiName agree enter session
   * @apiGroup session
   *
   * @apiUse client_auth
   *
   * @apiParam {String} sysMsgId 系统通知消息的ID
   * @apiParam {Number} [backView] 是否可以查看加入会话之前的会话消息，默认是不可以
   * @apiParam {Number} resolve 是否同意
   *
   * @apiSampleRequest /api/session/enter
   *
   * @apiSuccess {Object} result 请求返回参数，参考创建会话接口
   */
  router.post('/api/session/enter', enter);

  /**
   * @api {post} /api/session/exit 退出会话或从会话中踢出[客户端]
   * @apiName exit session
   * @apiGroup session
   *
   * @apiUse client_auth
   *
   * @apiParam {String} sessionId 会话ID
   * @apiParam {[String]} [members] 要踢出的成员列表，如果是自己退出不需要这个参数
   *
   * @apiSampleRequest /api/session/exit
   *
   * @apiSuccess {Object} result 请求返回参数，参考创建会话接口
   */
  router.post('/api/session/exit', exit);

  /**
   * @api {get} /api/session/history 查询用户自己的历史会话[客户端]
   * @apiName search history session list
   * @apiGroup session
   *
   * @apiUse client_auth
   *
   * @apiParam {Number} [searchAll] 是否查询所有相关会话, 1 查询所有会话 0 排除从列表中主动删除的会话
   *
   * @apiSampleRequest /api/session/history
   *
   * @apiSuccess {[Object]} result 请求返回参数，参考创建会话接口
   */
  router.get('/api/session/history', findHistorySession);


  /**
   * @api {get} /api/session/:id 查询会话详情[客户端]
   * @apiName session detail
   * @apiGroup session
   *
   * @apiUse client_auth
   *
   * @apiParam {String} sessionId 会话ID
   *
   * @apiSampleRequest /api/session/:id
   *
   * stick quiet clearDate outside
   * @apiSuccess {Object} result 请求返回参数，大部分参考创建会话接口,下面是和用户自己相关的会话信息
   * @apiSuccess {Number} startMsgId 查询会话消息时最小消息Id
   * @apiSuccess {Number} endMsgId 查询会话消息时最大消息Id
   * @apiSuccess {String} nickname 用户在会话中的昵称（只有在会话消息列表，会话成员列表会显示该字段）
   * @apiSuccess {String} background 该会话的背景图
   * @apiSuccess {Date} joinDate 用户加入会话的时间
   * @apiSuccess {Date} speakDate 用户最后一次发言时间
   * @apiSuccess {Number} stick 该回合是否置顶
   * @apiSuccess {Number} quiet 是否开启消息免打扰,暂时只是用来显示不用来逻辑判断
   * @apiSuccess {Date} clearDate 用户主动清除会话时的时间
   * @apiSuccess {Number} outside 退出会话时该字段为1
   * @apiSuccess {String} otherRemark 私聊时用户可以备注对方,该字段有对方修改自己不能修改
   *
   */
  router.get('/api/session/:id', getSession);



  /**
   * @api {post} /api/session-info 更新和用户自己相关的会话信息[客户端]
   * @apiName update session-info
   * @apiGroup session
   *
   * @apiUse client_auth
   *
   * @apiParam {String} sessionId 会话ID
   * @apiParam {String} [nickname] 在会话中的昵称
   * @apiParam {String} [background] 会话背景图
   * @apiParam {Number} [stick] 会话置顶
   * @apiParam {Number} [quiet] 会话推送免打扰
   * @apiParam {Number} [remove] 从历史会话中清除
   * @apiParam {String} [otherRemark] 私聊时用户可以备注对方
   *
   * @apiSampleRequest /api/session-info
   *
   */
  router.post('/api/session-info', saveSessionInfo);


  /**
   * @api {get} /api/session 查询app下所有会话[客户端]
   * @apiName search session list
   * @apiGroup session
   *
   * @apiUse client_auth
   *
   * @apiParam {Number} [type] 会话类型
   * @apiParam {Number} [category] 会话类别
   * @apiParam {Number} [publicSearch] 会话是否可以公开搜索到
   * @apiParam {Number} [private] 私聊类型会话
   * @apiParam {Number} [name] 会话名称模糊查询
   * @apiParam {Number} [joinStrategy] 会话加入策略
   * @apiParam {Number} [inviteStrategy] 会话邀请策略
   * @apiParam {Number} [founder] 会话创建者ID
   * @apiParam {Number} [owner] 会话拥有者
   * @apiParam {Number} [admin] 会话管理者
   * @apiParam {Number} [mute] 会话是否禁言
   * @apiParam {Number} [del] 会话是否删除
   * @apiParam {Number} [lock] 会话是否锁定
   * @apiParam {Number} [page] 分页页数
   * @apiParam {Number} [pageSize] 每一页显示数据量
   * @apiParam {Number} [searchCount] 是否返回符合条件的总数据个数,可以在响应头的searchCount字段获取该值
   *
   * @apiSampleRequest /api/session
   *
   * @apiSuccess {[Object]} result 请求返回参数，参考创建会话接口
   */
  router.get('/api/session', findSession);

  /**
   * @api {get} /api/session/:id/member 查询会话成员列表[客户端]
   * @apiName search session member list
   * @apiGroup session
   *
   * @apiUse client_auth
   *
   * @apiParam {Number} [page] 分页页数
   * @apiParam {Number} [pageSize] 每一页显示数据量
   * @apiParam {Number} [searchCount] 是否返回符合条件的总数据个数,可以在响应头的searchCount字段获取该值
   *
   * @apiSampleRequest /api/session/:id/member
   *
   * @apiSuccess {[Object]} result 请求返回参数，参考创建用户接口
   */
  router.get('/api/session/:id/member', findSessionMember);
}


//********************************************************* */

async function getSession(ctx, next) {
  ctx.request.query.refKey = ctx.session.user.refKey;
  ctx.request.query.appId = ctx.session.user.appId;
  ctx.request.query.sessionId = ctx.params.id;
  ctx.body = await sessionService.detail(ctx.request.query);
}

async function findHistorySession(ctx, next) {
  ctx.request.query.refKey = ctx.session.user.refKey;
  ctx.request.query.appId = ctx.session.user.appId;
  ctx.body = await sessionService.listHistory(ctx.request.query);
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

async function enter(ctx, next) {
  ctx.request.body.refKey = ctx.session.user.refKey;
  ctx.request.body.appId = ctx.session.user.appId;
  await sessionService.enter(ctx.request.body);
  ctx.body = {};
}

async function exit(ctx, next) {
  ctx.request.body.refKey = ctx.session.user.refKey;
  ctx.request.body.appId = ctx.session.user.appId;
  await sessionService.exit(ctx.request.body);
  ctx.body = {};
}

async function saveSessionInfo(ctx, next) {
  ctx.request.body.refKey = ctx.session.user.refKey;
  ctx.request.body.appId = ctx.session.user.appId;
  await sessionService.updateSessionInfo(ctx.request.body);
  ctx.body = {};
}

async function findSession(ctx, next) {
  let data = ctx.request.query;
  data.appId = ctx.session.user.appId;
  let list = await sessionService.list(data);
  if (+data.searchCount == 1) {
    ctx.set('searchCount', list.pop());
  }

  ctx.body = list;
}

async function findSessionMember(ctx, next) {
  let data = ctx.request.query;
  data.appId = ctx.session.user.appId;
  data.id = ctx.params.id;
  data.refKey = ctx.session.user.refKey;
  let list = await sessionService.memberList(data);
  if (+data.searchCount == 1) {
    ctx.set('searchCount', list.pop());
  }

  ctx.body = list;
}


