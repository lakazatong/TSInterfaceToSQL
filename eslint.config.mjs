import jestPlugin from "eslint-plugin-jest";
import globals from "globals";
import prettierPlugin from "eslint-plugin-prettier"; // Import the Prettier plugin
import eslintComments from "eslint-plugin-eslint-comments";
import js from "@eslint/js";

export default [
	js.configs.recommended, // Nice defaults rules
	{
		files: ["**/*.js", "**/*.mjs"], // Apply to .js and .mjs files
		languageOptions: {
			globals: {
				...globals.node,
				...jestPlugin.environments.globals.globals,
				...globals.browser,
			},
		},
		plugins: {
			prettier: prettierPlugin, // Add Prettier plugin correctly
			jest: jestPlugin, // Jest plugin
			"eslint-comments": eslintComments, // Add plugin to detect cheats
		},
		rules: {
			"eslint-comments/no-use": ["error", { allow: [] }], // Disallow disable rules
			curly: ["error", "all"], // Enforce curlies in conditionnal blocks
			"brace-style": ["error", "1tbs"],
			"max-statements-per-line": ["error", { max: 1 }],
			semi: ["error", "always"], // Enforce semicolons
			"prefer-const": "error", // Prefer const over let
			"no-undef": "error", // Detect definition
			"no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
			// Detect error of line width (but can't fix them without the prettier)
			"max-len": [
				"error",
				{
					code: 120,
					tabWidth: 4,
					ignoreComments: true,
					ignoreStrings: true,
					ignoreTemplateLiterals: true,
					ignoreRegExpLiterals: true,
				},
			], // More rules to complete with the existants in .prettierrc.js file
			"prettier/prettier": ["error"], // Enforce Prettier formatting
			"padding-line-between-statements": [
				// Create nice looking paddings between statements
				"error",
				{
					blankLine: "always",
					prev: ["const", "let", "var", "if", "for", "while", "do"],
					next: "*",
				},
				{
					blankLine: "any",
					prev: ["const", "let", "var"],
					next: ["const", "let", "var"],
				},
			], // Requires blank lines between the given 2 kinds of statements
		},
	},
	{
		files: ["oidc/server.js"],
		languageOptions: {
			globals: {
				PORT: "writable",
			},
		},
	},
	{
		files: ["oidc/redirect.js"],
		languageOptions: {
			globals: {
				LOGIN_URL: "writable",
			},
		},
	},
	{
		files: ["oidc/**/*.js"],
		languageOptions: {
			globals: {
				END_SESSION_URL: "writable",
			},
		},
	},
];
