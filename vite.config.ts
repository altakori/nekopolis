import {fileURLToPath,URL} from 'node:url';
import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins:[react()],
  base:'./',
  build:{
    rollupOptions:{
      input:{
        main:fileURLToPath(new URL('./index.html',import.meta.url)),
        v2:fileURLToPath(new URL('./v2.html',import.meta.url)),
      },
    },
  },
});
