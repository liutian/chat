const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const sessionSchema = new Schema({
  appId: {
    type: Schema.Types.ObjectId,
    required: true
  },
  type: {
    type: Number,
    enum: [
      1,//普通会话
      2//系统会话
    ],
    required: true,
    default: 1
  },
  //群聊时需要,私聊会话为对方名称
  name: { type: String, required: true, trim: true },
  letterName: { type: String, required: true, lowercase: true },
  avator: { type: String },
  joinStrategy: {//会话加入策略
    type: Number,
    enum: [
      1,//自由加入
      2,//需要审核
      3//拒绝加入
    ],
    default: 1
  },
  inviteStrategy: {//会话邀请策略只针对普通用户有效
    type: Number,
    enum: [
      1,//会话中的任何人都可以邀请他人加入
      2,//只有管理员才可以邀请他人加入
    ],
    default: 1
  },
  //会话发起者，不一定代表可以管理该会话，但默认创建会话时同时是会话拥有者，后续可以移交会话所有权
  founder: { type: String, required: true },
  notice: { type: String },//会话公告
  des: { type: String },//会话描述
  sumMemberCount: { type: Number },//成员加入总次数
  maxMemberCount: { type: Number },//限制会话中成员数
  msgMaxCount: { type: Number, required: true, default: 0 },//会话中的总消息数
  latestMessages: [Schema.Types.Mixed],//会话中最新的几条消息
  owner: { type: String, required: true },//会话所有者
  admins: [{ type: String }],
  members: [{ type: String }],//会话中的成员，包括管理员和拥有者
  freeze: {//禁止成员变动(不包括主动退出群)只有会话所有者才能操作
    type: Number,
    enum: [0, 1],
    default: 0
  },
  mute: {//禁言只有会话所有者才能操作，禁言之后只有会话所有者才能发言
    type: Number,
    enum: [0, 1],
    default: 0
  },
  del: {
    type: Number,
    enum: [0, 1],
    default: 0
  },
  lock: {//锁定会话，锁定后禁止修改会话信息，禁言，禁止成员变动
    type: Number,
    enum: [0, 1],
    default: 0
  },
  blackList: [{ type: String }],//黑名单
  updateDate: { type: Date, default: Date.now, required: true },
  createDate: { type: Date, default: Date.now, required: true },//更新会话本身时才会更新该字段(成员变动不会更新该字段)
  extra: { type: String }
});

mongoose.model('session', sessionSchema);
