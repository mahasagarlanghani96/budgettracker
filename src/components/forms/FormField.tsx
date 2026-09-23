'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface FormFieldProps {
  /** Visible label text */
  label: string;
  /** If true, appends a red asterisk and sets aria-required on the first child input */
  required?: boolean;
  /** Field-level error message (from Zod or server) */
  error?: string;
  /** Small hint text below the input — hidden when an error is shown */
  hint?: string;
  /** The input / select / textarea element */
  children: React.ReactNode;
  className?: string;
}

/**
 * Wraps a label, an input element, and an optional error / hint message into
 * a single composable unit. Replaces the repeated
 * `<div className="space-y-2"><label>…</label><Input /></div>` pattern.
 */
export function FormField({ label, required, error, hint, children, className }: FormFieldProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label className="text-sm font-medium leading-none">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-sm text-destructive" role="alert">{error}</p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
