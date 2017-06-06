const mongoose = require('mongoose');
const logger = require('log4js').getLogger('user-service');

const redisConn = require('../util/redis-factory').getInstance(true);
const config = require('../config');
const util = require('../util/util');
const apiError = require('../util/api-error');
const letter = require('../util/letter');
const _util = require('../util/util');
const appService = require('./app-service');
const sessionService = require('./session-service');

const userModel = mongoose.model('user');
const sessionModel = mongoose.model('session');
const sessionInfoModel = mongoose.model('sessionInfo');
const refKeyReg = new RegExp('^\\w+$', 'i');

exports.createUser = createUserFn;
exports.updateUser = updateUserFn;
exports.auth = authFn;
exports.get = getFn;
exports.list = listFn;
exports.createSysSession = createSysSessionFn;


/*---------------------------------------- 分割线 ------------------------------------------------*/

async function createUserFn(data) {
  data = _util.pick(data || {}, userModel.schema.obj);
  //基本数据校验
  if (!data.refKey) apiError.throw('refKey cannot be empty');
  if (!data.nickname) apiError.throw('nickname cannot be empty');
  if (!data.appId) apiError.throw('appId cannot be empty');
  if (!refKeyReg.test(data.refKey)) apiError.throw('refKey Can only contain letters, Numbers, underscore');

  let app = await appService.get(data.appId);

  //判断用户唯一
  let userCount = await userModel.count({ refKey: data.refKey, appId: data.appId });
  if (userCount > 0) apiError.throw('user already exists');
  //存储数据
  data.letterNickname = letter(data.nickname)[0];
  let newUser = await userModel.create(data);
  //生成系统会话
  let newSysSession = await createSysSessionFn(data.appId, data.refKey, app.simUser);

  return newUser.obj;
}

async function createSysSessionFn(appId, refKey, simUser) {
  let privateKey = sessionService.createPrivateKey(refKey, simUser);

  //初始化数据
  let sysSession = {
    appId: appId,
    type: 2,
    name: '系统会话',
    publicSearch: 0,
    private: 1,
    privateKey: privateKey,
    owner: simUser,
    founder: simUser,
    admins: [simUser],
    memberCount: 2
  };
  sysSession.letterName = letter(sysSession.name)[0];

  //存储会话
  let newSession = await sessionModel.create(sysSession);
  //存储会话关联信息
  let sessionInfo = {
    sessionId: newSession.id,
    refKey: refKey,
    appId: appId,
    del: 0,
    joinDate: new Date(),
    clearDate: new Date(),
    stick: 0,
    outside: 0
  }

  await sessionInfoModel.create(sessionInfo);
  sessionInfo.refKey = simUser;
  await sessionInfoModel.create(sessionInfo);

  await userModel.findOneAndUpdate({
    appId: appId,
    refKey: refKey
  }, { sysSessionId: newSession.id });

  return newSession.obj;
}

async function updateUserFn(data) {
  data = _util.pick(data || {}, ' appId refKey nickname avator sex del lock blackLList des joinSessionAgree location');
  //基本数据校验
  if (!data.refKey || !data.appId) apiError.throw('refKey and appId cannot be empty');
  //校验用户是否存在
  let userCount = await userModel.count({ refKey: data.refKey, appId: data.appId });
  if (userCount < 1) apiError.throw('user not exists ');

  //更新数据到数据库
  if (data.nickname) {
    data.letterNickname = letter(data.nickname)[0];
  }
  let user = await userModel.findOneAndUpdate({
    refKey: data.refKey,
    appId: data.appId
  }, data, { new: true, runValidators: true });

  let returnObj = user.obj;

  await syncUserToRedis(returnObj);

  return returnObj;
}


async function authFn(refKey, appId, tokenExpiry) {
  if (!refKey) apiError.throw(1007);
  tokenExpiry = +tokenExpiry;
  //该出不读缓存，防止缓存数据有误造成不必要的后果
  let user = await userModel.findOne({ refKey: refKey, appId: appId }, 'appId sim refKey lock del');
  //用户信息校验
  if (!user) {
    apiError.throw('refKey invalid', 401);
  } else if (user.appId.toString() !== appId) {
    apiError.throw(1013, 401);
  } else if (user.lock === 1) {
    apiError.throw(1011, 401);
  } else if (user.del === 1) {
    apiError.throw(1012, 401);
  } else if (tokenExpiry && tokenExpiry <= 0) {
    apiError.throw('tokenExpiry must > 0 ');
  }

  //tokenExpiry
  tokenExpiry = Number.isInteger(tokenExpiry) ? (Date.now() + (tokenExpiry * 3600000)) : null;
  //生成token
  let token = await _util.random(5);
  await userModel.findOneAndUpdate({
    refKey: refKey,
    appId: appId
  }, { token: token, tokenExpiry: tokenExpiry }, { runValidators: true });

  return { token: token };
}


async function getFn(refKey, appId) {
  let user = await redisConn.hgetall(config.redis_user_prefix + appId + '_' + refKey);
  if (!user || !user.id || user.refKey != refKey) {
    user = await userModel.findOne({ refKey: refKey, appId: appId }, '-blackLList -extra');
    if (user) {
      await syncUserToRedis(user.obj);
    } else {
      return null;
    }
  }

  return user;
}

async function syncUserToRedis(user) {
  await redisConn.hmset(config.redis_user_prefix + user.appId + '_' + user.refKey, user);
}


async function listFn(data) {
  let oldData = data;
  data = _util.pick(data, 'nickname sex del lock appId');
  if (!data.appId) apiError.throw('appId cannot be empty');

  let limit = +oldData.pageSize || 10;
  let skip = ((+oldData.page || 1) - 1) * limit;
  if (data.nickname) data.nickname = new RegExp(data.nickname, 'i');
  data.sim = 0;
  let userList = await userModel.find(data).limit(limit).skip(skip);

  let returnList = userList.map(v => v.obj);

  if (+oldData.searchCount == 1) {
    let searchCount = await userModel.count(data);
    returnList.push(searchCount);
  }

  return returnList;
}
