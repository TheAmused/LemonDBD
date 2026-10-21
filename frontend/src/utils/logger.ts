// frontend/src/utils/logger.ts
//
// The one place the frontend writes diagnostics. Every line is prefixed so it can be told apart
// from browser-extension and library noise, and debug / info output is dropped in production
// builds (warnings and errors always go through).
type Level = 'debug' | 'info' | 'warn' | 'error';

const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const THRESHOLD = process.env.NODE_ENV === 'production' ? ORDER.warn : ORDER.debug;
const PREFIX = '[lemondbd]';

function emit(level: Level, message: unknown, details: unknown[]): void {
  if (ORDER[level] < THRESHOLD) return;
  const text = typeof message === 'string' ? `${PREFIX} ${message}` : PREFIX;
  const rest = typeof message === 'string' ? details : [message, ...details];
  console[level](text, ...rest);
}

export const logger = {
  debug: (message: unknown, ...details: unknown[]) => emit('debug', message, details),
  info: (message: unknown, ...details: unknown[]) => emit('info', message, details),
  warn: (message: unknown, ...details: unknown[]) => emit('warn', message, details),
  error: (message: unknown, ...details: unknown[]) => emit('error', message, details),
};
