//提供性能
//global.Promise = require('bluebird');

// 加载配置信息
require('./src/config');
// 启动日志服务
require('./src/config/log4j-config');
// 开启数据库连接
require('./src/schema');
// 启动web服务
require('./src/api');




