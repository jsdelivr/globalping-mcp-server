/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest/presets/default-esm', // Use ESM preset
    testEnvironment: 'node',
    moduleNameMapper: {
      '^(\\.{1,2}/.*)\\.js$': '$1', // Map .js imports correctly in ESM tests
    },
    transform: {
      // '^.+\\.jsx?$': 'babel-jest', // Uncomment if using Babel alongside TS
      '^.+\\.tsx?$': [
        'ts-jest',
        {
          useESM: true, // Tell ts-jest to use ESM
        },
      ],
    },
    extensionsToTreatAsEsm: ['.ts'], // Treat .ts files as ESM
  };
  
  
  