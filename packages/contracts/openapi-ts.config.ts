import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: './openapi.json',
  output: {
    clean: true,
    path: './src/generated',
    postProcess: ['eslint', 'prettier'],
    tsConfigPath: 'off',
  },
  plugins: [
    {
      name: '@hey-api/typescript',
      exportFromIndex: true,
    },
    {
      name: 'zod',
      exportFromIndex: true,
    },
  ],
});
