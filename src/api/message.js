const messageService = require('../service/message-service');


module.exports = function (router) {

  /**
   * @api {post} /api/message 发送消息
   * @apiName send message
   * @apiGroup message
   *
   * @apiParam {String} sessionId 会话ID
   * @apiParam {Object} content 消息内容
   * @apiParam {String} [textContent] 消息纯文本,推送时使用
   * @apiParam {Number} [contentType] 消息内容类型 1:纯文本 2:图文 3:图片 4:语音 5:文件 6:视频 7:位置
   * @apiParam {String} [apnsName] apns推送时使用的证书
   * @apiParam {String} [leaveMessage] 是否保存离线数据
   * @apiParam {String} [focusMembers] @成员列表
   *
   * @apiSuccess {String} id 消息ID
   *
   */
  router.post('/api/message', saveMessage);
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

