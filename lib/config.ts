/**
 * GhostFi Feature Flags
 * Use these to toggle visibility of features that are in regulatory/technical sandbox.
 */

import { DEMO_MODE } from "./constants";

export { DEMO_MODE };

export const FEATURE_FLAGS = {
  // Show features for Hackathon judges/demo even if not "live"
  ENABLE_DEMO_FEATURES: DEMO_MODE, 

  // Individual feature gates
  ENABLE_USSD: false,           // Set to true after NCC approval
  ENABLE_BANK_PAYOUTS: false,   // Set to true after regulatory onboarding
  ENABLE_VIRTUAL_CARDS: false,  // Set to true after card partner approval
  ENABLE_DUNE_ANALYTICS: true,  // Safe to show
  ENABLE_WHATSAPP: true,        // WhatsApp bot is complete
};

// Frontend-safe check (using env if available, else defaulting to flags)
export const isVisible = (feature: keyof typeof FEATURE_FLAGS) => {
  if (typeof window !== "undefined") {
    // If we're in a browser, we might want to check a URL param for demo purposes
    const params = new URLSearchParams(window.location.search);
    if (params.get("demo") === "true") return true;
  }
  return FEATURE_FLAGS.ENABLE_DEMO_FEATURES || FEATURE_FLAGS[feature];
};
