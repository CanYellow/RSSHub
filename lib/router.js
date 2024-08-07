// eslint-disable-next-line n/no-extraneous-require
const Router = require('@koa/router');
const router = new Router();

const RouterHandlerMap = new Map();

// 懒加载 Route Handler，Route 首次被请求时才会 require 相关文件
const lazyloadRouteHandler = (routeHandlerPath) => (ctx) => {
    if (RouterHandlerMap.has(routeHandlerPath)) {
        return RouterHandlerMap.get(routeHandlerPath)(ctx);
    }

    const handler = require(routeHandlerPath);
    RouterHandlerMap.set(routeHandlerPath, handler);
    return handler(ctx);
};

// Deprecated: DO NOT ADD ANY NEW ROUTES HERE

// example
// 简书
// router.get('/jianshu/home', lazyloadRouteHandler('./routes/jianshu/home'));
// router.get('/jianshu/collection/:id', lazyloadRouteHandler('./routes/jianshu/collection'));
// router.get('/jianshu/user/:id', lazyloadRouteHandler('./routes/jianshu/user'));

// Deprecated: DO NOT ADD ANY NEW ROUTES HERE

module.exports = router;
