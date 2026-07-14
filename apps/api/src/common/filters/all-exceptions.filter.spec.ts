import { AllExceptionsFilter } from './all-exceptions.filter';
import {
  ArgumentsHost,
  HttpStatus,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

function makeHost(method = 'GET', url = '/test'): {
  host: ArgumentsHost;
  json: jest.Mock;
  status: jest.Mock;
} {
  const json   = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: jest.fn().mockReturnValue({
      getResponse: jest.fn().mockReturnValue({ status }),
      getRequest:  jest.fn().mockReturnValue({ method, url }),
    }),
  } as unknown as ArgumentsHost;
  return { host, json, status };
}

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  // ── HttpException ───────────────────────────────────────────────────────

  it('maps NotFoundException to 404', () => {
    const { host, json } = makeHost();
    filter.catch(new NotFoundException('user not found'), host);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: HttpStatus.NOT_FOUND }),
    );
  });

  it('maps ConflictException to 409', () => {
    const { host, json } = makeHost();
    filter.catch(new ConflictException('duplicate email'), host);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: HttpStatus.CONFLICT }),
    );
  });

  it('forwards array messages from ValidationPipe', () => {
    const { host, json } = makeHost('POST', '/users');
    const err = new BadRequestException({ message: ['email must be valid', 'name is required'] });
    filter.catch(err, host);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: ['email must be valid', 'name is required'],
      }),
    );
  });

  // ── Prisma errors ───────────────────────────────────────────────────────

  it('maps Prisma P2002 (unique constraint) to 409', () => {
    const { host, json } = makeHost('POST', '/users');
    const err = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '7.8.0',
    });
    filter.catch(err, host);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 409 }),
    );
  });

  it('maps Prisma P2025 (record not found) to 404', () => {
    const { host, json } = makeHost();
    const err = new Prisma.PrismaClientKnownRequestError('Record not found', {
      code: 'P2025',
      clientVersion: '7.8.0',
    });
    filter.catch(err, host);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404 }),
    );
  });

  it('maps Prisma P2003 (foreign key) to 400', () => {
    const { host, json } = makeHost();
    const err = new Prisma.PrismaClientKnownRequestError('Foreign key constraint', {
      code: 'P2003',
      clientVersion: '7.8.0',
    });
    filter.catch(err, host);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400 }),
    );
  });

  it('maps unknown Prisma error codes to 500', () => {
    const { host, json } = makeHost();
    const err = new Prisma.PrismaClientKnownRequestError('Connection failed', {
      code: 'P1001',
      clientVersion: '7.8.0',
    });
    filter.catch(err, host);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 500 }),
    );
  });

  it('maps PrismaClientValidationError to 400', () => {
    const { host, json } = makeHost();
    const err = new Prisma.PrismaClientValidationError('Missing required field', {
      clientVersion: '7.8.0',
    });
    filter.catch(err, host);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 400 }),
    );
  });

  // ── Unknown errors ──────────────────────────────────────────────────────

  it('maps generic Error to 500', () => {
    const { host, json } = makeHost();
    filter.catch(new Error('something unexpected'), host);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 500 }),
    );
  });

  // ── Response shape ──────────────────────────────────────────────────────

  it('response body includes statusCode, message, timestamp, path', () => {
    const { host, json } = makeHost('GET', '/users/abc');
    filter.catch(new NotFoundException(), host);
    const body = json.mock.calls[0][0];
    expect(body).toHaveProperty('statusCode');
    expect(body).toHaveProperty('message');
    expect(body).toHaveProperty('timestamp');
    expect(body.path).toBe('/users/abc');
  });
});
