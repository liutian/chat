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

//更新会话信息
exports.update = updateFn;

//更新用户自己相关的会话信息
exports.updateSessionInfo = updateSessionInfoFn;

//************************************************************ */

async function updateSessionInfoFn(data) {
  let oldData = data;
  //基本数据校验
  if (!data.refKey) apiError.throw('refKey cannot be empty');
  if (!data.appId) apiError.throw('appId cannot be empty');
  if (!data.sessionId) apiError.throw('sessionId cannot be empty');
  data = _util.pick(data, 'nickName background stick quiet');

  if (oldData.remark) {
    let session = await sessionModel.findById(oldData.sessionId, 'private privateKey');
    if (!session) apiError.throw('session cannot find');
    if (!session.privateKey || session.private != 1 || !session.privateKey.include(oldData.refKey)) {
      apiError.throw('you are not session member');
    }
    let otherId = session.privateKey.split('-').find(v => v != oldData.refKey);
    await sessionInfoModel.findOneAndUpdate({
      sessionId: oldData.sessionId,
      appId: oldData.appId,
      refKey: otherId
    }, { remark: oldData.remark }, { runValidators: true });

    if (Object.keys(oldData).length == 1) return;
  }

  if (oldData.remove == 1) data.clearDate = new Date();
  await sessionInfoModel.findByIdAndUpdate({
    sessionId: oldData.sessionId,
    appId: oldData.appId,
    refKey: oldData.refKey
  }, data, { runValidators: true });

}

async function updateFn(data) {
  let oldData = data;
  //基本数据校验
  if (!data.refKey) apiError.throw('refKey cannot be empty');
  if (!data.appId) apiError.throw('appId cannot be empty');
  if (!data.sessionId) apiError.throw('sessionId cannot be empty');
  data = _util.pick(data, ` name des hideNickname avator anonymously
  joinStrategy inviteStrategy  maxMemberCount owner admins freeze
  mute lock del joinQuestion joinAnswer`);

  let app = await appService.get(data.appId);
  if (!app) apiError.throw('app cannot find');

  //校验是否合法的会话成员
  let isMember = await sessionInfoModel.count({
    sessionId: oldData.sessionId,
    appId: oldData.appId,
    refKey: oldData.refKey,
    outside: 0
  });
  if (isMember < 1) apiError.throw('you are not session member');

  let session = await sessionModel.findById(oldData.sessionId, 'admins owner');
  if (!session) apiError.throw('session cannot find');
  if (session.appId != oldData.appId) apiError.throw(`session cannot find in appId:${oldData.appId}`);
  //校验当前用户是否有管理权限
  if (session.owner != oldData.refKey && !session.admins.include(oldData.refKey)) apiError.throw('you are not session admin');

  //只有会话所有者才可以移交会话所有人，新增/删除管理员，解散/锁定会话
  if ((data.owner || data.admins || data.del == 1 || data.lock == 1)
    && data.owner != oldData.refKey) apiError.throw('you are not owner');

  data.updateDate = new Date();
  await sessionModel.findByIdAndUpdate(oldData.sessionId, data, { runValidators: true });

  //后续操作
  if (oldData.changeNotice == 1) {
    await createSysMsg(data, {
      sessionId: oldData.sessionId,
      appId: oldData.appId,
      from: oldData.refKey,
      fromSys: 1,
      apnsName: app.apnsName
    }, {
        room: oldData.sessionId,
        pushAuth: app.pushAuth,
        apnsName: app.apnsName,
        leaveMessage: 1
      });
  }
}

