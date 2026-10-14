// frontend/eslint.config.mjs
export default [
  {
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*/*'],
              message: 'Deep imports into feature internals are forbidden. Import from the feature barrel (@/features/<name>) instead.',
            },
          ],
        },
      ],
    },
  },
];
