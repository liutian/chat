const mongoose = require('mongoose');
const util = require('util');
const Schema = mongoose.Schema;

const _util = require('../util/util');
const apiError = require('../util/api-error');

const sessionSchema = new Schema({
  appId: {
    type: Schema.Types.ObjectId,
    required: true
  },
  type: {
    type: Number,
    min: 1,
    max: 2,//1普通会话 2系统会话
    required: true,
    default: 1
  },
  category: {//会话类别比如运动，读书，旅游，美食，具体值由第三方服务器维护
    type: Number,
    min: 1,
    max: 10000
  },
  publicSearch: { type: Number, min: 0, max: 1, default: 1 },//是否可以公开搜索到
  secret: {//是否是私聊会话
    type: Number,
    min: 0,
    max: 1,
    default: 0
  },
  secretKey: { type: String },//保存私聊会话成员的refKey，降序排列以 '-' 分割
  //群聊时需要,私聊会话为对方名称
  name: { type: String, trim: true, maxlength: 100 },
  letterName: { type: String, lowercase: true, trim: true, maxlength: 100 },
  avator: { type: String, trim: true, maxlength: 200 },
  anonymously: { type: Number, min: 0, max: 1, default: 0 },//是否可以发送匿名消息
  joinStrategy: {//会话加入方式 1自由进入 2进入时需要审核 3需要回答问题 4需要回答问题并由管理员审核 5拒绝进入
    type: Number,
    min: 1,
    max: 5,
    default: 1
  },
  inviteStrategy: {//普通成员邀请他人进入会话
    type: Number,//1无需审核直接邀请进入 2需要管理员审核 3人数达到一定数量才进行审核
    min: 1,
    max: 3,
    default: 1
  },
  //会话发起者，不代表可以管理会话只有会话拥有者和管理员可以管理会话，创建会话时同时是创建者也是拥有者
  founder: { type: String, required: true },
  // notice: [Notice],//会话公告
  des: { type: String, trim: true, maxlength: 500 },//会话描述
  maxMemberCount: { type: Number, default: 200, min: 1, max: 1000 },//限制会话最大成员数
  msgMaxCount: { type: Number, required: true, default: 0 },//会话中的总消息数
  messageMaxCount: { type: Number, required: true, default: 0 },//会话中用户发送的总消息数
  latestMessage: Schema.Types.Mixed,//会话中最新的消息
  owner: { type: String, required: true },//会话所有者，值为用户的refKey
  admins: [{ type: String, default: [] }],//会话管理员，值为用户的refKey
  noAuditAdmin: [{ type: String, default: [] }],//不需要接收审批类消息的管理员人员列表
  notice: { type: String, trim: true, maxlength: 1000 },
  memberCount: { type: Number, required: true, default: 1 },
  joinQuestion: { type: String },//加入会话时需要回答的问题
  joinAnswer: { type: String },//加入会话时需要回答的问题的答案
  mute: {//禁言只有会话所有者才能操作，禁言之后只有会话所有者才能发言
    type: Number,
    min: 0,
    max: 1,
    default: 0
  },
  del: {
    type: Number,
    min: 0,
    max: 1,
    default: 0
  },
  lock: {//锁定会话，锁定后禁止修改会话信息，禁言，禁止成员变动
    type: Number,
    min: 0,
    max: 1,
    default: 0
  },
  blackList: [{ type: String }],//黑名单
  updateDate: { type: Date, default: Date.now, required: true },//更新会话本身时才会更新该字段(普通成员变动不会更新该字段)
  extra: { type: String }
}, { timestamps: true });

mongoose.model('session', sessionSchema);
