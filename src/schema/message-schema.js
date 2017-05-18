const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const messageSchema = new Schema({
  //从0递增+1
  id: { type: Number, required: true },
  sessionId: { type: Schema.Types.ObjectId, required: true },
  appId: { type: Schema.Types.ObjectId, required: true },
  //消息发送方
  from: { type: Schema.Types.ObjectId, ref: 'user', required: true },
  content: { type: String, required: true, trim: true },
  textContent: { type: String },
  pushResult: { type: String },
  //消息内容类型
  contentType: {
    type: Number,
    enum: [
      1,//纯文本
      2,//图文
      3,//图片
      4,//语音
      5,//文件
      6,//视频
      7//位置
    ],
    required: true,
    default: 1
  },
  //消息类型
  type: {
    type: Number,
    enum: [
      1,//正常消息
      2,//创建会话
      3,//修改会话名称
      4,//有人加入群聊
      5,//邀请加入
      6,//退出群聊
      7,//被踢出群聊
      8,//冻结会话
      9,//禁言会话
      10,//锁定会话
      11,//会话所有人变动
      12//更新公告
    ],
    required: true,
    default: 1
  },
  apnsName: { type: String },
  //是否接收离线消息
  leaveMessage: {
    type: Number,
    enum: [0, 1],
    default: 1
  },
  //是否是系统发出的消息
  fromSys: {
    type: Number,
    enum: [0, 1],
    default: 0
  },
  //@成员列表,refKey
  focusMembers: [String],
  del: {
    type: Number,
    enum: [0, 1],
    default: 0
  },
  updateDate: { type: Date, default: Date.now, required: true },
  createDate: { type: Date, default: Date.now, required: true },
  extra: { type: String }
});

mongoose.model('message', messageSchema);


