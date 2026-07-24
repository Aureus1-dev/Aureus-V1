import type { Request, Response } from 'express';
import { V1ScopeMiddleware } from './v1-scope.middleware';
import { V1_FEATURE_FLAGS } from '../../config/v1-feature-scope';

function makeReqRes(path: string) {
  const req = { originalUrl: path } as unknown as Request;
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const res = { status } as unknown as Response;
  const next = jest.fn();
  return { req, res, next, status, json };
}

describe('V1ScopeMiddleware', () => {
  const middleware = new V1ScopeMiddleware();

  it.each(['/ai/voice/sessions', '/academy/courses', '/pods'])(
    '404s a gated prefix (%s) while its flag is off',
    (path) => {
      const { req, res, next, status, json } = makeReqRes(path);

      middleware.use(req, res, next);

      expect(status).toHaveBeenCalledWith(404);
      expect(json).toHaveBeenCalledWith({ statusCode: 404, message: 'Not Found' });
      expect(next).not.toHaveBeenCalled();
    },
  );

  it('does not gate a path that merely starts with a gated word but not the prefix boundary', () => {
    const { req, res, next, status } = makeReqRes('/academymembers');

    middleware.use(req, res, next);

    expect(status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('gates a prefix even with a query string attached', () => {
    const { req, res, next, status } = makeReqRes('/pods?status=FORMING');

    middleware.use(req, res, next);

    expect(status).toHaveBeenCalledWith(404);
    expect(next).not.toHaveBeenCalled();
  });

  it('lets an ungated route through untouched', () => {
    const { req, res, next, status } = makeReqRes('/city-sheet');

    middleware.use(req, res, next);

    expect(status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('every gated flag currently defaults to off (C2 requires this until a Founder decision reopens one)', () => {
    expect(V1_FEATURE_FLAGS.voice).toBe(false);
    expect(V1_FEATURE_FLAGS.academy).toBe(false);
    expect(V1_FEATURE_FLAGS.pods).toBe(false);
  });
});
