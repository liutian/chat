const crypto = require('crypto');
const util = require('util');

exports.pick = pickFn;

exports.random = randomFn;


/*------------------------------------分割线 -----------------------------*/

function pickFn(data, schema, extraKeys) {
  let newData = {};
  if (util.isString(schema)) {
    for (var key in data) {
      if (schema.includes(key)) {
        newData[key] = data[key];
        if (util.isString(newData[key])) {
          newData[key] = newData[key].trim();
        }
      }
    }
  } else if (util.isObject(schema)) {
    for (var key in data) {
      if (key in schema || (extraKeys && extraKeys.includes(key) && !extraKeys.includes('-' + key))) {
        newData[key] = data[key];
        if (util.isString(newData[key])) {
          newData[key] = newData[key].trim();
        }
      }
    }
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
