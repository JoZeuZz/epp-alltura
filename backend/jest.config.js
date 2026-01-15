module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/index.js', // Excluir entry point
    '!src/db/setup.js', // Excluir scripts de setup
    '!src/scripts/**', // Excluir scripts CLI
    '!src/tests/**', // Excluir tests
  ],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 60,
      lines: 60,
      statements: 60,
    },
  },
  coverageReporters: ['text', 'lcov', 'html'],
  testMatch: ['**/__tests__/**/*.js', '**/?(*.)+(spec|test).js'],
  clearMocks: true,
  forceExit: true,
  detectOpenHandles: true,
  verbose: true,
};
