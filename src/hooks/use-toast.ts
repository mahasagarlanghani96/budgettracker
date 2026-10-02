'use client';

import { useSyncExternalStore, useCallback } from 'react';

export type ToastVariant = 'default' | 'destructive' | 'success';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
}

let toasts: Toast[] = [];
let listeners: Array<() => void> = [];
let idCounter = 0;

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void) {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function getSnapshot() {
  return toasts;
}

function addToast({ title, description, variant = 'default' }: Omit<Toast, 'id'>) {
  const id = `toast-${++idCounter}`;
  toasts = [...toasts, { id, title, description, variant }];
  emitChange();

  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emitChange();
  }, 4000);
}

function dismissToast(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  emitChange();
}

export function useToast() {
  const currentToasts = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const toast = useCallback(
    (opts: Omit<Toast, 'id'>) => addToast(opts),
    []
  );

  const dismiss = useCallback(
    (id: string) => dismissToast(id),
    []
  );

  return { toasts: currentToasts, toast, dismiss };
}
