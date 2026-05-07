import { useCallback } from 'react';
import { useGoogleReCaptcha } from '@google-recaptcha/react';
import { useRecaptchaFallbackContext } from '../provider';
import type { RecaptchaError } from '../types';

export interface UseRecaptchaFallbackReturn {
  executeV3: (action?: string) => Promise<string>;
  requestV2Challenge: () => void;
  resetToV3: () => void;
  resetChallenge: ReturnType<typeof useGoogleReCaptcha>['reset'];
  isReady: boolean;
  isLoading: boolean;
  mode: 'v3' | 'v2';
}

export function useRecaptchaFallback(): UseRecaptchaFallbackReturn {
  const { mode, requestChallenge, resetToV3 } = useRecaptchaFallbackContext();

  const { reset: resetChallenge } = useGoogleReCaptcha();

  const { executeV3: baseExecuteV3, isLoading } = useGoogleReCaptcha();

  const executeV3 = useCallback(
    async (action?: string): Promise<string> => {
      if (mode !== 'v3') {
        const err: RecaptchaError = 'EXECUTE_FAILED';

        throw new Error(`${err}: not in v3 mode`);
      }

      if (!baseExecuteV3) {
        const err: RecaptchaError = 'EXECUTE_FAILED';

        throw new Error(`${err}: recaptcha not ready`);
      }

      return baseExecuteV3(action ?? 'submit');
    },
    [mode, baseExecuteV3]
  );

  return {
    executeV3,
    requestV2Challenge: requestChallenge,
    resetToV3,
    resetChallenge,
    isReady: !isLoading && !!baseExecuteV3,
    isLoading,
    mode
  };
}
