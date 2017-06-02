const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const messageSchema = new Schema({
  //从0递增+1
  msgId: { type: Number, required: true, min: 1 },
  sessionId: { type: Schema.Types.ObjectId, required: true },
  relevantSessionId: { type: Schema.Types.ObjectId },//相关会话，该消息因为由相关会话而产生
  relevantToken: { type: String },//关联操作ID
  relevantStatus: {//关联事件是否操作完成比如是否审批用户加入，用户是否同意加入
    type: Number,//1 未处理 2同意 3拒绝
    min: 1,
    max: 3,
    default: 1
  },
  appId: { type: Schema.Types.ObjectId, required: true },
  //消息发送方
  from: { type: String, required: true },
  content: { type: String, required: true, trim: true, maxlength: 10000 },
  textContent: { type: String, trim: true, maxlength: 10000 },
  pushResult: { type: String },
  anonymous: { type: Number, min: 0, max: 1, default: 0 },//是否是匿名消息
  //消息内容类型
  contentType: {// 1纯文本 2图文 3图片 4语音 5文件 6视频 7位置
    type: Number,
    min: 1,
    max: 7,
    required: true,
    default: 1
  },
  //消息类型
  /**
   * 1正常消息 2创建会话 3修改会话名称 4有人加入群聊 5邀请加入
   * 6退出群聊 7被踢出群聊 9禁言会话 10锁定会话
   * 11移交会话所有者 12更新公告 13更新会话描述 14解散会话
   * 15被邀请需要同意 16邀请他人加入需要审核 17加入会话需要审核
   * 18被邀请需要同意时被拒绝 19邀请他人加入需要审核时被拒绝
   * 20加入会话需要审核时被拒绝
   */
  type: {
    type: Number,
    min: 1,
    max: 12,
    required: true,
    default: 1
  },
  apnsName: { type: String, trim: true, minlength: 1, maxlength: 50 },
  //是否接收离线消息
  leaveMessage: {
    type: Number,
    min: 0,
    max: 1,
    default: 1
  },
  //是否是系统发出的消息
  fromSys: {
    type: Number,
    min: 0,
    max: 1,
    default: 0
  },
  //@成员列表,refKey
  focusMembers: [{ type: String, trim: true, maxlength: 50 }],
  del: {
    type: Number,
    min: 0,
    max: 1,
    default: 0
  },
  extra: { type: String }
}, { timestamps: true });

mongoose.model('message', messageSchema);


