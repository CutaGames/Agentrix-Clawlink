module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/api/**/*.test.ts'],
  collectCoverageFrom: [
    '**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
  ],
  coverageReporters: ['html', 'text', 'json'],
  coverageDirectory: 'tests/reports/api-coverage',
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './tests/reports/api-html',
        filename: 'report.html',
        openReport: false,
      },
    ],
    [
      'jest-junit',
      {
        outputDirectory: './tests/reports',
        outputName: 'api-junit.xml',
      },
    ],
  ],
}

