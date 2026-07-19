import { Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { RequestLoggingMiddleware } from './request-logging.middleware';

describe('RequestLoggingMiddleware (PD-002)', () => {
  let middleware: RequestLoggingMiddleware;
  let logSpy: jest.SpyInstance;

  const buildReqRes = (headers: Record<string, string> = {}) => {
    const listeners: Record<string, () => void> = {};
    const req = { headers, method: 'GET', originalUrl: '/health' } as unknown as Request;
    const res = {
      statusCode: 200,
      setHeader: jest.fn(),
      on: jest.fn((event: string, cb: () => void) => {
        listeners[event] = cb;
      }),
    } as unknown as Response;
    return { req, res, fireFinish: () => listeners.finish?.() };
  };

  beforeEach(() => {
    middleware = new RequestLoggingMiddleware();
    logSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('generates a request ID, echoes it on the response, and logs once the response finishes', () => {
    const { req, res, fireFinish } = buildReqRes();
    const next = jest.fn();

    middleware.use(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', expect.any(String));
    expect(logSpy).not.toHaveBeenCalled();

    fireFinish();

    expect(logSpy).toHaveBeenCalledTimes(1);
    const [entry] = logSpy.mock.calls[0];
    expect(entry).toMatchObject({ method: 'GET', path: '/health', statusCode: 200 });
    expect(entry.requestId).toEqual(expect.any(String));
    expect(entry.durationMs).toEqual(expect.any(Number));
  });

  it('reuses an incoming X-Request-Id instead of generating a new one', () => {
    const { req, res, fireFinish } = buildReqRes({ 'x-request-id': 'incoming-trace-id' });

    middleware.use(req, res, jest.fn());
    fireFinish();

    expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', 'incoming-trace-id');
    expect(logSpy.mock.calls[0][0]).toMatchObject({ requestId: 'incoming-trace-id' });
  });
});
