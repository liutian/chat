/**
 * @apiDefine client_auth
 * @apiHeader Token 认证标示
 * @apiHeader AppId 所属App的唯一标示
 * @apiHeader RefKey 用户的refKey
 */

/**
 * @apiDefine server_auth
 * @apiHeader AppKey app唯一标示
 * @apiHeader Nonce 随机字符串
 * @apiHeader Timestamp 当前时间戳
 * @apiHeader Signature app的secret+Nonce+Timestamp，然后通过sha1加密
 *
 */

/**
 * @apiDefine platform_auth
 * @apiHeader AdminKey 超级管理员唯一标示key
 * @apiHeader Nonce 随机字符串
 * @apiHeader Timestamp 当前时间戳精确到毫秒
 * @apiHeader Signature 超级管理员的secret + Nonce + Timestamp，然后通过sha1加密的字符串
 *
 */

/**
 * @apiDefine success
 * @apiSuccessExample {json} Success-Response
 * {}
 */

