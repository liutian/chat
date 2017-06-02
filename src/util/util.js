const crypto = require('crypto');
const util = require('util');

exports.pick = pickFn;

exports.random = randomFn;


/*------------------------------------分割线 -----------------------------*/

function pickFn(data, schema, extraKeys) {
  let newData = {};
  if (util.isString(schema)) {
    extraKeys = schema;
    schema = null;
    Object.keys(data).forEach(function (key) {
      if (extraKeys.includes('**') || extraKeys.includes(key)) {
        newData[key] = data[key];
      }
      if (extraKeys.includes('-' + key)) {
        delete newData[key];
      }
    })
  } else if (util.isObject(schema)) {
    Object.keys(data).forEach(function (key) {
      if (key in schema || (extraKeys && extraKeys.includes(key) && !extraKeys.includes('-' + key))) {
        newData[key] = data[key];
      }
    })
  }

  return newData;
}


function randomFn(size) {
  return new Promise(function (resolve, reject) {

    crypto.randomBytes(size || 10, function (err, buf) {
      if (err) {
        reject(err);
      } else {
        resolve(buf.toString('hex'));
      }
    });
  });
}
