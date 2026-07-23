process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '30d';
process.env.CLIENT_URL = 'http://localhost:5173';

// NOTE: this file only sets shared environment variables. Tests that need
// a database import and call the helpers in tests/dbHandler.js themselves
// (see tests/auth.test.js for an example) — this keeps pure unit tests
// (tests/utils.test.js) fast and independent of MongoDB entirely.
