// Manual Jest mock for `@expo/vector-icons`.
//
// The real package pulls in `expo-font` -> `expo-asset`, and this project's
// installed `expo-font@57.0.4` doesn't declare `expo-asset` as its own
// dependency (it's only nested under `expo`'s own node_modules), so
// requiring the real icon set crashes module resolution under Jest. Icons
// are purely decorative in tests — nothing here asserts on glyph
// rendering — so every icon set is replaced with a plain, inert View that
// keeps whatever accessibility/test props a screen already passes through.
const React = require('react');
const { View } = require('react-native');

function createIconSetMock(setName) {
  function IconSetMock({ name, size, color, ...rest }) {
    return React.createElement(View, { testID: `icon-${setName}-${String(name)}`, ...rest });
  }
  IconSetMock.displayName = setName;
  IconSetMock.font = {};
  return IconSetMock;
}

module.exports = new Proxy(
  {},
  {
    get(_target, prop) {
      if (typeof prop !== 'string') return undefined;
      return createIconSetMock(prop);
    },
  },
);
