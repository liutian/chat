const sessionModel = require('mongoose').model('session');
const messageModal = require('mongoose').model('message');
const userModel = require('mongoose').model('user');
const util = require('util');

const userService = require('./user-service');
const pushService = require('./push-service');
const appService = require('./app-service');
const apiError = require('../util/api-error');
const _util = require('../util/util');
const config = require('../config');


exports.sendMessage = sendMessageFn;

//************************************************************ */

async function sendMessageFn(data) {
  data = _util.pick(data, 'from sessionId  content textContent contentType leaveMessage apnsName focusMembers');
  //基本数据校验
  if (!data.from) apiError.throw('from cannot be empty');
  if (!data.sessionId) apiError.throw('sessionId cannot be empty');
  if (!data.content) apiError.throw('content cannot be empty');

  //校验当前用户信息
  let user = await userService.get(data.from);
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
  let newSession = await sessionModel.findByIdAndUpdate(data.sessionId, {
    $inc: { msgMaxCount: 1 },
    $push: {
      latestMessages: {
        $each: [data],
        $slice: -20
      }
    }
  }, { 'new': true });

  data.id = newSession.msgMaxCount;
  //存储数据
  await messageModal.create(data);

  //推送消息
  let app = await appService.get(data.appId);
  pushService.push({
    room: data.sessionId,
    pushData: data,
    pushAuth: app.pushAuth,
    apnsName: util.isString(data.apnsName) ? data.apnsName : app.apnsName,
    leaveMessage: data.leaveMessage
  }).then(function () {
    messageModal.findByIdAndUpdate(data.id, { pushResult: 'ok' });
  }).catch(function (err) {
    messageModal.findByIdAndUpdate(data.id, { pushResult: err });
  });

  return data;
}

