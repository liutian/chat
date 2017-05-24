const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const sessionInfoSchema = new Schema({
  sessionId: { type: Schema.Types.ObjectId, required: true },
  refKey: { type: String, required: true },
  appId: { type: Schema.Types.ObjectId, required: true },
  startMsgId: Number,//会话进行查询时开始边界
  endMsgId: Number,//会话进行查询时的结束边界
  nickName: { type: String, trim: true, maxlength: 50 },//在该会话中的昵称
  background: { type: String, trim: true, maxlength: 200 },//该会话的背景图
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
  leave: {//已不是会话成员
    type: Number,
    min: 0,
    max: 1,
    default: 0
  },
  extra: { type: String }
}, { timestamps: true });

mongoose.model('sessionInfo', sessionInfoSchema);
