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

//查询用户自己的会话列表
exports.list = listFn;

//查询单个会话的详细信息
exports.detail = detailFn;

//************************************************************ */

async function detailFn(data) {
  //基本数据校验
  if (!data.refKey) apiError.throw('refKey cannot be empty');
  if (!data.appId) apiError.throw('appId cannot be empty');
  if (!data.sessionId) apiError.throw('sessionId cannot be empty');

  //先查询sessionInfo集合，然后查询session集合，避免直接查询session集合members字段，导致退出会话时完全无法查看会话详情
  //sessionInfo集合数据只有在用户主动删除会话时才取消关联，如果是被踢出去时，还是能查看会话信息，但是不能查看会话成员信息，和公告
  let sessionInfo = await sessionInfoModel.findOne({
    sessionId: data.sessionId,
    refKey: data.refKey,
    appId: data.appId
  }, 'nickName background stick quiet leave');
  if (!sessionInfo) apiError.throw('sessionInfo cannot find');
  let filter = data.showMembers && sessionInfo.leave != 1 ? '' : '-admins -members -notice';
  let session = await sessionModel.findOne({
    _id: data.sessionId,
    appId: data.appId
  }, filter);
  if (!session) apiError.throw('session cannot find');
  let returnSession = Object.assign(session.obj, sessionInfo.obj);

  //默认不显示成员信息
  if (data.showMembers == 1) {
    let memberMap = {};
    let adminList = [];
    let memberList = [];
    for (let i = 0; i < returnSession.admins.length; i++) {
      let refKey = returnSession.admins[i];
      if (!memberMap[refKey]) {
        memberMap[refKey] = await userService.get(refKey, data.appId);
      }
      adminList.push(memberMap[refKey]);
    }
    for (let i = 0; i < returnSession.members.length; i++) {
      let refKey = returnSession.members[i];
      if (!memberMap[refKey]) {
        memberMap[refKey] = await userService.get(refKey, data.appId);
      }
      memberList.push(memberMap[refKey]);
    }
    returnSession.admins = adminList;
    returnSession.members = memberList;
  }

  return returnSession;
}

//排序没有多大作用,不需要分页
async function listFn(data) {
  //基本数据校验
  if (!data.refKey) apiError.throw('refKey cannot be empty');
  if (!data.appId) apiError.throw('appId cannot be empty');

  //每次都查出来所有关联的会话，然后在进行筛选
  let query = { refKey: data.refKey, appId: data.appId };
  let sessionInfoList = await sessionInfoModel.find(query, 'sessionId stick quiet clearDate leave');
  let sessionMap = {};
  sessionInfoList.forEach((value, index) => sessionMap[value.sessionId] = value.obj);
  let sessionList = await sessionModel.find({
    _id: { $in: Object.keys(sessionMap) }
  }, 'type name avator latestMessage freeze mute lock private').sort('-latestMessage.updatedAt');

  let stickSession = [];
  let noStickSession = [];
  for (let i = 0; i < sessionList.length; i++) {
    let session = sessionList[i].obj;
    Object.assign(session, _util.pick(sessionMap[session.id], 'stick quiet clearDate leave'));

    //默认只查询clearDate字段小于latestMessage字段updatedAt属性的会话
    if (data.showAll != 1 && session.clearDate && session.latestMessage
      && session.latestMessage.updatedAt.getTime() <= session.clearDate.getTime()) continue;

    if (session.private == 1 && !session.name) {
      let _session = await sessionModel.findById(session.id, 'members');
      let otherId = _session.members.filter(v => v != data.refKey);
      let other = await userService.get(otherId, data.appId);
      session.name = other.nickname;
    }

    //置顶会话排在最前面
    if (session.stick == 1) {
      stickSession.push(session);
    } else {
      noStickSession.push(session);
    }
  }
  return stickSession.concat(noStickSession);
}

