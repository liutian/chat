const sessionInfoModel = require('mongoose').model('sessionInfo');
const messageModal = require('mongoose').model('message');
const sessionModel = require('mongoose').model('session');
const userModel = require('mongoose').model('user');
const util = require('util');
const request = require('request');

const apiError = require('../util/api-error');
const _util = require('../util/util');
const appService = require('./app-service');
const messageService = require('./message-service');
const userService = require('./user-service');
const letter = require('../util/letter');
const pushService = require('./push-service');
const config = require('../config');
const logger = require('log4js').getLogger('session-service');


//创建会话,members字段可以为空
exports.create = createFn;

//进入会话
exports.enter = enterFn;

//退出会话或从会话中踢出
exports.exit = exitFn;

//查询用户自己的会话列表
exports.listHistory = listHistoryFn;

//查询单个会话的详细信息
exports.detail = detailFn;

//更新会话信息
exports.update = updateFn;

//更新用户自己相关的会话信息
exports.updateSessionInfo = updateSessionInfoFn;

//查询app下所有会话
exports.list = listFn;

//创建私密会话key
exports.createSecretKey = createSecretKeyFn;

//查询会话下的成员列表
exports.memberList = memberListFn;

//查询关于我的会话
exports.listAboutMe = listAboutMeFn;

//************************************************************ */

async function exitFn(data) {
  data = _util.pick(data, ' refKey appId members sessionId ');
  //基本数据校验
  if (!data.refKey) apiError.throw('refKey cannot be empty');
  if (!data.appId) apiError.throw('appId cannot be empty');

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

  let sessionInfo = await sessionInfoModel.find({
    appId: data.appId,
    sessionId: data.sessionId,
    refKey: data.refKey,
    outside: 0
  });
  if (!sessionInfo) apiError.throw('you are not session member');
  let session = await sessionModel.findById(data.sessionId, '-latestMessage');
  if (!session) apiError.throw('session cannot find');
  if (session.lock == 1) apiError.throw(1020);

  if (!data.members || data.members.length <= 0) {
    if (data.refKey == session.owner) apiError.throw('you are owner cannot exit session');
    await _exit([data.refKey], session, app, user);
  } else if (!session.admins.includes(data.refKey) && session.owner != data.refKey) {
    //只有管理员才可以踢出他人
    apiError.throw('you are not session admin or owner');
  } else {
    await _exit(data.members, session, app, user);
  }
}

