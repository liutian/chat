const crypto = require('crypto');
const util = require('util');
const fs = require('fs');
const path = require('path');

const objProToString = Object.prototype.toString;
const fsAccess = util.promisify(fs.access);
const fsMkdir = util.promisify(fs.mkdir);

exports.pick = pickFn;

exports.random = randomFn;

exports.mkdir = mkdirFn;

exports.formatDate = formatDateFn;

exports.isDate = function (value) { return objProToString.call(value) == '[object Date]' }

exports.isRegExp = function (value) { return objProToString.call(value) == '[object RegExp]' }

exports.isNumber = function (value) { return objProToString.call(value) == '[object Number]' }

exports.isString = function (value) { return objProToString.call(value) == '[object String]' }

exports.isBoolean = function (value) { return objProToString.call(value) == '[object Boolean]' }

exports.isObject = function (value) { return objProToString.call(value) == '[object Object]' }

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
      await fsMkdir(dirname);
    }
  }
}

function formatDateFn(date, format) {
  if (!date) date = new Date();
  if (!format) format = 'MM-dd HH:mm:ss';

  return format.replace('yyyy', date.getFullYear())
    .replace('MM', date.getMonth())
    .replace('dd', date.getDate())
    .replace('HH', date.getHours())
    .replace('mm', date.getMinutes())
    .replace('ss', date.getSeconds());
}
