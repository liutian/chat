const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const sessionInfoSchema = new Schema({
  sessionId: { type: Schema.Types.ObjectId, required: true },
  refKey: { type: String, required: true },
  appId: { type: Schema.Types.ObjectId, required: true },
  startMsgId: { type: Number, default: 0 },//查询会话消息时最小消息Id
  endMsgId: Number,//查询会话消息时最大消息Id
  nickname: { type: String, trim: true, maxlength: 50 },//在该会话中的昵称（只有在会话消息列表，会话成员列表会显示该字段）
  background: { type: String, trim: true, maxlength: 200 },//该会话的背景图
  joinDate: { type: Date },//加入会话的时间
  speakDate: { type: Date },//最后一次发消息，系统消息不作为真正的发消息
  otherRemark: { type: String, trim: true, maxlength: 50 },//私聊时用户可以备注对方,该字段有对方修改自己不能修改
  secret: { type: Number, min: 0, max: 1, default: 0 },//是否是私聊会话
  sessionType: {
    type: Number,//1普通会话 2系统会话
    min: 1,
    max: 2,
    default: 1,
    required: true
  },
  stick: { //置顶
    type: Number,
    min: 0,
    max: 1,
    default: 0
  },
  quiet: {//是否开启消息免打扰,暂时只是用来显示不用来逻辑判断
    type: Number,
    min: 0,
    max: 1,
    default: 0
  },
  clearMsgId: { type: Number, min: 0, default: 0 },//用户主动清除会话时会话最新的消息ID
  outside: {//退出会话时该字段为1
    type: Number,
    min: 0,
    max: 1,
    default: 0
  },
  extra: { type: String }
}, { timestamps: true });

mongoose.model('sessionInfo', sessionInfoSchema);
