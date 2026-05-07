import { createContext, useCallback, useContext, useState } from 'react';
import { GoogleReCaptchaProvider } from '@google-recaptcha/react';
import type { RecaptchaFallbackContextValue, RecaptchaFallbackProviderProps } from './types';

const RecaptchaFallbackContext = createContext<RecaptchaFallbackContextValue | null>(null);

export function RecaptchaFallbackProvider({ v3, v2, children }: RecaptchaFallbackProviderProps) {
  const [mode, setMode] = useState<'v3' | 'v2'>('v3');

  const requestChallenge = useCallback(() => setMode('v2'), []);

  const resetToV3 = useCallback(() => setMode('v3'), []);

  return (
    <RecaptchaFallbackContext.Provider
      value={{ mode, requestChallenge, resetToV3, v3Config: v3, v2Config: v2 }}
    >
      <GoogleReCaptchaProvider type="v3" siteKey={v3.key} language={v2.language}>
        {children}
      </GoogleReCaptchaProvider>
    </RecaptchaFallbackContext.Provider>
  );
}

export function useRecaptchaFallbackContext(): RecaptchaFallbackContextValue {
  const ctx = useContext(RecaptchaFallbackContext);

  if (!ctx) {
    throw new Error('useRecaptchaFallbackContext must be used inside RecaptchaFallbackProvider');
  }

  return ctx;
}
