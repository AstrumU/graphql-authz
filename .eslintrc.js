module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:security/recommended',
    'prettier'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: `${__dirname}/tsconfig.eslint.json`
  },
  plugins: ['promise', 'security', '@typescript-eslint'],
  root: true,
  env: {
    node: true
  },
  rules: {
    /* security */
    'security/detect-unsafe-regex': 'error',
    'security/detect-buffer-noassert': 'error',
    'security/detect-child-process': 'error',
    'security/detect-disable-mustache-escape': 'error',
    'security/detect-eval-with-expression': 'error',
    'security/detect-no-csrf-before-method-override': 'error',
    'security/detect-non-literal-fs-filename': 'error',
    'security/detect-non-literal-regexp': 'error',
    'security/detect-non-literal-require': 'error',
    'security/detect-object-injection': 'off',
    'security/detect-possible-timing-attacks': 'error',
    'security/detect-pseudoRandomBytes': 'error',

    /* promises */
    'promise/always-return': 'error',
    'promise/catch-or-return': 'error',
    'promise/param-names': 'error',
    'promise/no-return-wrap': 'error',

    /* typescript */
    '@typescript-eslint/ban-ts-comment': [
      'error',
      {
        'ts-expect-error': false
      }
    ],
    '@typescript-eslint/no-use-before-define': ['error', { classes: false }],
    '@typescript-eslint/no-empty-interface': 'error',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'error',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/explicit-member-accessibility': [
      'error',
      { overrides: { constructors: 'no-public' } }
    ],
    '@typescript-eslint/no-non-null-assertion': 'error',
    '@typescript-eslint/no-inferrable-types': [
      'error',
      { ignoreProperties: true }
    ],

    'import/prefer-default-export': 0,
    'arrow-body-style': ['error', 'as-needed'],
    'arrow-parens': 0,
    'lines-between-class-members': ['error', 'always'],
    camelcase: 'error',

    // Typescript
    '@typescript-eslint/no-unsafe-call': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-floating-promises': 'warn',
    '@typescript-eslint/no-unsafe-return': 'off',
    '@typescript-eslint/unbound-method': 'warn',
    '@typescript-eslint/restrict-template-expressions': 'warn',
    '@typescript-eslint/no-implied-eval': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }]
  },

  overrides: [
    {
      files: ['./__tests__/**/*.ts'],
      rules: {
        '@typescript-eslint/unbound-method': ['off']
      }
    },
    {
      files: ['*.js'],
      extends: ['eslint:recommended', 'prettier']
    },
    {
      files: ['./examples/**/*.ts'],
      rules: {
        'promise/catch-or-return': ['off'],
        'promise/always-return': ['off'],
        '@typescript-eslint/no-unused-vars': [
          'error',
          { ignoreRestSiblings: true, args: 'none' }
        ]
      }
    }
  ]
};
