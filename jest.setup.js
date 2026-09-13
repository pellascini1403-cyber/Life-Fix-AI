jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest'),
);

jest.mock('react-native-safe-area-context', () => {
  const mock = require('react-native-safe-area-context/jest/mock');
  return mock.default ?? mock;
});

// Official setup from react-native-gesture-handler's own docs: without it,
// GestureHandlerRootView's native init throws under Jest.
require('react-native-gesture-handler/jestSetup');
