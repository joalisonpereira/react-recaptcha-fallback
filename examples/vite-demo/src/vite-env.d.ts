/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_RECAPTCHA_V3_KEY: string;
  readonly VITE_RECAPTCHA_V2_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
