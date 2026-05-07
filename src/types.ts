import type { ReactNode } from 'react';

export type RecaptchaError = 'SCRIPT_LOAD_FAILED' | 'EXECUTE_FAILED' | 'EXPIRED' | 'MISSING_KEY';

export interface V3Config {
  key: string;
}

export interface V2Config {
  key: string;
  theme?: 'light' | 'dark';
  size?: 'normal' | 'compact';
  language?: string;
}

export interface RecaptchaFallbackProviderProps {
  v3: V3Config;
  v2: V2Config;
  children: ReactNode;
}

export interface RecaptchaFallbackContextValue {
  mode: 'v3' | 'v2';
  requestChallenge: () => void;
  resetToV3: () => void;
  v3Config: V3Config;
  v2Config: V2Config;
}
