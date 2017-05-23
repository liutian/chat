const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const sessionInfoSchema = new Schema({
  sessionId: { type: Schema.Types.ObjectId, required: true },
  refKey: { type: String, required: true },
  appId: { type: Schema.Types.ObjectId, required: true },
  startMsgId: Number,//会话进行查询时开始边界
  endMsgId: Number,//会话进行查询时的结束边界
  nickName: String,//在该会话中的昵称
  background: String,//该会话的背景图
  stick: { //置顶
    type: Number,
    enum: [0, 1],
    default: 0
  },
  quiet: {//是否开启消息免打扰,暂时只是用来显示不用来逻辑判断
    type: Number,
    enum: [0, 1],
    default: 0
  },
  del: {
    type: Number,
    enum: [0, 1],
    default: 0
  },
  updateDate: { type: Date, default: Date.now, required: true },
  createDate: { type: Date, default: Date.now, required: true },
  extra: { type: String }
});

mongoose.model('sessionInfo', sessionInfoSchema);
