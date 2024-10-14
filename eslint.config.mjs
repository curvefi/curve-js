import globals from "globals";
import parser from "vue-eslint-parser";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import {fileURLToPath} from "node:url";
import js from "@eslint/js";
import {FlatCompat} from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default [...compat.extends("eslint:recommended"), {
    languageOptions: {
        globals: {
            ...globals.browser,
        },

        parser: parser,
        ecmaVersion: 5,
        sourceType: "module",

        parserOptions: {
            parser: "babel-eslint",
            allowImportExportEverywhere: false,
        },
    },

    rules: {
        "func-names": 0,
        "no-nested-ternary": 0,
        "max-len": 0,
        "arrow-parens": ["error", "always"],
        "no-underscore-dangle": 0,

        "comma-dangle": ["error", {
            arrays: "always-multiline",
            objects: "always-multiline",
            imports: "always-multiline",
            exports: "always-multiline",
            functions: "never",
        }],

        "no-use-before-define": ["error", "nofunc"],

        "no-empty": ["error", {
            allowEmptyCatch: true,
        }],

        "no-mixed-operators": ["error", {
            allowSamePrecedence: true,
        }],

        indent: ["error", 4, {
            flatTernaryExpressions: true,
            SwitchCase: 1,
        }],
    },
}, ...compat.extends(
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended",
).map(config => ({
    ...config,
    files: ["**/*.ts"],
})), {
    files: ["**/*.ts"],

    plugins: {
        "@typescript-eslint": typescriptEslint,
    },

    languageOptions: {
        parser: tsParser,
    },

    rules: {
        "@typescript-eslint/ban-ts-comment": "warn",
        "@typescript-eslint/no-unused-vars": "warn",
        "@typescript-eslint/no-explicit-any": "warn",
    },
}];