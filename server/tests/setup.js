// Use an in-memory SQLite database for tests — must be set before any module loads
process.env.DB_PATH = ':memory:';
process.env.JWT_SECRET = 'test-secret-key-for-jest';
process.env.APP_URL = 'http://localhost:5173';
process.env.NODE_ENV = 'test';