//创建会话
async function createFn(data) {
  let pickList = 'type name avator joinStrategy inviteStrategy founder appId des maxMemberCount mute';
  let oldData = data;
  data = _util.pick(data, pickList);

  //基本数据校验
  // if (!data.name) apiError.throw('name cannot be empty');
  if (!data.founder) apiError.throw('founder cannot be empty');
  if (!data.appId) apiError.throw('appId cannot be empty');
  //校验会话创建者
  let founder = await userService.get(data.founder, data.appId);
  if (!founder) apiError.throw('founder does not exist');
  if (founder.lock == 1) apiError.throw(1011);
  if (founder.del == 1) apiError.throw(1012);
  //检查如果存在当前用户和members[0]在一个会话，而且该会话只有这两个人则直接返回该会话
  if (Array.isArray(data.members) && data.members.length == 1 && data.members[0].type == 'U') {
    let _session = await sessionModel.findOne({ members: [data.founder, data.members[0]], appId: data.appId });
    if (_session) {
      return _session.obj;
    }
  }
  //校验创建会话是否合规
  let app = await appService.get(founder.appId);
  let sessionCount = await sessionModel.count({ owner: data.founder, appId: data.appId });
  if (sessionCount > app.maxSessionCount) apiError.throw('this user:' + data.founder + ' create too much session');

  //初始化数据
  data.appId = founder.appId;
  data.owner = founder.refKey;
  data.members = [founder.refKey];
  data.admins = [founder.refKey];
  data.letterName = data.name && letter(data.name)[0];

  //存储会话
  let newSession = await sessionModel.create(data);

  //创建用户会话关联信息
  await updateSessionInfo(founder.appId, newSession.id, [founder.refKey]);

  //处理邀请加入操作
  if (oldData.members && oldData.members.length > 0) {
    await _invite(app, newSession, oldData.members, founder);
  }

  return newSession.obj;
}

async function inviteFn(data) {
  data = _util.pick(data, ' refKey members sessionId appId');
  //基本数据校验
  if (!data.refKey) apiError.throw('refKey cannot be empty');
  if (!data.sessionId) apiError.throw('sessionId cannot be empty');
  if (!data.appId) apiError.throw('appId cannot be empty');
  if (!Array.isArray(data.members) || data.members.length < 1) apiError.throw('members cannot be empty');

  //校验当前用户信息
  let user = await userService.get(data.refKey, data.appId);
  if (!user) apiError.throw('this user does not exist');
  if (user.lock == 1) apiError.throw(1011);
  if (user.del == 1) apiError.throw(1012);

  //校验会话和邀请是否合规
  let app = await appService.get(user.appId);
  let session = await sessionModel.findOne({
    _id: data.sessionId,
    appId: data.appId,
    members: data.refKey
  }, 'maxMemberCount inviteStrategy owner admins freeze del lock name');
  if (!session) apiError.throw('session does not exist or user not in session');
  if (session.lock == 1) apiError.throw(1020);
  if (session.del == 1) apiError.throw(1021);
  if (session.freeze == 1) apiError.throw(1022);
  if (session.inviteStrategy != 1 && data.refKey != session.owner && !session.admins.include(data.refKey)) {
    apiError.throw(1023);
  }

  await _invite(app, session, data.members, user);

  return session.obj;
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
    from: user.refKey,
    content: user.nickname + ' 邀请 ' + userNicknames.join('、') + '加入聊天',
    type: 5,
    fromSys: 1,
    updatedAt: new Date()
  }

  //更新会话信息包括成员列表
  let newSession = await sessionModel.findByIdAndUpdate(session.id, {
    $addToSet: { members: { $each: parseMembers } },
    $inc: { msgMaxCount: 1 },
    $set: {
      latestMessage: newMsg
    }
  }, { new: true });
  newMsg.msgId = newSession.msgMaxCount;
  //根据最新的members字段，更新private字段,同时检查如果没有name，则根据members更新name
  if (newSession.members.length > 2) {
    if (!newSession.name) {
      let otherNicknameList = [];
      for (let i = 0; i < 5; i++) {
        let otherId = newSession.members[i];
        if (!otherId) break;
        let other = await userService.get(otherId, app.id);
        otherNicknameList.push(other.nickname);
      }
      await sessionModel.findByIdAndUpdate(newSession.id, { private: 0, name: otherNicknameList.join('、') });
    } else if (newSession.private == 1) {
      await sessionModel.findByIdAndUpdate(newSession.id, { private: 0 });
    }
  }

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
    let user = await userService.get(memberId, appId);
    if (!user) apiError.throw('member id:' + memberId + ' does not exist');
    if (user.appId != appId) apiError.throw('user:' + memberId + ' appId:' + appId + ' does not exist');
    userNicknames.push(user.nickname);

    await sessionInfoModel.update({
      sessionId: sessionId,
      refKey: memberId,
      appId: appId
    }, {
        sessionId: sessionId,
        refKey: memberId,
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
