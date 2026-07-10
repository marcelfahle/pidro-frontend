const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/**', '.expo/**', '.agents/**', '.claude/**', '.factory/**'],
  },
  {
    settings: {
      'import/resolver': {
        typescript: true,
      },
    },
    rules: {
      'react/display-name': 'off',
    },
  },
  {
    files: ['src/game/canvas/useCardSprites.tsx'],
    rules: {
      // Reanimated SharedValues are intentionally mutated by worklets. The
      // React Compiler rules model them as normal render values and report
      // false positives for the canvas gesture/animation engine.
      'react-hooks/immutability': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
]);
