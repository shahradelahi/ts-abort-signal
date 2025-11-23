import { describe, expect, it, vi } from 'vitest';

import { Abort, TimeoutError } from './index';

// A simple utility to wait for a signal to be aborted
const onAbort = (signal: AbortSignal) => {
  return new Promise<Event>((resolve) => {
    if (signal.aborted) {
      resolve(new Event('abort'));
    } else {
      signal.addEventListener('abort', resolve, { once: true });
    }
  });
};

describe('Abort', () => {
  describe('timeout', () => {
    it('should create a signal that aborts after the specified time', async () => {
      const timeoutMs = 50;
      const signal = Abort.timeout(timeoutMs);
      expect(signal.aborted).toBe(false);
      await onAbort(signal);
      expect(signal.aborted).toBe(true);
      expect(signal.reason).toBeInstanceOf(TimeoutError);
      expect(signal.reason.message).toBe(`Signal timed out after ${timeoutMs}ms`);
    });
  });

  describe('any', () => {
    it('should abort with the reason of the signal that aborts', async () => {
      const controller1 = new AbortController();
      const controller2 = new AbortController();
      const combinedSignal = Abort.any([controller1.signal, controller2.signal]);
      const abortReason = 'controller 1 aborted';

      expect(combinedSignal.aborted).toBe(false);

      controller1.abort(abortReason);
      await onAbort(combinedSignal);

      expect(combinedSignal.aborted).toBe(true);
      expect(combinedSignal.reason).toBe(abortReason);
    });

    it('should be aborted immediately if one of the signals is already aborted, with the correct reason', () => {
      const controller = new AbortController();
      const abortReason = 'already aborted';
      controller.abort(abortReason);
      const combinedSignal = Abort.any([new AbortController().signal, controller.signal]);
      expect(combinedSignal.aborted).toBe(true);
      expect(combinedSignal.reason).toBe(abortReason);
    });
  });

  describe('manageLifecycle', () => {
    it('should call onAbort when the signal is aborted', async () => {
      const controller = new AbortController();
      const target = {};
      const onAbort = vi.fn();

      Abort.manageLifecycle({ target, signal: controller.signal, onAbort });
      expect(onAbort).not.toHaveBeenCalled();

      controller.abort('Test Abort');
      expect(onAbort).toHaveBeenCalledWith('Test Abort');
    });

    it('should call onAbort immediately if the signal is already aborted', () => {
      const controller = new AbortController();
      controller.abort('Already Aborted');
      const target = {};
      const onAbort = vi.fn();

      Abort.manageLifecycle({ target, signal: controller.signal, onAbort });
      expect(onAbort).toHaveBeenCalledWith('Already Aborted');
    });
  });

  describe('follow', () => {
    it('should return a controller that aborts when the parent signal aborts', async () => {
      const parentController = new AbortController();
      const childController = Abort.follow(parentController.signal);

      expect(childController.signal.aborted).toBe(false);

      parentController.abort('Parent Aborted');
      await onAbort(childController.signal);

      expect(childController.signal.aborted).toBe(true);
      expect(childController.signal.reason).toBe('Parent Aborted');
    });

    it('should return an already aborted controller if the parent is already aborted', () => {
      const parentController = new AbortController();
      parentController.abort('Parent Aborted');
      const childController = Abort.follow(parentController.signal);
      expect(childController.signal.aborted).toBe(true);
      expect(childController.signal.reason).toBe('Parent Aborted');
    });
  });

  describe('fromEvent', () => {
    it('should create a signal that aborts with the event as the reason', async () => {
      const mockEventTarget = {
        listeners: new Map<string, Set<(event: Event) => void>>(),
        addEventListener(
          eventName: string,
          listener: (event: Event) => void,
          options?: AddEventListenerOptions
        ) {
          if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, new Set());
          }
          this.listeners.get(eventName)?.add(listener);
          if (options?.once) {
            const originalListener = listener;
            listener = (event: Event) => {
              originalListener(event);
              this.removeEventListener(eventName, listener);
            };
          }
        },
        removeEventListener(eventName: string, listener: (event: Event) => void) {
          this.listeners.get(eventName)?.delete(listener);
        },
        dispatchEvent(event: Event) {
          this.listeners.get(event.type)?.forEach((listener) => listener(event));
          return true;
        },
      };

      const signal = Abort.fromEvent(mockEventTarget as EventTarget, 'testEvent');
      const testEvent = new Event('testEvent');

      expect(signal.aborted).toBe(false);
      mockEventTarget.dispatchEvent(testEvent);
      await onAbort(signal);
      expect(signal.aborted).toBe(true);
      expect(signal.reason).toBe(testEvent);
    });
  });

  describe('never', () => {
    it('should return a signal that is never aborted', () => {
      const signal = Abort.never();
      expect(signal.aborted).toBe(false);
      // It should not be possible to abort it.
    });

    it('should return the same signal instance every time', () => {
      const signal1 = Abort.never();
      const signal2 = Abort.never();
      expect(signal1).toBe(signal2);
    });
  });
});
