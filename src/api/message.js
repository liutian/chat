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
   * @apiSuccess {Number} anonymously 消息是否是匿名消息
   * @apiSuccess {Object} from 消息发送者，参见用户接口
   * @apiSuccess {Object} content 消息数据
   * @apiSuccess {String} textContent 消息内容纯文本
   * @apiSuccess {String} pushResult 消息推送结果信息,该信息是异步更新,发送消息返回的结果不会有该信息,该字段只是帮助后续查询使用
   * @apiSuccess {Number} contentType 消息内容类型 1:纯文本 2:图文 3:图片 4:语音 5:文件 6:视频 7:位置
   * @apiSuccess {Number} type 消息类型 1:正常消息 2:创建会话 3:修改会话名称 4:有人加入群聊 5:邀请加入 6:退出群聊 7:被踢出群聊 8:冻结会话 9:禁言会话 10:锁定会话 11:会话所有人变动 12:更新公告 13被邀请加入会话(被邀请用户可以看到该消息，需要同意) 14加入会话需要审核(会话管理员可以看到)
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
