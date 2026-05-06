export function removeRecaptchaScript(): void {
  if (typeof document === 'undefined') return;

  document
    .querySelectorAll<HTMLScriptElement>(
      'script[src*="recaptcha/api.js"], script[src*="recaptcha/api2/"]'
    )
    .forEach((s) => s.remove());

  if (typeof window !== 'undefined') {
    delete (window as unknown as Record<string, unknown>).grecaptcha;
  }
}
