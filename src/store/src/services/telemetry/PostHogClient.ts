// Native no-op stub for PostHog to prevent browser-only posthog-js from executing on native runtimes (Hermes/Android/iOS)
export interface MockPostHog {
  init: (...args: any[]) => void;
  capture: (event: string, properties?: Record<string, any>) => void;
  identify: (distinctId: string, properties?: Record<string, any>) => void;
  reset: () => void;
  register: (properties: Record<string, any>) => void;
  __loaded: boolean;
}

const mockPostHog: MockPostHog = {
  init: () => {},
  capture: () => {},
  identify: () => {},
  reset: () => {},
  register: () => {},
  __loaded: false,
};

export default mockPostHog;
