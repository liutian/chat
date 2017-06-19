const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  appId: {
    type: Schema.Types.ObjectId,
    required: true
  },
  sysSessionId: { type: Schema.Types.ObjectId },
  sim: {//是否是模拟用户，模拟用户用来发系统消息给普通用户
    type: Number,
    min: 0,
    max: 1,
    default: 0
  },
  //第三方服务器用户系统唯一标示，如果是模拟用户对应值为：sim + appId
  refKey: { type: String, required: true, trim: true, maxlength: 50 },
  nickname: { type: String, required: true, trim: true, maxlength: 50 },
  letterNickname: { type: String, required: true, lowercase: true, maxlength: 50 },//取nickname单词的首字母
  avator: { type: String, trim: true, maxlength: 200 },
  sex: {
    type: Number,
    min: 1,//1男 2女 3其他
    max: 3,
    default: 1
  },
  location: {
    type: [Number], index: {
      type: '2dsphere',
      sparse: true
    }
  },
  token: { type: String, trim: true, maxlength: 100 },
  tokenExpiry: { type: Date },
  joinSessionAgree: { type: Number, min: 0, max: 1, default: 0 },//被邀请加入会话是否需要同意
  del: {
    type: Number,
    min: 0,
    max: 1,
    default: 0
  },
  lock: { //可用来封禁用户
    type: Number,
    min: 0,
    max: 1,
    default: 0
  },
  des: { type: String, maxlength: 200 },//用户描述
  blackLList: [{ type: String }],//黑名单只对单聊会话有效,refKey
  extra: { type: String }
}, { timestamps: true });

mongoose.model('user', userSchema);
