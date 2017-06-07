const crypto = require('crypto');
const util = require('util');
const fs = require('fs');
const path = require('path');

const fsAccess = util.promisify(fs.access);
const fsMkdir = util.promisify(fs.mkdir);

exports.pick = pickFn;

exports.random = randomFn;

exports.mkdir = mkdirFn;


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


async function mkdirFn(dirname) {
  try {
    await fsMkdir(dirname);
  } catch (e) {
    if (e.code != 'EEXIST') {
      await mkdirFn(path.dirname(dirname));
    }
  }
}
