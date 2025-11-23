/**
 * Options for the `Abort.manageLifecycle` method.
 */
export interface ManageLifecycleOptions {
  /**
   * The object to link the listener's lifecycle to. When this object is
   * garbage-collected, the listener will be removed.
   */
  target: object;

  /**
   * The AbortSignal to listen to for an `abort` event.
   */
  signal: AbortSignal;

  /**
   * The callback to execute when the signal is aborted.
   * @param reason - The reason the signal was aborted, which is of type `unknown`.
   */
  onAbort: (reason: unknown) => void;
}

/**
 * Represents an object that has `addEventListener`, compatible with both
 * DOM EventTarget and other event emitter patterns.
 */
export interface EventTargetLike {
  addEventListener(
    eventName: string,
    listener: (...args: any[]) => void,
    options?: { once?: boolean }
  ): void;
}
