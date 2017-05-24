const sessionModel = require('mongoose').model('session');
const messageModal = require('mongoose').model('message');
const sessionInfoModal = require('mongoose').model('sessionInfo');
const userModel = require('mongoose').model('user');
const util = require('util');

const userService = require('./user-service');
const pushService = require('./push-service');
const appService = require('./app-service');
const apiError = require('../util/api-error');
const _util = require('../util/util');
const config = require('../config');


exports.sendMessage = sendMessageFn;

exports.list = listFn;

//************************************************************ */

async function listFn(data) {
  //基本数据校验
  if (!data.refKey) apiError.throw('refKey cannot be empty');
  if (!data.appId) apiError.throw('appId cannot be empty');
  if (!data.sessionId) apiError.throw('sessionId cannot be empty');

  //首先查看sessionInfo，判断用户是否可以查看会话中的消息
  let sessionInfo = await sessionInfoModal.findOne({
    refKey: data.refKey,
    appId: data.appId,
    sessionId: data.sessionId
  }, 'startMsgId endMsgId');
  if (!sessionInfo) apiError.throw('sessionInfo cannot find');

  let limit = data.pageSize || 10;
  let skip = ((data.page || 1) - 1) * limit;
  let query = {
    appId: data.appId,
    sessionId: data.sessionId
  };
  //all为1时会查询该会话下的所有消息，
  //包括删除的以及查询段之外的(startMsgId - endMsgId这两个字段用在退出会话之后的消息不能被看到或者加入之后不能查看加入之前的会话)
  if (data.all == 1) {
    if (data.latestMessageId) {
      query.id = { $lt: data.latestMessageId };
    }
  } else {
    query.del = 0;
    query.id = { $gte: sessionInfo.startMsgId };
    if (data.latestMessageId && data.latestMessageId < sessionInfo.endMsgId) {
      query.id.$lt = data.latestMessageId;
    } else {
      query.id.$lte = sessionInfo.endMsgId;
    }
  };
  //可以根据消息类型查询
  if (Array.isArray(data.type)) {
    query.type = { $in: data.type };
  } else if (Number.isInteger(data.type)) {
    query.type = data.type;
  }
  //可以根据消息内容类型查询
  if (Array.isArray(data.contentType)) {
    query.contentType = { $in: data.contentType };
  } else if (Number.isInteger(data.contentType)) {
    query.contentType = data.contentType;
  }

  let messageList = await messageModal.find(query).sort('-msgId').skip(skip).limit(limit);

  //实时查询消息中发送者信息
  let fromMap = {};
  let returnMessageList = [];
  for (let i = 0; i < messageList.length; i++) {
    let msg = messageList[i].obj;
    if (!fromMap[msg.from]) {
      fromMap[msg.from] = await userService.get(msg.from, query.appId);
    }
    msg.from = fromMap[msg.from];
    returnMessageList.push(msg);
  }

  return returnMessageList;
}


async function sendMessageFn(data) {
  data = _util.pick(data, 'from appId sessionId  content textContent contentType leaveMessage apnsName focusMembers');
  //基本数据校验
  if (!data.from) apiError.throw('from cannot be empty');
  if (!data.sessionId) apiError.throw('sessionId cannot be empty');
  if (!data.content) apiError.throw('content cannot be empty');

  //校验当前用户信息
  let user = await userService.get(data.from, data.appId);
  if (!user) apiError.throw('this user does not exist');
  if (user.lock == 1) apiError.throw(1011);
  if (user.del == 1) apiError.throw(1012);

  //校验会话信息
  let session = await sessionModel.findOne({
    _id: data.sessionId,
    appId: user.appId
  }, 'owner admins mute del lock');
  if (!session) apiError.throw('session does not exist');
  if (session.lock == 1) apiError.throw(1020);
  if (session.del == 1) apiError.throw(1021);

  //校验发送消息是否合规
  if (session.mute == 1 && data.from != session.owner && !session.admins.includes(data.from)) {
    apiError.throw(1024);
  }

  //在会话中存储消息相关的信息
  data.appId = user.appId;
  data.updatedAt = new Date();
  let newSession = await sessionModel.findByIdAndUpdate(data.sessionId, {
    $inc: { msgMaxCount: 1 },
    $set: {
      latestMessage: data
    }
  }, { new: true });

  data.msgId = newSession.msgMaxCount;
  //存储数据
  let newMsg = await messageModal.create(data);

  //推送消息
  let app = await appService.get(data.appId);
  pushService.push({
    room: data.sessionId,
    pushData: data,
    pushAuth: app.pushAuth,
    apnsName: util.isString(data.apnsName) ? data.apnsName : app.pushApnsName,
    leaveMessage: data.leaveMessage
  }).then(function () {
    messageModal.findByIdAndUpdate(data.id, { pushResult: 'ok' });
  }).catch(function (err) {
    messageModal.findByIdAndUpdate(data.id, { pushResult: err });
  });

  return newMsg.obj;
}

