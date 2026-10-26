'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { CalendarDays } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, value, placeholder, ...props }, ref) => {
    if (type === 'date') {
      return (
        <DateInputInner
          ref={ref}
          className={className}
          value={value}
          placeholder={placeholder}
          {...props}
        />
      );
    }

    return (
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        className={cn(
          'flex h-10 w-full rounded-[var(--radius-sm)] border border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 py-2 text-sm text-[var(--text-primary)] ring-offset-[var(--bg-deep)] file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[var(--text-tertiary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--emerald)]/40 focus-visible:border-[var(--emerald)]/50 disabled:cursor-not-allowed disabled:opacity-50 transition-colors',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

const DateInputInner = React.forwardRef<HTMLInputElement, Omit<InputProps, 'type'>>(
  ({ className, value, placeholder, ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null);

    function setRefs(node: HTMLInputElement | null) {
      (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
    }

    function openPicker() {
      if (props.disabled) return;
      try { inputRef.current?.showPicker?.(); } catch { /* Safari fallback */ }
      inputRef.current?.focus();
    }

    const strVal = typeof value === 'string' ? value : (value != null ? String(value) : '');
    let displayValue = '';
    if (strVal) {
      try {
        displayValue = new Date(strVal + 'T00:00:00').toLocaleDateString('en-US', {
          day: 'numeric', month: 'short', year: 'numeric',
        });
      } catch {
        displayValue = strVal;
      }
    }

    return (
      <div
        className={cn(
          'relative flex items-center h-10 w-full rounded-[var(--radius-sm)] border border-[var(--glass-border)] bg-[var(--glass-bg)] cursor-pointer transition-colors hover:border-[var(--glass-border-hover)] focus-within:ring-2 focus-within:ring-[var(--emerald)]/40 focus-within:border-[var(--emerald)]/50',
          props.disabled && 'cursor-not-allowed opacity-50',
          className
        )}
        onClick={openPicker}
      >
        <span
          className={cn(
            'flex-1 px-3 text-sm select-none truncate',
            displayValue ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'
          )}
        >
          {displayValue || placeholder || 'Select date'}
        </span>
        <div className="flex items-center justify-center px-3 text-[var(--text-secondary)]">
          <CalendarDays className="h-4 w-4" />
        </div>
        <input
          type="date"
          ref={setRefs}
          value={strVal}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          tabIndex={-1}
          {...props}
        />
      </div>
    );
  }
);
DateInputInner.displayName = 'DateInputInner';

export { Input };
