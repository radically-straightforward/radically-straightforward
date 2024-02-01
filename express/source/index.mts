import express from "express";
import expressServeStaticCore from "express-serve-static-core";

/**
 * Won’t be necessary in Express 5.
 *
 * **Related Work**
 *
 * - <https://www.npmjs.com/package/express-async-handler>
 * - <https://www.npmjs.com/package/express-async-wrap>
 * - <https://www.npmjs.com/package/express-better-async-wrap>
 * - <https://github.com/reactjs/server-components-demo/blob/2d9fb948b7073f5f07e22d71350422ee9e1cc7f3/server/api.server.js#L44-L52>
 */
export function asyncHandler<
  P = expressServeStaticCore.ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery = expressServeStaticCore.Query,
  Locals extends Record<string, any> = Record<string, any>,
>(
  handler: express.RequestHandler<P, ResBody, ReqBody, ReqQuery, Locals>,
): express.RequestHandler<P, ResBody, ReqBody, ReqQuery, Locals> {
  return async (request, response, next) => {
    try {
      return await handler(request, response, next);
    } catch (error) {
      next(error);
    }
  };
}

export function asyncErrorHandler<
  P = expressServeStaticCore.ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery = expressServeStaticCore.Query,
  Locals extends Record<string, any> = Record<string, any>,
>(
  handler: express.ErrorRequestHandler<P, ResBody, ReqBody, ReqQuery, Locals>,
): express.ErrorRequestHandler<P, ResBody, ReqBody, ReqQuery, Locals> {
  return async (error, request, response, next) => {
    try {
      return await handler(error, request, response, next);
    } catch (error) {
      next(error);
    }
  };
}
