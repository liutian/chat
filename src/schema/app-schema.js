const mongoose = require('mongoose');

const Schema = mongoose.Schema;

//该集合数据会同步到redis中，同时每个实例都会缓存，当更新的时候通过redis广播到其他实例
const appSchema = new Schema({
  //秘钥由服务器自动生成
  secret: { type: String, required: true },
  //模拟用户用来和普通用户建立会话进行消息往来
  simUser: { type: String, maxlength: 50 },
  name: { type: String, required: true, unique: true, trim: true, maxlength: 50, minlength: 2 },
  des: { type: String, trim: true, maxlength: 200 },
  //每个用户拥有的会话最大数(拥有指用户属于会话的超级管理员)
  maxSessionCount: { type: Number, default: 1000, required: true, max: 10000 },
  //每个会话拥有的成员最大数
  maxMemberCount: { type: Number, default: 200, required: true, max: 1000 },
  lock: {//用于封禁整个app
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
  pushAuth: { type: String, maxlength: 500 },
  pushApnsName: { type: String, trim: true, minlength: 1, maxlength: 50 },
  extra: { type: String }//额外扩展字段(建议保存json字符串)
}, { timestamps: true });

mongoose.model('app', appSchema);
