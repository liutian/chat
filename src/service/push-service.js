const request = require('request');
const log4js = require('log4js');
const logger = log4js.getLogger('push-service');
const util = require('util');

const config = require('../config');
const apiError = require('../util/api-error');

exports.push = pushFn;


//**************************************************************** */


/**
 *
 * @param {*} data
 * @param {*} {room: string,pushData: any,pushAuth: string,apnsName: string,leaveMessage: boolean}
 */
function pushFn(data, leaveMessage) {
  if (!data || !data.room || !data.pushData) {
    apiError.throw('推送参数错误');
  }
  let options = {
    url: config.push_url + '/api/auth/push',
    method: 'post',
    headers: {
      Authorization: data.pushAuth
    },
    json: true
  };

  let pushData = data.pushData;
  if (data.pushData.textContent) {
    pushData.apsData = { aps: { alert: data.pushData.textContent } };
  }
  options.body = {
    room: data.room,
    pushData: data.pushData,
    apnsName: util.isString(data.apnsName) ? data.apnsName : config.push_apns_name,
    leaveMessage: data.leaveMessage
  };

  return new Promise(function (resolve, reject) {
    request(options, function (err, response, body) {
      if (err) {
        logger.error('push message error: ' + err);
        reject(err);
      } else if (response.statusCode == 200) {
        resolve();
      } else {
        let err = new Error('statusCode ' + response.statusCode);
        logger.error('push message error :' + err);
        reject(err);
      }
    });
  })
}

