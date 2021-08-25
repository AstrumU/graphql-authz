module.exports = {
  preset: 'ts-jest',
  verbose: true,
  collectCoverage: true,
  testEnvironment: 'node',
  modulePathIgnorePatterns: ['/dist/'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '/fixtures/'
  ],
  coveragePathIgnorePatterns: ['/__tests__/', '/node_modules/'],
  testMatch: ['**/__tests__/**/*.test.ts']
};
