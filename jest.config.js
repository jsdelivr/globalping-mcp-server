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
    
    // Added settings to fix worker process exit issues
    forceExit: true, // Force Jest to exit after all tests complete
    detectOpenHandles: true, // Detect and report open handles preventing Node from exiting
    testTimeout: 10000, // Increase test timeout to 10 seconds for async operations
  };
  
  
  