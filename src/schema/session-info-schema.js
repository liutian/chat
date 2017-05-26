const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const sessionInfoSchema = new Schema({
  sessionId: { type: Schema.Types.ObjectId, required: true },
  refKey: { type: String, required: true },
  appId: { type: Schema.Types.ObjectId, required: true },
  startMsgId: { type: Number, default: 0 },//会话进行查询时开始边界
  endMsgId: Number,//会话进行查询时的结束边界
  nickname: { type: String, trim: true, maxlength: 50 },//在该会话中的昵称（只有在会话消息列表，会话成员列表会显示该字段）
  background: { type: String, trim: true, maxlength: 200 },//该会话的背景图
  joinDate: { type: Date },//加入会话的时间
  speakDate: { type: Date },//最后一次发消息，已用户身份生成的消息不作为真正的发消息
  remark: { type: String, trim: true, maxlength: 50 },//私聊时用户可以备注对方,该字段有对方修改自己不能修改
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
  clearDate: { type: Date },
  outside: {//退出会话时该字段为1
    type: Number,
    min: 0,
    max: 1,
    default: 0
  },
  extra: { type: String }
}, { timestamps: true });

mongoose.model('sessionInfo', sessionInfoSchema);
