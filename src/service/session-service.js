const sessionInfoModel = require('mongoose').model('sessionInfo');
const messageModal = require('mongoose').model('message');
const sessionModel = require('mongoose').model('session');
const userModel = require('mongoose').model('user');
const util = require('util');

const apiError = require('../util/api-error');
const _util = require('../util/util');
const appService = require('./app-service');
const messageService = require('./message-service');
const userService = require('../service/user-service');
const letter = require('../util/letter');
const pushService = require('./push-service');


//创建会话,members字段可以为空
exports.create = createFn;

//邀请他人加入会话
exports.invite = inviteFn;


//************************************************************ */

//创建会话
async function createFn(data) {
  let pickList = 'type name avator joinStrategy inviteStrategy founder des maxMemberCount mute';
  let oldData = data;
  data = _util.pick(data, pickList);

  //基本数据校验
  if (!data.founder) apiError.throw('founder cannot be empty');
  if (!data.name) apiError.throw('name cannot be empty');
  //校验会话创建者
  let founder = await userService.get(data.founder);
  if (!founder) apiError.throw('founder does not exist');
  if (founder.lock == 1) apiError.throw(1011);
  if (founder.del == 1) apiError.throw(1012);
  //校验创建会话是否合规
  let app = await appService.get(founder.appId);
  let sessionCount = await sessionModel.count({ owner: data.founder });
  if (sessionCount > app.maxSessionCount) apiError.throw('this user:' + data.founder + ' create too much session');

  //初始化数据
  data.appId = founder.appId;
  data.owner = founder.id;
  data.members = [founder.id];
  data.admins = [founder.id];
  data.letterName = letter(data.name)[0];

  //存储会话
  let newSession = await sessionModel.create(data);

  //创建用户会话关联信息
  await updateSessionInfo(founder.appId, newSession.id, [founder.id]);

  //处理邀请加入操作
  if (oldData.members && oldData.members.length > 0) {
    await _invite(app, newSession, oldData.members, founder);
  }

  return newSession;
}

async function inviteFn(data) {
  data = _util.pick(data, ' userId members id');
  //基本数据校验
  if (!data.userId) apiError.throw('userId cannot be empty');
  if (!Array.isArray(data.members) || data.members.length < 1) apiError.throw('members cannot be empty');
  if (!data.id) apiError.throw('session id cannot be empty');

  //校验当前用户信息
  let user = await userService.get(data.userId);
  if (!user) apiError.throw('this user does not exist');
  if (user.lock == 1) apiError.throw(1011);
  if (user.del == 1) apiError.throw(1012);

  //校验会话和邀请是否合规
  let app = await appService.get(user.appId);
  let session = await sessionModel.findOne({
    _id: data.id,
    appId: user.appId,
    members: data.userId
  }, 'maxMemberCount inviteStrategy owner admins freeze del lock name');
  if (!session) apiError.throw('session does not exist or user not in session');
  if (session.lock == 1) apiError.throw(1020);
  if (session.del == 1) apiError.throw(1021);
  if (session.freeze == 1) apiError.throw(1022);
  if (session.inviteStrategy != 1 && data.userId != session.owner && !session.admins.include(data.userId)) {
    apiError.throw(1023);
  }

  await _invite(app, session, data.members, user);
}

//邀请加入会话不验证与现有会话中的成员是否重复，交由数据库去重
//不对邀请本身进行校验，交由调用方校验
async function _invite(app, session, members, user) {
  //解析members
  let maxMemberCount = Math.min(session.maxMemberCount, app.maxMemberCount);
  let parseMembers = await parseMembersFn(members, maxMemberCount);
  if (parseMembers.length < 1) apiError.throw('parseMembers at least one');

  //更新用户会话关联信息
  let userNicknames = await updateSessionInfo(app.id, session.id, parseMembers);

  //初始化新消息
  let newMsg = {
    sessionId: session.id,
    appId: app.id,
    from: user.id,
    content: user.nickname + ' 邀请 ' + userNicknames.join('、') + '加入聊天',
    type: 5,
    fromSys: 1
  }

  //更新会话信息包括成员列表
  let newSession = await sessionModel.findByIdAndUpdate(session.id, {
    $addToSet: { members: { $each: parseMembers } },
    $inc: { msgMaxCount: 1 },
    $push: {
      latestMessages: {
        $each: [newMsg],
        $slice: -20
      }
    }
  }, { 'new': true });
  newMsg.id = newSession.msgMaxCount;

  //存储邀请会话产生的消息
  await messageModal.create(newMsg);

  //推送消息
  pushService.push({
    room: session.id,
    pushData: newMsg,
    pushAuth: app.pushAuth,
    apnsName: app.apnsName,
    leaveMessage: newMsg.leaveMessage
  }).then(function () {
    messageModal.findByIdAndUpdate(newMsg.id, { pushResult: 'ok' });
  }).catch(function (err) {
    messageModal.findByIdAndUpdate(newMsg.id, { pushResult: err });
  });
}

async function updateSessionInfo(appId, sessionId, members) {
  let userNicknames = [];
  for (let i = 0; i < members.length; i++) {
    let memberId = members[i];
    let user = await userService.get(memberId);
    if (!user) apiError.throw('member id:' + memberId + ' does not exist');
    if (user.appId != appId) apiError.throw('user:' + memberId + ' appId:' + appId + ' does not exist');
    userNicknames.push(user.nickname);

    await sessionInfoModel.update({
      sessionId: sessionId,
      userId: memberId,
      appId: appId
    }, {
        sessionId: sessionId,
        userId: memberId,
        appId: appId,
        del: 0
      }, { upsert: true });
  }

  return userNicknames;
}

async function parseMembersFn(members, maxMemberCount) {
  if (members.length > maxMemberCount) apiError.throw(1017);
  let newMembers = [];

  for (let i = 0; i < members.length; i++) {
    let member = members[i];
    if (!member.id) apiError.throw('member id cannot be empty');

    if (member.type == 'U') {
      if (newMembers.indexOf(member.id) == -1) {
        if (newMembers.length >= maxMemberCount) apiError.throw(1017);
        newMembers.push(member.id);
      }
    } else if (member.type == 'S') {
      let session = await sessionModel.findById(member.id, 'members appId');
      if (!session) apiError.throw('session:' + member.id + ' does not exist');

      for (let i = 0; i < session.members.length; i++) {
        let memberId = session.members[i].toString();
        if (newMembers.indexOf(memberId) == -1) {
          if (newMembers.length >= maxMemberCount) apiError.throw(1017);
          newMembers.push(memberId);
        }
      }
    }
  }

  return newMembers;
}
