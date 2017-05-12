const config = require('../config');


module.exports = function (router) {

  router.get('/platform_api/app/create', create);
}

async function create(ctx, next) {
  ctx.body = 'create platfrom';
}