async function detailFn(data) {
  //基本数据校验
  if (!data.refKey) apiError.throw('refKey cannot be empty');
  if (!data.appId) apiError.throw('appId cannot be empty');
  if (!data.sessionId) apiError.throw('sessionId cannot be empty');

  //sessionInfo集合数据只有在用户主动删除会话时才取消关联，如果是被踢出去时，还是能查看会话信息，但是不能查看会话成员信息，和公告
  let sessionInfo = await sessionInfoModel.findOne({
    sessionId: data.sessionId,
    refKey: data.refKey,
    appId: data.appId
  }, 'startMsgId endMsgId nickname background joinDate speakDate stick quiet clearDate outside');
  if (!sessionInfo) apiError.throw('sessionInfo cannot find');
  let session = await sessionModel.findById(data.sessionId, 'notice[0] -latestMessage');
  if (!session) apiError.throw('session cannot find');
  let returnSession = Object.assign(session.obj, sessionInfo.obj);
  returnSession.id = session.id;//防止ID被覆盖

  return returnSession;
}

//排序没有多大作用,不需要分页
async function listFn(data) {
  //基本数据校验
  if (!data.refKey) apiError.throw('refKey cannot be empty');
  if (!data.appId) apiError.throw('appId cannot be empty');

  //每次都查出来所有关联的会话，然后在进行筛选
  let query = { refKey: data.refKey, appId: data.appId };
  let sessionInfoList = await sessionInfoModel.find(query, 'sessionId stick quiet clearDate outside');
  let sessionInfoMap = {};
  sessionInfoList.forEach((value, index) => sessionInfoMap[value.sessionId] = value.obj);
  let sessionList = await sessionModel.find({
    _id: { $in: Object.keys(sessionInfoMap) }
  }, '-notice -des -joinQuestion -joinAnswer').sort('-latestMessage.createdAt');

  let stickSession = [];
  let noStickSession = [];
  for (let i = 0; i < sessionList.length; i++) {
    let session = sessionList[i].obj;
    Object.assign(session, _util.pick(sessionInfoMap[session.id], '-sessionId'));

    //默认只查询会话中最新消息时间比clearDate大的会话
    if (data.searchAll != 1 && session.clearDate && session.latestMessage && session.latestMessage.createdAt
      && session.latestMessage.createdAt.getTime() <= session.clearDate.getTime()) continue;

    if (session.private == 1 && session.privateKey && !session.name) {
      let otherId = session.privateKey.split('-').find(v => v == data.refKey);
      if (otherId) {
        let other = await userService.get(otherId, data.appId);
        session.name = other.nickname;
      } else {
        session.name = '未知';
      }
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
  let pickList = 'type name avator anonymously joinStrategy inviteStrategy founder appId des maxMemberCount mute freeze category hideNickname';
  let oldData = data;
  data = _util.pick(data, pickList);

  //基本数据校验
  // if (!data.name) apiError.throw('name cannot be empty');
  if (!data.founder) apiError.throw('founder cannot be empty');
  if (!data.appId) apiError.throw('appId cannot be empty');
  //校验会话创建者***************可选操作
  let founder = await userService.get(data.founder, data.appId);
  if (!founder) apiError.throw('founder does not exist');
  if (founder.lock == 1) apiError.throw(1011);
  if (founder.del == 1) apiError.throw(1012);
  //校验app***************可选操作
  let app = await appService.get(data.appId);
  if (!app) apiError.throw('app does not exist');
  if (app.lock == 1) apiError.throw(1026);
  if (app.del == 1) apiError.throw(1027);


  let privateSession = Array.isArray(data.members) && data.members.length == 1
    && data.members[0].type == 'U' && data.members[0].id != data.founder;
  //检查如果存在当前用户和members[0]在一个会话，而且该会话只有这两个人则直接返回该会话
  if (privateSession) {
    let otherId = data.members[0].id;
    let privateKey = data.founder >= otherId ? data.founder + '-' + otherId : otherId + '-' + data.founder;
    let _session = await sessionModel.findOne({
      appId: data.appId,
      private: 1,
      privateKey: privateKey
    }, '_id');
    //如果存在私聊会话则直接返回会话信息
    if (_session) {
      return _session.obj;
    }
  }

  //校验创建会话是否合规,单个用户同时拥有的会话总数是有限的
  let sessionCount = await sessionModel.count({ owner: data.founder, appId: data.appId });
  if (sessionCount > app.maxSessionCount) apiError.throw('this user:' + data.founder + ' create too much session');

  //初始化数据
  data.appId = data.appId;
  data.owner = data.founder;
  data.admins = [data.founder];//默认创建时只有一个管理员
  data.letterName = data.name && letter(data.name)[0];

  //存储会话
  let newSession = await sessionModel.create(data);

  //创建用户会话关联信息
  await updateSessionInfo(data.appId, newSession, [data.founder]);

  //处理邀请加入操作
  if (oldData.members && oldData.members.length > 0) {
    await _invite(app, newSession, oldData.members, founder);
  }

  return newSession.obj;
}

async function inviteFn(data) {
  data = _util.pick(data, ' refKey members sessionId appId backView');
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
  //校验app***************可选操作
  let app = await appService.get(data.appId);
  if (!app) apiError.throw('app does not exist');
  if (app.lock == 1) apiError.throw(1026);
  if (app.del == 1) apiError.throw(1027);

  //校验会话和邀请是否合规
  let session = await sessionModel.findOne({
    _id: data.sessionId,
    appId: data.appId,
    members: data.refKey
  }, 'maxMemberCount inviteStrategy owner admins freeze del lock name msgMaxCount');
  if (!session) apiError.throw('session does not exist or user not in session');
  if (session.lock == 1) apiError.throw(1020);
  if (session.del == 1) apiError.throw(1021);
  //冻结状态只有所有者才能邀请
  if (session.freeze == 1 && data.refKey != session.owner) apiError.throw(1022);
  //inviteStrategy == 2 只有管理员才能邀请
  if (session.inviteStrategy == 2 && data.refKey != session.owner && !session.admins.include(data.refKey)) {
    apiError.throw(1023);
  }

  await _invite(app, session, data.members, user, data.backView);

  return session.obj;
}

//邀请加入会话不验证与现有会话中的成员是否重复，交由数据库去重
//不对邀请本身进行校验，交由调用方校验
async function _invite(app, session, members, user, backView) {
  //解析members
  let maxMemberCount = Math.min(session.maxMemberCount, app.maxMemberCount);
  let parseMembers = await parseMembersFn(members, maxMemberCount);
  if (parseMembers.length < 1) apiError.throw('parseMembers at least one');

  //判断成员数是否超标
  let memberCount = await sessionInfoModel.count({
    appId: app.id,
    sessionId: session.id,
    outside: 0
  });
  if (memberCount + parseMembers.length > maxMemberCount) {
    apiError.throw('session members > session maxMemberCount');
  }
  //更新用户会话关联信息
  let userNicknames = await updateSessionInfo(app.id, session, parseMembers, backView);

  //更新private字段,同时检查如果没有name，则根据members更新name
  let sessionInfoList = await sessionInfoModel.find({
    appId: app.id,
    sessionId: session.id,
    outside: 0
  }, 'refKey nickname').limit(5);
  if (sessionInfoList.length > 2) {
    if (!newSession.name) {
      let otherNicknameList = [];
      for (let i = 0; i < sessionInfoList.length; i++) {
        let sessionInfo = sessionInfoList[i];
        if (sessionInfo.nickname) {
          otherNicknameList.push(other.nickname);
        } else {
          let other = await userService.get(sessionInfo.refKey, app.id);
          otherNicknameList.push(other.nickname);
        }
      }
      await sessionModel.findByIdAndUpdate(newSession.id, {
        private: 0,
        name: otherNicknameList.join('、')
      }, { runValidators: true });
    } else if (newSession.private == 1) {
      await sessionModel.findByIdAndUpdate(newSession.id, { private: 0, runValidators: true });
    }
  } else if (sessionInfoList.length == 2) {
    let privateKey = sessionInfoList[0].refKey + '-' + sessionInfoList[1].refKey;
    if (sessionInfoList[1].refKey > sessionInfoList[0].refKey) {
      sessionInfoList[1].refKey + '-' + sessionInfoList[0].refKey;
    }
    await sessionModel.findByIdAndUpdate(newSession.id, { private: 1, privateKey: privateKey }, { runValidators: true });
  }

  //初始化新消息
  let message = {
    sessionId: session.id,
    appId: app.id,
    from: user.refKey,
    content: ' 邀请 ' + userNicknames.join('、') + '加入聊天',
    type: 5,
    fromSys: 1,
    apnsName: app.apnsName,
    createdAt: new Date()
  }
  //生成系统消息
  let newMessage = await messageService.storeMessage(message, {
    room: session.id,
    pushData: message,
    pushAuth: app.pushAuth,
    apnsName: app.apnsName,
    leaveMessage: 1
  });


}

async function updateSessionInfo(appId, session, members, backView) {
  let userNicknames = [];
  for (let i = 0; i < members.length; i++) {
    let memberId = members[i];
    let user = await userService.get(memberId, appId);
    if (!user) apiError.throw('member id:' + memberId + ' does not exist');
    if (user.appId != appId) apiError.throw('user:' + memberId + ' appId:' + appId + ' does not exist');
    userNicknames.push(user.nickname);

    let updater = {
      del: 0,
      joinDate: new Date(),
      clearDate: null,
      stick: 0,
      outside: 0
    };
    if (backView == 1) {
      updater.startMsgId = session.msgMaxCount + 1;
    }
    await sessionInfoModel.update({
      sessionId: session.id,
      refKey: memberId,
      appId: appId
    }, updater, { upsert: true });
  }

  return userNicknames;
}

//如果type 为 S 不在校验会话本身是否有效(lock,del,appId)
//该方法主要是过滤重复的用户，以及解析会话中的成员，并进行合并
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
      let sessionInfoList = await sessionInfoModel.find({
        sessionId: member.id,
        outside: 0
      }, 'refKey');

      for (let i = 0; i < sessionInfoList.length; i++) {
        let memberId = sessionInfoList[i].refKey;
        if (newMembers.indexOf(memberId) == -1) {
          if (newMembers.length >= maxMemberCount) apiError.throw(1017);
          newMembers.push(memberId);
        }
      }
    }
  }

  return newMembers;
}

