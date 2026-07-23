const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { signAccessToken, verifyAccessToken } = require('../utils/tokenUtils');

describe('AppError', () => {
  it('sets statusCode, status, and isOperational', () => {
    const err = new AppError('Not found', 404);
    expect(err.statusCode).toBe(404);
    expect(err.status).toBe('fail');
    expect(err.isOperational).toBe(true);
  });

  it('marks 5xx errors with status "error"', () => {
    const err = new AppError('Server exploded', 500);
    expect(err.status).toBe('error');
  });
});

describe('catchAsync', () => {
  it('calls next with the error when the wrapped function rejects', async () => {
    const next = jest.fn();
    const failingHandler = catchAsync(async () => {
      throw new AppError('boom', 400);
    });

    await failingHandler({}, {}, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0].message).toBe('boom');
  });

  it('does not call next when the wrapped function succeeds', async () => {
    const next = jest.fn();
    const okHandler = catchAsync(async (req, res) => {
      res.send();
    });
    const res = { send: jest.fn() };

    await okHandler({}, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.send).toHaveBeenCalledTimes(1);
  });
});

describe('tokenUtils', () => {
  it('signs a token that can be verified and contains the user id', () => {
    const token = signAccessToken('abc123');
    const decoded = verifyAccessToken(token);
    expect(decoded.id).toBe('abc123');
  });

  it('throws when verifying a tampered token', () => {
    const token = signAccessToken('abc123');
    const tampered = token.slice(0, -2) + 'xx';
    expect(() => verifyAccessToken(tampered)).toThrow();
  });
});
