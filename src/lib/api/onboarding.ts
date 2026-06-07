/* Typed wrappers for the /v1/onboarding endpoints. */

import { apiCall } from './client';

export type OnboardingStepId = 'client' | 'contacts' | 'template';

export interface OnboardingStep {
  id:    OnboardingStepId;
  title: string;
  done:  boolean;
}

export interface OnboardingProgress {
  setupComplete: boolean;
  steps:         OnboardingStep[];
  allDone:       boolean;
}

export function getOnboarding() {
  return apiCall<{ data: OnboardingProgress }>('/v1/onboarding');
}

export function skipOnboarding() {
  return apiCall<{ data: { setupComplete: boolean } }>(
    '/v1/onboarding/skip',
    { method: 'POST', body: {} },
  );
}

export function completeOnboarding() {
  return apiCall<{ data: { setupComplete: boolean } }>(
    '/v1/onboarding/complete',
    { method: 'POST', body: {} },
  );
}
