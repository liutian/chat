const messageService = require('../service/message-service');


module.exports = function (router) {

  /**
   * @api {post} /api/message 发送消息[客户端]
   * @apiName send message
   * @apiGroup message
   *
   * @apiUse client_auth
   *
   * @apiParam {String} sessionId 会话ID
   * @apiParam {Object} content 消息内容
   * @apiParam {String} [textContent] 消息纯文本,推送时使用
   * @apiParam {Number} [contentType] 消息内容类型 1:纯文本 2:图文 3:图片 4:语音 5:文件 6:视频 7:位置
   * @apiParam {String} [apnsName] apns推送时使用的证书
   * @apiParam {String} [leaveMessage] 是否保存离线数据,如果不保留则ios不会收到apns推送信息
   * @apiParam {[String]} [focusMembers] @成员列表
   * @apiParam {Number} [anonymously] 是否是匿名消息
   *
   * @apiSampleRequest /api/message
   *
   * @apiSuccess {Number} msgId 消息id,数值类型递增
   * @apiSuccess {String} sessionId 会话ID
   * @apiSuccess {String} appId 会话所属app
   * @apiSuccess {String} relevantSessionId 相关会话ID，应用于审批流程
   * @apiSuccess {String} relevantToken //关联操作ID
   * @apiSuccess {String} relevantStatus 关联事件是否操作完成比如是否审批用户加入，用户是否同意加入 1 未处理 2同意 3拒绝
   * @apiSuccess {String} relevantStatusUpdater 更新relevantStatus的操作者
   * @apiSuccess {Object} from 消息发送者refKey，参见用户接口
   * @apiSuccess {Object} content 消息数据
   * @apiSuccess {String} textContent 消息内容纯文本
   * @apiSuccess {String} pushResult 消息推送结果信息,该信息是异步更新,发送消息返回的结果不会有该信息,该字段只是帮助后续查询使用
   * @apiSuccess {Number} anonymously 消息是否是匿名消息
   * @apiSuccess {Number} contentType 消息内容类型 1:纯文本 2:图文 3:图片 4:语音 5:文件 6:视频 7:位置
   * @apiSuccess {Number} type 消息类型 1正常消息 2创建会话 3修改会话名称 4有人加入群聊 5邀请加入 6退出群聊 7被踢出群聊 9禁言会话 10锁定会话 11移交会话所有者 12更新公告 13更新会话描述 14解散会话 15被邀请需要同意 16邀请他人加入需要审核 17加入会话需要审核 18被邀请需要同意时被拒绝 19邀请他人加入需要审核时被拒绝 20加入会话需要审核时被拒绝
   * @apiSuccess {String} apnsName 消息推送时的apnsName
   * @apiSuccess {Number} leaveMessage 是否接收离线消息
   * @apiSuccess {Number} fromSys 是否是系统自动生成的消息
   * @apiSuccess {String} focusMembers @成员列表,refKey
   * @apiSuccess {Number} del 消息是否删除
   *
   */
  router.post('/api/message', saveMessage);


  /**
   * @api {get} /api/message 查询会话消息[客户端]
   * @apiName search session-message
   * @apiGroup message
   *
   * @apiUse client_auth
   *
   * @apiParam {String} sessionId 会话ID
   * @apiParam {Number} [page] 分页页数
   * @apiParam {Number} [pageSize] 每一页显示数据量
   * @apiParam {Number} [latestMessageId]  分页查询时可以查到的最新的消息的ID
   * @apiParam {Number} [type]  消息类型
   * @apiParam {Number} [contentType]  消息内容类型
   * @apiParam {Number} [searchAll] 是否查询所有消息，默认只查询有限的消息 (>=startMsgId或者<=endMsgId并且没有删除)
   *
   * @apiSampleRequest /api/message
   *
   * @apiSuccess {[Object]} result 请求返回参数，参考发送消息接口
   */
  router.get('/api/message', findMessage);

}


//********************************************************* */

async function saveMessage(ctx, next) {
  let id = ctx.request.body.id;
  if (id) {

  } else {
    ctx.request.body.from = ctx.session.user.refKey;
    ctx.request.body.appId = ctx.session.user.appId;
    ctx.body = await messageService.sendMessage(ctx.request.body);
  }
}

async function findMessage(ctx, next) {
  ctx.request.query.refKey = ctx.session.user.refKey;
  ctx.request.query.appId = ctx.session.user.appId;
  ctx.body = await messageService.list(ctx.request.query);
}