async function createSysMsg(data, msg, pushObj) {
  if (util.isString(data.name)) {
    msg.type = 3;
    pushObj.pushData = msg;
    msg.createdAt = new Date();
    await messageService.storeMessage(msg, pushObj);
  }

  if (util.isString(data.des)) {
    msg.type = 13;
    pushObj.pushData = msg;
    msg.createdAt = new Date();
    await messageService.storeMessage(msg, pushObj);
  }

  if (util.isNumber(data.freeze)) {
    msg.type = 8;
    pushObj.pushData = msg;
    msg.createdAt = new Date();
    await messageService.storeMessage(msg, pushObj);
  }

  if (util.isNumber(data.mute)) {
    msg.type = 9;
    pushObj.pushData = msg;
    msg.createdAt = new Date();
    await messageService.storeMessage(msg, pushObj);
  }

  if (util.isNumber(data.lock)) {
    msg.type = 10;
    pushObj.pushData = msg;
    msg.createdAt = new Date();
    await messageService.storeMessage(msg, pushObj);
  }

  if (util.isNumber(data.del)) {
    msg.type = 14;
    pushObj.pushData = msg;
    msg.createdAt = new Date();
    await messageService.storeMessage(msg, pushObj);
  }

  if (util.isString(data.owner)) {
    msg.type = 11;
    pushObj.pushData = msg;
    msg.createdAt = new Date();
    await messageService.storeMessage(msg, pushObj);
  }

}
