// Error tracking utility
// In production, replace console methods with actual error tracking service (Sentry, LogRocket, etc.)

interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  extra?: Record<string, unknown>;
}

export function captureException(error: Error, context?: ErrorContext): void {
  // In development, log to console
  if (import.meta.env.DEV) {
    console.error("[Error]", {
      message: error.message,
      stack: error.stack,
      ...context,
    });
    return;
  }

  // In production, this would send to an error tracking service
  // Example with Sentry:
  // Sentry.captureException(error, { extra: context });

  // Fallback: log to console in production too (for now)
  console.error("[Error]", error.message, context);
}

export function captureMessage(message: string, level: "info" | "warning" | "error" = "info", context?: ErrorContext): void {
  // In development, log to console
  if (import.meta.env.DEV) {
    const logMethod = level === "error" ? console.error : level === "warning" ? console.warn : console.info;
    logMethod(`[${level.toUpperCase()}]`, message, context);
    return;
  }

  // In production, this would send to an error tracking service
  // Example with Sentry:
  // Sentry.captureMessage(message, { level, extra: context });

  console.log(`[${level.toUpperCase()}]`, message);
}

export function setUserContext(userId: string, email?: string): void {
  // In production, this would set user context for error tracking
  // Example with Sentry:
  // Sentry.setUser({ id: userId, email });

  if (import.meta.env.DEV) {
    console.log("[User Context]", { userId, email });
  }
}

export function clearUserContext(): void {
  // In production, this would clear user context
  // Example with Sentry:
  // Sentry.setUser(null);
}

// Wrapper for async functions with automatic error capture
export function withErrorTracking<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  context?: ErrorContext
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof Error) {
        captureException(error, context);
      }
      throw error;
    }
  }) as T;
}
