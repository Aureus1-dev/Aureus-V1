/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  setupFiles: ['<rootDir>/../test/jest.setup.js'],
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', {
      tsconfig: {
        emitDecoratorMetadata: true,
        experimentalDecorators: true,
        esModuleInterop: true,
        skipLibCheck: true,
      },
    }],
  },
  collectCoverageFrom: ['**/*.(t|j)s', '!**/*.spec.(t|j)s', '!**/index.ts', '!**/*.module.ts'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/$1',
  },
  // otplib (MFA, PD-001) and sanitize-html's htmlparser2 dependency chain
  // (PD-001, stored-content sanitization) both ship (parts of) their
  // dependency tree as pure ESM — Jest's default CommonJS transform skips
  // node_modules entirely, so these packages must be explicitly opted back
  // in for ts-jest to transpile. pnpm flattens each package into
  // node_modules/.pnpm/<name>@<version>/..., so the exclusion has to match
  // against that pnpm store segment, not a plain top-level
  // node_modules/<name> path.
  transformIgnorePatterns: [
    'node_modules/\\.pnpm/(?!(otplib|@otplib\\+|@noble\\+|@scure\\+|htmlparser2|domhandler|domutils|domelementtype|dom-serializer|entities))',
  ],
};
