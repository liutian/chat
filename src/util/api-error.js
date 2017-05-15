const util = require('util');

exports.codeMap = {
  code_9999: '服务器端错误',
  code_1000: '报错',
  code_1001: '服务器接口认证参数缺失',
  code_1002: '服务器接口认证参数无效(Timestamp)',
  code_1003: '服务器接口认证参数无效(AppKey)',
  code_1004: '服务器接口认证app已经锁定',
  code_1005: '服务器接口认证app已经删除',
  code_1006: '服务器接口认证失败',
  code_1007: '请求参数缺失',
  code_1008: '生成token失败',
  code_1009: '客户端认证缺少Token',
  code_1010: '客户端认证Token无效',
  code_1011: '用户已锁定',
  code_1012: '用户已删除',
  code_1013: '无权操作该用户',
  code_1014: '参数无效',
  code_1015: '数据库错误'
}

exports.throw = function throwFn(msg, status) {
  let error = new Error();
  if (util.isNumber(msg)) {
    error.message = '{"code": ' + msg + ',"msg": "' + exports.codeMap['code_' + msg] + '"}';
  } else {
    error.message = '{"code": 1000,"msg": "' + msg + '"}';
  }
  error.status = status || 400;
  error.expose = true;
  throw error;
}