async function _exit(members, session, app, user) {
  members.forEach(function (m) {
    if (session.admins.includes(m) || session.owner == m) {
      apiError.throw('admin cannot be kicked out');
    }
  });

  let memberList = await userModel.find({
    refKey: { $in: members },
    appId: app.id
  }, 'nickname');
  if (memberList.length <= 0) return;

  let updater = { outside: 1, endMsgId: session.msgMaxCount };
  if (members.length == 1 && members[0] == user.refKey) {
    updater.clearDate = new Date();
  }
  await sessionInfoModel.update({
    appId: app.id,
    sessionId: session.id,
    refKey: { $in: members },
    outside: 0
  }, updater, { multi: true, runValidators: true });

  let memberCount = await sessionInfoModel.count({
    appId: app.id,
    sessionId: session.id,
    outside: 0
  });

  await sessionModel.findByIdAndUpdate(session.id, {
    memberCount: memberCount
  });


  let nicknameStr = memberList.map(v => v.nickname).join('、');
  let msgType = 7;
  if (members.length > 1) {
    nicknameStr += ' 被踢出会话';
  } else if (members.length == 1) {
    msgType = 6;
    nicknameStr += ' 退出会话'
  }

  //初始化新消息
  let message = {
    sessionId: session.id,
    appId: app.id,
    from: user.refKey,
    content: nicknameStr,
    type: msgType,
    fromSys: 1,
    apnsName: app.apnsName,
    leaveMessage: 1,
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

  try {
    _transferMember(app.pushAuth, members, session.id, 'leave');
  } catch (e) {
    logger.error(`exit session id:${session.id} fail for transferMember`);
  }
}

async function updateSessionInfoFn(data) {
  let oldData = data;
  //基本数据校验
  if (!data.refKey) apiError.throw('refKey cannot be empty');
  if (!data.appId) apiError.throw('appId cannot be empty');
  if (!data.sessionId) apiError.throw('sessionId cannot be empty');
  data = _util.pick(data, 'nickname background stick quiet otherRemark');

  if (oldData.clearMsg == 1) {
    let session = await sessionModel.findById(oldData.sessionId, 'msgMaxCount');
    data.startMsgId = session.msgMaxCount + 1;
  }

  if (oldData.remove == 1) data.clearDate = new Date();
  await sessionInfoModel.findOneAndUpdate({
    sessionId: oldData.sessionId,
    appId: oldData.appId,
    refKey: oldData.refKey
  }, data, { runValidators: true });

  if (_util.isNumber(data.quiet)) {
    let app = await appService.get(oldData.appId);
    let requestData = {
      room: 'user_' + oldData.refKey,
      pushAuth: app.pushAuth
    }
    if (data.quiet === 1) {
      requestData.add = [data.sessionId];
    } else {
      requestData.remove = [data.sessionId];
    }
    setApns(requestData);
  }

}

async function updateFn(data) {
  let oldData = data;
  //基本数据校验
  if (!data.refKey) apiError.throw('refKey cannot be empty');
  if (!data.appId) apiError.throw('appId cannot be empty');
  if (!data.sessionId) apiError.throw('sessionId cannot be empty');
  data = _util.pick(data, ` category publicSearch name avator anonymously
   joinStrategy inviteStrategy des maxMemberCount owner admins noAuditAdmin notice
   joinQuestion joinAnswer mute del lock`);

  let app = await appService.get(oldData.appId);
  if (!app) apiError.throw('app cannot find');

  //校验是否合法的会话成员
  let isMember = await sessionInfoModel.count({
    sessionId: oldData.sessionId,
    appId: oldData.appId,
    refKey: oldData.refKey,
    outside: 0
  });
  if (isMember < 1) apiError.throw('you are not session member');

  let session = await sessionModel.findById(oldData.sessionId, 'admins owner appId');
  if (!session) apiError.throw('session cannot find');
  if (session.appId != oldData.appId) apiError.throw(`session cannot find in appId:${oldData.appId}`);
  //校验当前用户是否有管理权限
  if (session.owner != oldData.refKey && !session.admins.includes(oldData.refKey)) {
    apiError.throw('you are not session admin');
  }

  //只有会话所有者才可以移交会话所有人，新增/删除管理员，解散/锁定会话
  if ((data.owner || data.admins || data.del == 1 || data.lock == 1
    || data.noAuditAdmin) && session.owner != oldData.refKey) {
    apiError.throw('you are not owner');
  }

  if (data.owner) {
    let isMember = await sessionInfoModel.count({
      sessionId: oldData.sessionId,
      appId: oldData.appId,
      refKey: data.owner,
      outside: 0
    });
    if (isMember <= 0) apiError.throw('owner cannot be session member');
  }

  if (Array.isArray(data.admins) && data.admins.length > 0) {
    let memberCount = await sessionInfoModel.count({
      sessionId: oldData.sessionId,
      appId: oldData.appId,
      refKey: { $in: data.admins },
      outside: 0
    });
    if (memberCount < data.admins.length) apiError.throw('admins cannot be session member');
  }

  if ((data.joinStrategy == 3 || data.joinStrategy == 4) && (!data.joinQuestion || !data.joinAnswer)) {
    apiError.throw('joinQuestion and joinAnswer cannot be empty');
  }

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
  let session = await sessionModel.findById(data.sessionId, '-latestMessage');
  if (!session) apiError.throw('session cannot find');
  let returnSession = Object.assign(session.obj, sessionInfo.obj);
  returnSession.id = session.id;//防止ID被覆盖

  return returnSession;
}

//排序没有多大作用,不需要分页
async function listHistoryFn(data) {
  //基本数据校验
  if (!data.refKey) apiError.throw('refKey cannot be empty');
  if (!data.appId) apiError.throw('appId cannot be empty');
  if (data.searchAll) data.searchAll = +data.searchAll;

  //每次都查出来所有关联的会话，然后在进行筛选
  let query = { refKey: data.refKey, appId: data.appId };
  let sessionInfoList = await sessionInfoModel.find(query);
  let sessionInfoMap = {};
  sessionInfoList.forEach((value, index) => sessionInfoMap[value.sessionId] = value.obj);
  let sessionList = await sessionModel.find({
    _id: { $in: Object.keys(sessionInfoMap) }
  }, '-notice -des -joinQuestion -joinAnswer').sort('-latestMessage.createdAt');

  let stickSession = [];
  let noStickSession = [];
  for (let i = 0; i < sessionList.length; i++) {
    let session = sessionList[i].obj;
    Object.assign(session, _util.pick(sessionInfoMap[session.id], '** -sessionId -id'));

    //默认只查询会话中最新消息时间比clearDate大的会话
    if (data.searchAll != 1 && session.clearDate && (!session.latestMessage || (session.latestMessage && session.latestMessage.createdAt
      && session.latestMessage.createdAt.getTime() <= session.clearDate.getTime()))) continue;

    if (session.secret == 1 && session.secretKey) {
      let other;
      let otherId = session.secretKey.split('::').find(v => v != data.refKey);

      if (otherId) {
        other = await userService.get(otherId, data.appId);
      }

      if (other) {
        session.avator = other.avator;
      }

      if (session.name) {
        //不做任何操作
      } else if (session.otherRemark) {
        session.name = session.otherRemark;
      } else if (other) {
        session.name = other.nickname;
      } else {
        session.name = '未知';
      }
    }

    if (session.secret != 1 && session.latestMessage && session.latestMessage.from) {
      let fromUser = await userService.get(session.latestMessage.from, data.appId);
      session.latestMessage.from = fromUser.obj;
    }

    if (session.latestMessage) {
      session.latestMessage.createdAt = _util.formatDate(session.latestMessage.createdAt);
      session.latestMessage.updatedAt = _util.formatDate(session.latestMessage.updatedAt);
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
  let pickList = '** -members -msgMaxCount -latestMessage -owner -admins -del -lock';
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
  heavyMembers(oldData.members);

  let secretSession = Array.isArray(oldData.members) && oldData.members.length == 1
    && oldData.members[0].type == 'U' && oldData.members[0].id != data.founder;
  if (secretSession) {
    let otherId = oldData.members[0].id;
    let secretKey = createSecretKeyFn(otherId, data.founder);

    //检查如果存在当前用户和members[0]在一个会话，而且该会话只有这两个人则直接返回该会话
    let _session = await sessionModel.findOne({
      appId: data.appId,
      secret: 1,
      secretKey: secretKey
    }, '-latestMessage');
    if (_session) {
      return _session.obj;
    }

    //如果secret为空则服务器自己判断
    if (!_util.isNumber(data.secret) || data.secret == 1) {
      data.secret = 1;
      data.secretKey = secretKey;
    } else {
      data.secret = 0;
    }
  } else {
    data.secret = 0;
  }

  //校验创建会话是否合规,单个用户同时拥有的会话总数是有限的
  let sessionCount = await sessionModel.count({ owner: data.founder, appId: data.appId });
  if (sessionCount > app.maxSessionCount) apiError.throw('this user:' + data.founder + ' create too much session');

  //初始化数据
  data.appId = data.appId;
  data.owner = data.founder;
  data.admins = [];//默认创建时只有一个管理员
  data.letterName = data.name && letter(data.name)[0];


  //存储会话
  let newSession = await sessionModel.create(data);

  //创建用户会话关联信息
  await updateSessionInfo(data.appId, newSession, [founder], 1);

  //处理邀请加入操作
  if (oldData.members && oldData.members.length > 0) {
    await _enter(app, newSession, oldData.members, founder, 1);
  }

  try {
    _transferMember(app.pushAuth, [founder.refKey], newSession.id, 'enter');
  } catch (e) {
    logger.error(`enter session id:${newSession.id} fail for transferMember -> founder`);
  }

  return newSession.obj;
}

function createSecretKeyFn(refKey1, refKey2) {
  if (refKey1 > refKey2) {
    return refKey1 + '::' + refKey2;
  } else {
    return refKey2 + '::' + refKey1;
  }
}

async function enterFn(data) {
  data = _util.pick(data, ' refKey appId members sessionId backView sysMsgId joinAnswer resolve rejectReason');
  //基本数据校验
  if (!data.refKey) apiError.throw('refKey cannot be empty');
  if (!data.appId) apiError.throw('appId cannot be empty');

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

  //有sessionId的情况说明，该操作是用户直接行为，比如用户自己加入会话，或者邀请其他人加入会后
  if (data.sessionId) {
    //校验会话和邀请是否合规
    let session = await sessionModel.findOne({
      _id: data.sessionId,
      appId: data.appId
    }, '-latestMessage -joinQuestion');
    if (!session) apiError.throw('session cannot find');
    if (session.lock == 1) apiError.throw(1020);
    if (session.del == 1) apiError.throw(1021);

    let goOn = await directEnter(data, user, app, session);
    if (goOn) {
      await _enter(app, session, data.members, user, data.historyView);
    }
  } else if (data.sysMsgId) {//有sysMsgId说明，该操作是用户间接行为，比如用户同意别人邀请自己加入会话，管理员审核同意其他人加入会话
    let sysMsg = await messageModal.findById(data.sysMsgId);
    if (!sysMsg) apiError.throw('sysMsg cannot find');
    if (sysMsg.relevantStatus != 1) apiError.throw('this msg relevantStatus not eq 1');
    if (!sysMsg.content || !util.isString(sysMsg.content)) apiError.throw('sysMsg content cannot be empty');
    sysMsg = sysMsg.obj;
    sysMsg.content = JSON.parse(sysMsg.content);
    if (!sysMsg.content.fromRefKey) apiError.throw('sysMsg content.fromRefKey cannot find');
    let from = await userService.get(sysMsg.content.fromRefKey, data.appId);
    if (!from) apiError.throw('sysMsg from cannot find');

    //校验会话和邀请是否合规
    let session = await sessionModel.findOne({
      _id: sysMsg.relevantSessionId,
      appId: data.appId
    }, '-latestMessage -joinQuestion');
    if (!session) apiError.throw('session cannot find');
    if (session.lock == 1) apiError.throw(1020);
    if (session.del == 1) apiError.throw(1021);

    let goOn = await indirectEnter(data, app, from, sysMsg, session);
    if (goOn) {
      await _enter(app, session, data.members, from, data.historyView);
    }

    await messageModal.findByIdAndUpdate(sysMsg.id, {
      relevantStatus: data.resolve == 1 ? 2 : 3,
      relevantStatusUpdater: from.refKey
    });
  } else {
    apiError.throw('sessionId and sysMsgId cannot be empty');
  }

}

async function indirectEnter(data, app, from, sysMsg, session) {
  //该消息必须是来自系统会话中的消息
  if (sysMsg.fromSys != 1) apiError.throw('sysMsgId not from system');

  if (sysMsg.type != 15 && sysMsg.type != 16 && sysMsg.type != 17) {
    apiError.throw('sysMsg type illegal');
  }
  //type == 15 的操作人必须是消息内content.refKey
  if (sysMsg.type == 15 && sysMsg.content.refKey != data.refKey) {
    apiError.throw(`you are refKey:${sysMsg.content.refKey}`);
  }
  if ((sysMsg.type == 16 || sysMsg.type == 17) && !session.admins.includes(data.refKey) && session.owner != data.refKey) {
    apiError.throw('you are not admin');
  }

  //更新其他管理员这类消息的状态
  if (sysMsg.type == 16 || sysMsg.type == 17) {
    await messageModal.update({
      relevantSessionId: sysMsg.relevantSessionId,
      relevantToken: sysMsg.relevantToken
    }, {
        relevantStatus: data.resolve == 1 ? 2 : 3,
        relevantStatusUpdater: from.refKey
      }, { multi: true });
  }

  if (data.resolve == 1) {
    data.members = [{
      type: 'U',
      id: sysMsg.content.refKey,
      ignoreAgree: sysMsg.type == 17 || sysMsg.type == 15//用户同意加入或者自己主动加入，让管理员审核时通过时才可以直接加入不需要判断joinSessionAgree
    }];
    return true;
  }

  //生成拒绝消息
  let message = {
    appId: data.appId,
    from: app.simUser,
    content: JSON.stringify({
      rejectReason: data.rejectReason,
      fromRefKey: from.refKey,
      refKey: sysMsg.content.refKey
    }),
    fromSys: 1,
    apnsName: app.apnsName,
    leaveMessage: 1,
    createdAt: new Date()
  }

  let user = await userService.get(sysMsg.content.fromRefKey, data.appId);
  if (!user) apiError.throw(`user cannot find (refKey:${sysMsg.content.fromRefKey})`);
  message.sessionId = user.sysSessionId;
  if (sysMsg.type == 15) {
    message.type = 18;
    //生成系统消息
    let newMessage = await messageService.storeMessage(message, {
      room: user.sysSessionId,
      pushData: message,
      pushAuth: app.pushAuth,
      apnsName: app.apnsName,
      leaveMessage: 1
    });
  } else if (sysMsg.type == 16) {
    message.type = 19;
    //生成系统消息
    let newMessage = await messageService.storeMessage(message, {
      room: user.sysSessionId,
      pushData: message,
      pushAuth: app.pushAuth,
      apnsName: app.apnsName,
      leaveMessage: 1
    });
  } else if (sysMsg.type == 17) {
    message.type = 20;
    //生成系统消息
    let newMessage = await messageService.storeMessage(message, {
      room: user.sysSessionId,
      pushData: message,
      pushAuth: app.pushAuth,
      apnsName: app.apnsName,
      leaveMessage: 1
    });
  }
  return false;
}

async function directEnter(data, currUser, app, session) {
  let relevantRandom = await _util.random(5);
  let message = {
    appId: data.appId,
    from: app.simUser,
    fromSys: 1,
    apnsName: app.apnsName,
    leaveMessage: 1,
    createdAt: new Date(),
    relevantSessionId: data.sessionId,
    relevantToken: Date.now() + '' + relevantRandom
  }

  //邀请他人加入
  if (Array.isArray(data.members) && data.members.length > 0) {
    let isAdmin = data.refKey == session.owner || session.admins.includes(data.refKey);

    //只检验普通用户的邀请,管理员邀请不需要校验是否需要审核直接通过
    if (isAdmin) return true;

    if (data.members.length > 1) {//只有管理权限的人可以一次邀请多个人
      apiError.throw('you invite more than one at a time');
    }

    if (session.inviteStrategy == 2 || (session.inviteStrategy == 3 && session.memberCount > 100)) {
      //生成邀请审核消息
      let auditAdmin = Array.isArray(session.admins) ? session.admins : [];
      auditAdmin = auditAdmin.concat(session.owner).filter(v => !session.noAuditAdmin.includes(v));
      for (let i = 0; i < auditAdmin.length; i++) {
        let adminRefKey = auditAdmin[i];
        let admin = await userService.get(adminRefKey, data.appId);
        if (!admin) apiError.throw(`session admin (refKey:${adminRefKey}) cannot find`);
        message.sessionId = admin.sysSessionId;
        message.type = 16;
        message.content = JSON.stringify({ refKey: data.members[0].id, fromRefKey: currUser.refKey });
        //生成系统消息
        let newMessage = await messageService.storeMessage(message, {
          room: admin.sysSessionId,
          pushData: message,
          pushAuth: app.pushAuth,
          apnsName: app.apnsName,
          leaveMessage: 1
        });
      }

      return false;
    }
  } else {//自己加入
    if (session.joinStrategy == 2 || (session.joinStrategy == 4 && session.joinAnswer == data.joinAnswer)) {
      //生成审核消息
      let auditAdmin = Array.isArray(session.admins) ? session.admins : [];
      auditAdmin = auditAdmin.concat(session.owner).filter(v => !session.noAuditAdmin.includes(v));
      for (let i = 0; i < auditAdmin.length; i++) {
        let adminRefKey = auditAdmin[i];
        let admin = await userService.get(adminRefKey, data.appId);
        if (!admin) apiError.throw(`session admin (refKey:${adminRefKey}) cannot find`);
        message.content = JSON.stringify({ refKey: currUser.refKey, fromRefKey: currUser.refKey });
        message.sessionId = admin.sysSessionId;
        message.type = 17;
        //生成系统消息
        let newMessage = await messageService.storeMessage(message, {
          room: admin.sysSessionId,
          pushData: message,
          pushAuth: app.pushAuth,
          apnsName: app.apnsName,
          leaveMessage: 1
        });
      }
      return false;
    } else if (session.joinStrategy == 3 && session.joinAnswer != data.joinAnswer) {
      apiError.throw(1029);
    } else if (session.joinStrategy == 4 && session.joinAnswer != data.joinAnswer) {
      apiError.throw(1029);
    } else if (session.joinStrategy == 5) {
      apiError.throw(1028);
    }
    data.members = [{ type: 'U', id: currUser.refKey, ignoreAgree: true }];
  }

  return true;
}

//加入会话不验证与现有会话中的成员是否重复，交由数据库去重
//不对邀请本身进行校验，交由调用方校验
//该方法可能被调用的情况：创建会话时邀请加入会话，会话为自由加入时用户加入会话，
//会话为需要回答问题时用户回答正确问题，管理员邀请加入会话，
//普通用户邀请其他人加入并且会话为无需审核直接邀请,
//普通用户邀请其他人加入并且会话成员数没有达到一定数量
//用户同意别人邀请，管理员同意用户加入，
async function _enter(app, session, members, from, historyView) {
  //解析members
  let maxMemberCount = Math.min(session.maxMemberCount, app.maxMemberCount);
  let parseMembers = await parseMembersFn(members, 100);//一次最多新增100个成员
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

  //过滤需要同意才能加入会话的用户
  let noAgreeMembers = await inviteAgree(app, from, parseMembers, session);

  if (noAgreeMembers.length <= 0) return;

  //更新用户会话关联信息
  let updateCount = await updateSessionInfo(app.id, session, noAgreeMembers, historyView);
  if (updateCount <= 0) {//没有直接的成员变动不需要再执行下去
    return;
  }

  //更新会话信息
  updateSessionForMemberChange(app, session);

  let nicknameStr = noAgreeMembers.map(v => v.nickname).join('、');
  let prefix = '';
  let msgType = 4;
  if (noAgreeMembers.length > 1 || noAgreeMembers[0].refKey != from.refKey) {
    prefix = from.nickname + ' 邀请 ';
    msgType = 5;
  }
  //初始化新消息
  let message = {
    sessionId: session.id,
    appId: app.id,
    from: from.refKey,
    content: prefix + nicknameStr + ' 加入聊天',
    type: msgType,
    fromSys: 1,
    apnsName: app.apnsName,
    leaveMessage: 1,
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

  try {
    _transferMember(app.pushAuth, noAgreeMembers.map(v => v.refKey), session.id, 'enter');
  } catch (e) {
    logger.error(`enter session id:${session.id} fail for transferMember `);
  }
}

async function updateSessionForMemberChange(app, session) {
  let memberCount = await sessionInfoModel.count({
    appId: app.id,
    sessionId: session.id,
    outside: 0
  });

  if (!session.name && session.secret != 1) {
    let sessionInfoList = await sessionInfoModel.find({
      appId: app.id,
      sessionId: session.id,
      outside: 0
    }, 'refKey nickname').limit(5);

    let otherNicknameList = [];
    for (let i = 0; i < sessionInfoList.length; i++) {
      let sessionInfo = sessionInfoList[i];
      if (sessionInfo.nickname) {//尽量用会话中的昵称
        otherNicknameList.push(other.nickname);
      } else {
        let other = await userService.get(sessionInfo.refKey, app.id);
        otherNicknameList.push(other.nickname);
      }
    }
    await sessionModel.findByIdAndUpdate(session.id, {
      name: otherNicknameList.join('、').substr(0, 100),
      memberCount: memberCount
    }, { runValidators: true });
  } else {
    await sessionModel.findByIdAndUpdate(session.id, {
      memberCount: memberCount
    }, { runValidators: true });
  }
}

//查看每一个成员信息，判断是否需要邀请通知
async function inviteAgree(app, from, members, session) {
  let noAgreeMembers = [];
  for (let i = 0; i < members.length; i++) {
    let member = members[i];

    let user = await userService.get(member.id, app.id);
    if (!user) apiError.throw(`user(refKey:${member.id}) cannot find`);

    if (member.ignoreAgree) {
      noAgreeMembers.push(user);
      continue;
    }

    if (user.joinSessionAgree == 1 && member.id != from.refKey) {
      //发送是否同意的通知消息
      //初始化新消息
      let message = {
        sessionId: user.sysSessionId,
        appId: app.id,
        from: app.simUser,
        content: JSON.stringify({ refKey: member.id, fromRefKey: from.refKey }),
        type: 15,
        fromSys: 1,
        apnsName: app.apnsName,
        leaveMessage: 1,
        createdAt: new Date(),
        relevantSessionId: session.id
      }
      //生成系统消息
      let newMessage = await messageService.storeMessage(message, {
        room: user.sysSessionId,
        pushData: message,
        pushAuth: app.pushAuth,
        apnsName: app.apnsName,
        leaveMessage: 1
      });
    } else {
      noAgreeMembers.push(user);
    }
  }
  return noAgreeMembers;
}

async function updateSessionInfo(appId, session, members, historyView) {
  let updateCount = 0;
  for (let i = 0; i < members.length; i++) {
    let user = members[i];

    let isMember = await sessionInfoModel.count({
      sessionId: session.id,
      refKey: user.refKey,
      appId: appId,
      outside: 0
    });

    if (isMember >= 1) {
      continue;
    } else {
      updateCount += 1;
    }

    let updater = {
      joinDate: new Date(),
      clearDate: null,
      stick: 0,
      outside: 0,
      endMsgId: null,
      secret: session.secret
    };
    //historyView = 1 可以查看加入会话之前的消息
    if (historyView !== 1) {
      updater.startMsgId = session.msgMaxCount + 1;
    }
    let up = await sessionInfoModel.update({
      sessionId: session.id,
      refKey: user.refKey,
      appId: appId
    }, updater, { upsert: true });
  }

  return updateCount;
}

//如果type 为 S 不在校验会话本身是否有效(lock,del,appId)
//该方法主要是过滤members中重复的用户，以及解析会话中的成员，并进行合并
async function parseMembersFn(members, maxMemberCount) {
  if (members.length > maxMemberCount) apiError.throw(1017);
  let newMembers = [];

  for (let i = 0; i < members.length; i++) {
    let member = members[i];
    if (!member.id) apiError.throw('member id cannot be empty');

    if (member.type == 'U') {
      if (!newMembers.includes(member.id)) {
        if (newMembers.length >= maxMemberCount) apiError.throw(1017);
        newMembers.push(member);
      }
    } else if (member.type == 'S') {
      let sessionInfoList = await sessionInfoModel.find({
        sessionId: member.id,
        outside: 0
      }, 'refKey');

      sessionInfoList.forEach(function (value) {
        if (!newMembers.includes(value.refKey)) {
          if (newMembers.length >= maxMemberCount) apiError.throw(1017);
          newMembers.push({ id: value.refKey });
        }
      })
    }
  }

  return newMembers;
}

async function createSysMsg(data, msg, pushObj) {
  msg.createdAt = new Date();
  msg.content = '修改会话信息';
  pushObj.pushData = msg;
  if (util.isString(data.name)) {
    msg.type = 3;
    await messageService.storeMessage(msg, pushObj);
  }

  if (util.isString(data.des)) {
    msg.type = 13;
    await messageService.storeMessage(msg, pushObj);
  }

  if (util.isNumber(data.mute)) {
    msg.type = 9;
    await messageService.storeMessage(msg, pushObj);
  }

  if (util.isNumber(data.lock)) {
    msg.type = 10;
    await messageService.storeMessage(msg, pushObj);
  }

  if (util.isNumber(data.del)) {
    msg.type = 14;
    await messageService.storeMessage(msg, pushObj);
  }

  if (util.isString(data.owner)) {
    msg.type = 11;
    await messageService.storeMessage(msg, pushObj);
  }

  if (util.isString(data.notice)) {
    msg.type = 12;
    await messageService.storeMessage(msg, pushObj);
  }

}

async function listFn(data) {
  let oldData = data;
  data = _util.pick(data, 'appId type category publicSearch secret name joinStrategy inviteStrategy founder owner mute del lock');
  if (!oldData.appId) apiError.throw('appId cannot be empty');
  data.type && (data.type = +data.type);
  data.category && (data.category = +data.category);
  data.publicSearch && (data.publicSearch = +data.publicSearch);
  data.secret && (data.secret = +data.secret);
  data.joinStrategy && (data.joinStrategy = +data.joinStrategy);
  data.inviteStrategy && (data.inviteStrategy = +data.inviteStrategy);
  data.mute && (data.mute = +data.mute);
  data.del && (data.del = +data.del);
  data.lock && (data.lock = +data.lock);

  let limit = +oldData.pageSize || 10;
  let skip = ((+oldData.page || 1) - 1) * limit;
  if (data.name) data.name = new RegExp(data.name, 'i');
  if (oldData.admin) data.admins = +oldData.admin;
  // data.publicSearch = 1;
  let sessionList = await sessionModel.find(data).limit(limit).skip(skip);

  let returnList = sessionList.map(v => v.obj);

  if (+oldData.searchCount == 1) {
    let searchCount = await sessionModel.count(data);
    returnList.push(searchCount);
  }

  return returnList;
}


async function memberListFn(data) {
  if (!data.appId) apiError.throw('appId cannot be empty');
  if (!data.sessionId) apiError.throw('sessionId cannot be empty');
  if (!data.refKey) apiError.throw('refKey cannot be empty');

  let isMember = await sessionInfoModel.count({
    sessionId: data.sessionId,
    appId: data.appId,
    outside: 0,
    refKey: data.refKey
  });
  if (isMember <= 0) apiError.throw('you are not session member');

  let limit = +data.pageSize || 10;
  let skip = ((+data.page || 1) - 1) * limit;
  let sessionInfoList = await sessionInfoModel.find({
    sessionId: data.sessionId,
    appId: data.appId,
    outside: 0
  }, 'refKey nickname joinDate speakDate').limit(limit).skip(skip);

  let userList = await userModel.find({
    appId: data.appId,
    refKey: { $in: sessionInfoList.map(v => v.refKey) }
  });

  let sessionInfoMap = {};
  sessionInfoList.forEach(function (v) {
    sessionInfoMap[v.refKey] = v;
  });

  let returnList = userList.map(function (u) {
    let sessionInfo = sessionInfoMap[u.refKey];
    sessionInfo.sessionNickname = sessionInfo.nickname;
    Object.assign(u, _util.pick(sessionInfo, 'sessionNickname joinDate speakDate'));
    return u;
  });

  if (+data.searchCount == 1) {
    let searchCount = await sessionInfoModel.count({
      sessionId: data.sessionId,
      appId: data.appId,
      outside: 0
    });
    returnList.push(searchCount);
  }

  return returnList;
}

async function listAboutMeFn(data) {
  let oldData = data;
  data = _util.pick(data, 'refKey appId secret stick quiet');
  if (!data.refKey) apiError.throw('refKey cannot be empty');
  if (!data.appId) apiError.throw('appId cannot be empty');
  data.sessionType && (data.sessionType = +data.sessionType);
  data.secret && (data.secret = +data.secret);

  let limit = +oldData.pageSize || 10;
  let skip = ((+oldData.page || 1) - 1) * limit;
  data.outside = 0;
  let sessionInfoList = await sessionInfoModel.find(data).limit(limit).skip(skip);

  let sessionInfoMap = {};
  sessionInfoList.forEach((value, index) => sessionInfoMap[value.sessionId] = value.obj);

  let sessionList = await sessionModel.find({
    _id: { $in: Object.keys(sessionInfoMap) }
  }, '-notice -des -joinQuestion -joinAnswer').sort('-latestMessage.createdAt');

  let returnList = [];
  for (let i = 0; i < sessionList.length; i++) {
    let session = sessionList[i];
    Object.assign(session, _util.pick(sessionInfoMap[session.id], '** -sessionId -id'));

    if (session && session.secret == 1 && session.secretKey) {
      let other;
      let otherId = session.secretKey.split('::').find(v => v != data.refKey);

      if (otherId) {
        other = await userService.get(otherId, data.appId);
      }

      if (other) {
        session.avator = other.avator;
      }

      if (session.name) {
        //不做任何操作
      } else if (session.otherRemark) {
        session.name = session.otherRemark;
      } else if (other) {
        session.name = other.nickname;
      } else {
        session.name = '未知';
      }
    }

    returnList.push(session.obj);
  }

  if (+oldData.searchCount == 1) {
    let searchCount = await sessionInfoModel.count(data);
    returnList.push(searchCount);
  }

  return returnList;
}


function _transferMember(pushAuth, members, session, type) {
  if (!pushAuth || !members || members.length <= 0 || !session || !type) {
    apiError.throw('加入/踢人参数错误');
  }

  let options = {
    url: config.push_url + '/api/auth/transfer',
    method: 'post',
    headers: {
      Authorization: pushAuth
    },
    json: true
  };

  options.body = {
    sourceRooms: members.map(function (v) {
      return 'user_' + v;
    }),
    targetRoom: session,
    type: type
  };

  return new Promise(function (resolve, reject) {
    request(options, function (err, response, body) {
      if (err) {
        logger.error('transfer members error: ' + err);
        reject(err);
      } else if (response.statusCode == 200) {
        resolve();
      } else {
        let err = new Error('statusCode ' + response.statusCode);
        logger.error('transfer members :' + err);
        reject(err);
      }
    });
  })
}


function setApns(data) {
  let options = {
    url: config.push_url + '/api/auth/room-apns',
    method: 'post',
    headers: {
      Authorization: data.pushAuth
    },
    json: true
  };

  options.body = data;

  return new Promise(function (resolve, reject) {
    request(options, function (err, response, body) {
      if (err) {
        logger.error('set apns error: ' + err);
        reject(err);
      } else if (response.statusCode == 200) {
        resolve();
      } else {
        let err = new Error('statusCode ' + response.statusCode);
        logger.error('set apns error :' + err);
        reject(err);
      }
    });
  })
}

function heavyMembers(members) {
  if (!Array.isArray(members)) return;

  let userMap = {};
  let sessionMap = {};
  let oldMembers = members.concat();
  members.length = 0;

  oldMembers.forEach(function (v) {
    if (v.type == 'U' && !userMap[v.id]) {
      userMap[v.id] = v;
      members.push(v);
    } else if (v.type == 'S' && !sessionMap[v.id]) {
      sessionMap[v.id] = v;
      members.push(v);
    }
  });
}
