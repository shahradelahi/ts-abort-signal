import { TimeoutError } from './errors';
import type { EventTargetLike, ManageLifecycleOptions } from './typings';

/**
 * A manager class providing a suite of utilities for working with `AbortSignal`.
 * All methods are available on the exported `Abort` instance.
 */
class AbortManager {
  #neverSignal: AbortSignal | undefined;

  /**
   * Creates an `AbortSignal` that aborts after a specified number of milliseconds.
   * The signal aborts with a `TimeoutError`.
   *
   * @param milliseconds - The number of milliseconds to wait before aborting the signal.
   * @returns An `AbortSignal` that will be aborted after the timeout.
   * @example
   * ```
   * import { Abort, TimeoutError } from 'abort-signal';
   *
   * try {
   *   const response = await fetch(url, { signal: Abort.timeout(3000) });
   * } catch (error) {
   *   if (error instanceof TimeoutError) {
   *     console.log('Request timed out!');
   *   }
   * }
   * ```
   */
  timeout(milliseconds: number): AbortSignal {
    const controller = new AbortController();
    setTimeout(() => {
      controller.abort(new TimeoutError(`Signal timed out after ${milliseconds}ms`));
    }, milliseconds);
    return controller.signal;
  }

  /**
   * Creates an `AbortSignal` that aborts when any of the provided signals abort.
   * This is the signal equivalent of `Promise.race()`.
   *
   * @param signals - An iterable of `AbortSignal` instances.
   * @returns A new `AbortSignal` that aborts when the first of the input signals aborts.
   * @example
   * ```
   * import { Abort } from 'abort-signal';
   *
   * const userClickSignal = Abort.fromEvent(cancelButton, 'click');
   * const timeoutSignal = Abort.timeout(10000);
   *
   * // Aborts on user click OR timeout, whichever comes first.
   * const combinedSignal = Abort.any([userClickSignal, timeoutSignal]);
   * await longRunningOperation({ signal: combinedSignal });
   * ```
   */
  any(signals: Iterable<AbortSignal>): AbortSignal {
    const controller = new AbortController();
    const signalArray = Array.from(signals);

    const cleanup = () => {
      for (const signal of signalArray) {
        signal.removeEventListener('abort', onAbort);
      }
    };

    function onAbort(this: AbortSignal) {
      controller.abort(this.reason);
      cleanup();
    }

    for (const signal of signalArray) {
      if (signal.aborted) {
        controller.abort(signal.reason);
        return controller.signal;
      }
      signal.addEventListener('abort', onAbort);
    }

    return controller.signal;
  }

  /**
   * Links an `abort` listener's lifecycle to an object's lifecycle to prevent memory leaks.
   * When the `target` object is garbage-collected, the `onAbort` listener is automatically removed from the signal.
   *
   * @param options - The options for managing the lifecycle.
   * @param options.target - The object to link the listener's lifecycle to.
   * @param options.signal - The `AbortSignal` to listen to.
   * @param options.onAbort - The callback to execute when the signal is aborted.
   * @example
   * ```
   * import { Abort } from 'abort-signal';
   *
   * class DataFetcher {
   *   constructor(signal) {
   *     Abort.manageLifecycle({
   *       target: this, // Link listener to this instance
   *       signal: signal,
   *       onAbort: (reason) => this.#cleanup(reason),
   *     });
   *   }
   *   #cleanup(reason) { }
   * }
   * ```
   */
  manageLifecycle(options: ManageLifecycleOptions): void {
    const { target, signal, onAbort } = options;

    if (signal.aborted) {
      onAbort(signal.reason);
      return;
    }

    const cleanupId = Symbol('cleanup');

    const eventListener = () => onAbort(signal.reason);

    const finalizationRegistry = new FinalizationRegistry((id) => {
      if (id === cleanupId) {
        signal.removeEventListener('abort', eventListener);
      }
    });

    signal.addEventListener('abort', eventListener, { once: true });
    finalizationRegistry.register(target, cleanupId);
  }

  /**
   * Creates a new `AbortController` whose signal is automatically aborted if the parent signal is aborted.
   * This is useful for creating cancellable sub-scopes.
   *
   * @param parentSignal - The `AbortSignal` to follow.
   * @returns A new `AbortController` linked to the parent signal.
   * @example
   * ```
   * import { Abort } from 'abort-signal';
   *
   * function mainOperation({ signal: pageSignal }) {
   *   const subOpController = Abort.follow(pageSignal);
   *
   *   // This sub-operation will be cancelled automatically if pageSignal aborts.
   *   runSubOperation({ signal: subOpController.signal });
   *
   *   // Now we can cancel just the sub-operation.
   *   if (someCondition) subOpController.abort();
   * }
   * ```
   */
  follow(parentSignal: AbortSignal): AbortController {
    const controller = new AbortController();

    if (parentSignal.aborted) {
      controller.abort(parentSignal.reason);
      return controller;
    }

    const onAbort = () => {
      controller.abort(parentSignal.reason);
    };

    parentSignal.addEventListener('abort', onAbort, { once: true });

    return controller;
  }

  /**
   * Creates an `AbortSignal` that aborts when a specified DOM event is fired on a target.
   *
   * @param target - The `EventTarget` (e.g., a DOM element or `window`) to listen on.
   * @param eventName - The name of the event to listen for.
   * @returns An `AbortSignal` that aborts when the event occurs.
   * @example
   * ```
   * import { Abort } from 'abort-signal';
   *
   * // Signal will abort as soon as the user navigates away or closes the tab.
   * const signal = Abort.fromEvent(window, 'unload');
   * saveDraftToServer({ signal });
   * ```
   */
  fromEvent(target: EventTargetLike, eventName: string): AbortSignal {
    const controller = new AbortController();
    target.addEventListener(
      eventName,
      (event) => {
        controller.abort(event);
      },
      { once: true }
    );
    return controller.signal;
  }

  /**
   * Returns a singleton `AbortSignal` that is guaranteed to never be aborted.
   * This is a declarative alternative to `new AbortController().signal` for APIs that require a signal but for which cancellation is not desired.
   *
   * @returns An `AbortSignal` that will never be aborted.
   * @example
   * ```
   * import { Abort } from 'abort-signal';
   *
   * // This function requires a signal, but for this call,
   * // we want to ensure the operation runs to completion.
   * await criticalOperation({ signal: Abort.never() });
   * ```
   */
  never(): AbortSignal {
    if (!this.#neverSignal) {
      const controller = new AbortController();
      // We never call controller.abort(), so this signal will never be aborted.
      this.#neverSignal = controller.signal;
    }
    return this.#neverSignal;
  }
}

/**
 * An instance of `AbortManager` providing a suite of static-like utilities
 * for working with `AbortSignal`.
 */
export const Abort = new AbortManager();

export * from './errors';
export type * from './typings';
