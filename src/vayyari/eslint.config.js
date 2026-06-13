// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const unusedImports = require('eslint-plugin-unused-imports');

module.exports = defineConfig([
  expoConfig,
  {
    plugins: {
      'unused-imports': unusedImports,
    },
    ignores: ['dist/*'],
    rules: {
      'camelcase': ['error', { properties: 'always', ignoreDestructuring: false }],
      '@typescript-eslint/no-unused-vars': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        { 
          vars: 'all', 
          varsIgnorePattern: '^(_.*|theme|router|categories|videoEntry|width|status|menuVisible|setMenuVisible|submitting|setSubmitting|updateAddress|loadingMedia|savedVendor|snackbarVisible|setSnackbarVisible|getChipStyle|newStep|token)$', 
          args: 'after-used', 
          argsIgnorePattern: '^(_.*|e|err|error|props|label|videoUri|vendorId|setIsPlaying)$' 
        },
      ],
    },
  },
]);
