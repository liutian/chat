const mongoose = require('mongoose');
const util = require('util');
const Schema = mongoose.Schema;

const _util = require('../util/util');
const apiError = require('../util/api-error');

function Notice(key, options) {
  mongoose.SchemaType.call(this, key, options, 'Notice');
}
Notice.prototype = Object.create(mongoose.SchemaType.prototype);

Notice.prototype.cast = function (val) {
  let _val = _util.pick(val, 'id title content createDate');
  if (_val.titile && !util.isString(_val.titile)) apiError.throw('notice title must be String type');
  if (!util.isString(_val.content)) apiError.throw('notice content must be String type');
  if (_val.createDate && !util.isDate(_val.createDate)) apiError.throw('notice title must be Date type');
  if (!_val.content) apiError.throw('notice content cannot be empty');
  if (!_val.createDate) _val.createDate = new Date();
  if (!_val.id) _val.id = _val.createDate.getTime();
  return _val;
}
mongoose.Schema.Types.Notice = Notice;

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
  category: {//会话类别比如运动，读书，旅游，美食，具体值有第三方服务器维护
    type: Number,
    min: 1,
    max: 10000
  },
  hideNickname: { type: Number, min: 0, max: 1, default: 0 },//是否对会话中的成员隐藏昵称，会话所有者和管理员还是可以查看的
  private: {//是否是私聊会话
    type: Number,
    min: 0,
    max: 1,
    default: 1
  },
  //群聊时需要,私聊会话为对方名称
  name: { type: String, trim: true, maxlength: 100 },
  letterName: { type: String, lowercase: true, trim: true, maxlength: 100 },
  avator: { type: String, trim: true, maxlength: 200 },
  anonymously: { type: Number, min: 0, max: 1, default: 0 },//是否可以发送匿名消息
  joinStrategy: {//会话加入策略 1自由加入 2需要审核 3拒绝加入 4需要回答问题 5回答问题并审核
    type: Number,
    min: 1,
    max: 3,
    default: 1
  },
  inviteStrategy: {//会话邀请策略只针对普通用户有效, 1会话中的任何人都可以邀请他人加入 2只有管理员才可以邀请他人加入
    type: Number,
    min: 1,
    max: 2,
    default: 1
  },
  //会话发起者，不一定代表可以管理该会话，但默认创建会话时同时是会话拥有者，后续可以移交会话所有权
  founder: { type: String, required: true },
  notice: [Notice],//会话公告
  des: { type: String, trim: true, maxlength: 500 },//会话描述
  sumMemberCount: { type: Number },//成员加入总次数
  maxMemberCount: { type: Number, max: 1000 },//限制会话中成员数
  msgMaxCount: { type: Number, required: true, default: 0 },//会话中的总消息数
  latestMessage: Schema.Types.Mixed,//会话中最新的消息
  owner: { type: String, required: true },//会话所有者
  admins: [{ type: String }],
  members: [{ type: String }],//会话中的成员，包括管理员和拥有者
  freeze: {//禁止成员变动(不包括主动退出群)只有会话所有者才能操作
    type: Number,
    min: 0,
    max: 1,
    default: 0
  },
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
  updateDate: { type: Date, default: Date.now, required: true },//更新会话本身时才会更新该字段(成员变动不会更新该字段)
  extra: { type: String }
}, { timestamps: true });

mongoose.model('session', sessionSchema);
