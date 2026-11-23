import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
export default [
  {ignores:['dist/**','public/ffmpeg/**','node_modules/**','coverage/**']},
  js.configs.recommended,
  {files:['**/*.{js,jsx,mjs}'],languageOptions:{ecmaVersion:'latest',sourceType:'module',globals:{...globals.browser,...globals.node},parserOptions:{ecmaFeatures:{jsx:true}}},plugins:{'react-hooks':reactHooks},rules:{...reactHooks.configs.recommended.rules,'no-unused-vars':['error',{varsIgnorePattern:'^[A-Z_]'}]}}
];
