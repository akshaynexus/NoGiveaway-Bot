// Test setup file - runs before all tests
const sinon = require('sinon');

// Set test environment IMMEDIATELY
process.env.NODE_ENV = 'test';

// Stub console methods IMMEDIATELY to prevent output during module loading
// Store references to the stubs so tests can access them
global.consoleLogStub = sinon.stub(console, 'log').callsFake((...args) => {
  // Silent - don't output to console during tests
});
global.consoleErrorStub = sinon.stub(console, 'error').callsFake((...args) => {
  // Silent - don't output to console during tests
});

// Global test setup
before(function() {
  // Increase timeout for all tests
  this.timeout(10000);
});

// Clean up after all tests
after(function() {
  // Restore all sinon stubs/spies/mocks
  sinon.restore();
});

// Global error handler for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

module.exports = {};