import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#ffd83d' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#ffd83d' } },
  },
  images: ['public/icon.svg'],
});
