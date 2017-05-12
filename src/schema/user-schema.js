const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
  appId: {
    type: Schema.Types.ObjectId,
    required: true
  },
  sim: {//是否是模拟用户，模拟用户用来发系统消息给普通用户
    type: Number,
    enum: [0, 1],
    default: 0
  },
  refKey: { type: String },//第三方服务器用户系统唯一标示
  nickname: { type: String, required: true },
  letterName: { type: String, required: true, lowercase: true },//取nickname单词的首字母
  avator: { type: String },
  sex: {
    type: Number,
    enum: [
      1,//男
      2,//女
      3//其他
    ],
    default: 1
  },
  del: {
    type: Number,
    enum: [0, 1],
    default: 0
  },
  lock: { //可用来封禁用户
    type: Number,
    enum: [0, 1],
    default: 0
  },
  blackLList: [{ type: Schema.Types.ObjectId, ref: 'user' }],//黑名单只对单聊会话有效
  updateDate: { type: Date, default: Date.now, required: true },
  createDate: { type: Date, default: Date.now, required: true },
  extra: { type: String }
});

mongoose.model('user', userSchema);
