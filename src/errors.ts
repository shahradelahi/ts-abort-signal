/**
 * A custom error thrown when an operation times out.
 * This error is used by `Abort.timeout()` to indicate that the abort signal was triggered due to a timeout.
 */
export class TimeoutError extends Error {
  constructor(message: string = 'The operation timed out.') {
    super(message);
    this.name = 'TimeoutError';
  }
}
