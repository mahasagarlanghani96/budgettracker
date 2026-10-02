'use client';

import { useState, useCallback, useRef } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/modal';
import { Button } from '@/components/ui/button';

interface ConfirmOptions {
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}

export function useConfirm() {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({});
  const resolveRef = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback((message: string, opts?: ConfirmOptions): Promise<boolean> => {
    setOptions({ description: message, ...opts });
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  function handleConfirm() {
    setOpen(false);
    resolveRef.current?.(true);
  }

  function handleCancel() {
    setOpen(false);
    resolveRef.current?.(false);
  }

  const ConfirmDialog = (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleCancel(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{options.title || 'Confirm'}</DialogTitle>
          {options.description && <DialogDescription>{options.description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            {options.cancelLabel || 'Cancel'}
          </Button>
          <Button
            variant={options.destructive !== false ? 'destructive' : 'default'}
            onClick={handleConfirm}
          >
            {options.confirmLabel || 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return { confirm, ConfirmDialog };
}
