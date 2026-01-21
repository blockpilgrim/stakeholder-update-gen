/**
 * Centralized configuration with environment variable parsing and defaults.
 * All guardrail settings are controlled here.
 */

export const config = {
  // Kill switch: set GENERATION_ENABLED=false to disable live generation
  generationEnabled: process.env.GENERATION_ENABLED !== 'false',

  // Rate limits
  rateLimitPerIp: parseInt(process.env.RATE_LIMIT_PER_IP ?? '10', 10),
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '600000', 10), // 10 minutes
  rateLimitGlobalDaily: parseInt(process.env.RATE_LIMIT_GLOBAL_DAILY ?? '500', 10),

  // Input/output caps
  maxInputChars: parseInt(process.env.MAX_INPUT_CHARS ?? '20000', 10),
  maxOutputChars: parseInt(process.env.MAX_OUTPUT_CHARS ?? '30000', 10),
} as const;

export type Config = typeof config;
