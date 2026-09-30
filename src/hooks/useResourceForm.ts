'use client';

import { useState, useCallback } from 'react';
import { ZodNumber, type ZodObject, type ZodRawShape, type ZodError, type ZodIssue, type ZodTypeAny } from 'zod';

// ---------------------------------------------------------------------------
// useResourceForm
//
// A lightweight form hook that keeps the existing useState + Zod approach but
// standardises validation, error mapping, and submission across every page.
//
// Usage:
//   const { form, errors, serverError, saving, setField, handleSubmit, reset }
//     = useResourceForm({ schema, initial, onSubmit, onSuccess });
// ---------------------------------------------------------------------------

interface UseResourceFormOptions<S extends ZodObject<ZodRawShape>> {
  /** The Zod schema to validate against before submission */
  schema: S;
  /** Initial form values — the keys must match the schema */
  initial: Record<string, unknown>;
  /** Called with validated data; must return the fetch Response */
  onSubmit: (data: Record<string, unknown>) => Promise<Response>;
  /** Called after a successful submission (res.ok) */
  onSuccess?: () => void;
}

/** Unwrap ZodOptional / ZodNullable / ZodDefault to find the inner type */
function unwrapZod(z: ZodTypeAny): ZodTypeAny {
  while ('_def' in z && ('innerType' in z._def || 'typeName' in z._def)) {
    if (z._def.innerType) { z = z._def.innerType; continue; }
    break;
  }
  return z;
}

function isZodNumber(z: ZodTypeAny): boolean {
  return unwrapZod(z) instanceof ZodNumber;
}

function mapZodErrors(issues: ZodIssue[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path[0]?.toString();
    if (key && !errors[key]) {
      errors[key] = issue.message;
    }
  }
  return errors;
}

export function useResourceForm<S extends ZodObject<ZodRawShape>>({
  schema,
  initial,
  onSubmit,
  onSuccess,
}: UseResourceFormOptions<S>) {
  const [form, setFormState] = useState<Record<string, unknown>>({ ...initial });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  /** Update one field and clear its error */
  const setField = useCallback((name: string, value: unknown) => {
    setFormState((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
    setServerError(null);
  }, []);

  /** Replace the entire form (e.g. when opening an edit modal) */
  const setForm = useCallback((values: Record<string, unknown>) => {
    setFormState({ ...values });
    setErrors({});
    setServerError(null);
  }, []);

  /** Reset to initial values */
  const reset = useCallback((values?: Record<string, unknown>) => {
    setFormState({ ...(values ?? initial) });
    setErrors({});
    setServerError(null);
  }, [initial]);

  /** Client-only validation; returns true when valid */
  const validate = useCallback((): boolean => {
    const shape = schema.shape;
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(form)) {
      if (v === '' || v === undefined || v === null) {
        cleaned[k] = undefined;
      } else if (typeof v === 'string' && shape[k] && isZodNumber(shape[k])) {
        const n = Number(v);
        cleaned[k] = isNaN(n) ? v : n;
      } else {
        cleaned[k] = v;
      }
    }
    const result = schema.safeParse(cleaned);
    if (result.success) {
      setErrors({});
      return true;
    }
    setErrors(mapZodErrors((result as { success: false; error: ZodError }).error.issues));
    return false;
  }, [schema, form]);

  /** Prevent default, validate, submit, handle server errors */
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setServerError(null);

      // Clean form values: empty strings → undefined, string-numbers → numbers
      const shape = schema.shape;
      const cleaned: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(form)) {
        if (v === '' || v === undefined || v === null) {
          cleaned[k] = undefined;
        } else if (typeof v === 'string' && shape[k] && isZodNumber(shape[k])) {
          const n = Number(v);
          cleaned[k] = isNaN(n) ? v : n;
        } else {
          cleaned[k] = v;
        }
      }

      const result = schema.safeParse(cleaned);
      if (!result.success) {
        setErrors(mapZodErrors(result.error.issues));
        return;
      }

      setSaving(true);
      try {
        const res = await onSubmit(result.data as Record<string, unknown>);
        if (res.ok) {
          onSuccess?.();
          return;
        }

        // Try to parse server error body
        try {
          const body = await res.json();
          if (body.details && Array.isArray(body.details)) {
            setErrors(mapZodErrors(body.details));
          }
          if (body.error) {
            setServerError(body.error);
          }
        } catch {
          setServerError('An unexpected error occurred');
        }
      } catch {
        setServerError('Network error — please try again');
      } finally {
        setSaving(false);
      }
    },
    [schema, form, onSubmit, onSuccess]
  );

  return {
    form,
    errors,
    serverError,
    saving,
    setField,
    setForm,
    handleSubmit,
    validate,
    reset,
  };
}
