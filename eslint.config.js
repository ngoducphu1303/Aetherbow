import firebaseRulesPlugin from '@firebase/eslint-plugin-security-rules';

export default [
  {
    ignores: ['dist/**/*', 'node_modules/**/*', 'src/**/*', 'tests/**/*', 'tools/**/*'],
  },
  firebaseRulesPlugin.configs['flat/recommended'],
];
