/**
 * @type {import('eslint').Linter.BaseConfig}
 * @link https://github.com/cloudflare/workers-sdk/blob/main/packages/eslint-config-worker/index.js
 */
module.exports = {
	root: true,
	env: {
		/**
		 * @link // https://eslint.org/docs/head/use/configure/language-options-deprecated#specifying-environments
		 */
		node: true,
		es2024: true,
		serviceworker: true,
	},
	extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
	parser: '@typescript-eslint/parser',
	parserOptions: {
		tsconfigRootDir: __dirname,
		project: ['./tsconfig.json'],
		ecmaVersion: 'latest',
		sourceType: 'module',
	},
	plugins: ['@typescript-eslint'],
	rules: {
		// Note: you must disable the base rule as it can report incorrect errors
		'no-unused-vars': 'off',
		'@typescript-eslint/no-explicit-any': 'off',
		// '@typescript-eslint/explicit-module-boundary-types': 'off',
		// '@typescript-eslint/no-inferrable-types': 'off',
		// '@typescript-eslint/no-non-null-assertion': 'off',
		// '@typescript-eslint/no-empty-interface': 'off',
		// '@typescript-eslint/no-namespace': 'off',
		// '@typescript-eslint/no-empty-function': 'off',
		// '@typescript-eslint/no-this-alias': 'off',
		'@typescript-eslint/ban-types': 'warn',
		// '@typescript-eslint/ban-ts-comment': 'off',
		// 'prefer-spread': 'off',
		// 'no-case-declarations': 'off',
		// 'no-console': 'off',
		'@typescript-eslint/no-unused-vars': 'warn',
		'@typescript-eslint/no-unnecessary-condition': 'warn',
		'@typescript-eslint/no-import-type-side-effects': 'error',
		'@typescript-eslint/consistent-type-imports': 'error',
		'@typescript-eslint/ban-ts-comment': 'warn',
		'no-async-promise-executor': 'off',
	},
};
