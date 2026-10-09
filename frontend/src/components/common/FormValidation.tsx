'use client';
// frontend/src/components/common/FormValidation.tsx
//
// THE single place form validation is shown. Mount <FormValidationProvider/>
// once (root layout, next to <TooltipProvider/>). From then on every native
// `required`, `type="email"`, `minLength`, `min`/`max`, `pattern` ... check in
// the app reports through the app's own tooltip, in the site's language,
// instead of the browser's grey "Please fill out this field." bubble.
//
// How: the browser fires an `invalid` event on each bad control when a form is
// submitted. Cancelling it suppresses the native bubble; we then focus the
// first bad control (as the browser would) and point a styled bubble at it.
// Forms need no changes: keep using `required`, `type`, `minLength`...

import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { TooltipBubble } from '@/components/common/Tooltip';
import { useDictionary } from '@/context/DictionaryContext';
import { getValidationMessage } from '@/utils/formValidation';

type FormControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

const AUTO_HIDE_MS = 6000;

const isFormControl = (target: EventTarget | null): target is FormControl =>
  target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement;

interface ActiveError {
  el: FormControl;
  message: string;
}

export const FormValidationProvider: React.FC = () => {
  const dict = useDictionary();
  const [active, setActive] = useState<ActiveError | null>(null);

  // The listeners below live for the whole session; they read the current language from here.
  const messages = useRef(dict.validation);
  useEffect(() => {
    messages.current = dict.validation;
  }, [dict.validation]);

  useEffect(() => {
    let reportedThisSubmit = false;
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    // Controls we flagged ourselves, so clearing never strips an aria-invalid a component set on purpose.
    const flagged = new WeakSet<FormControl>();

    const hide = () => {
      clearTimeout(hideTimer);
      setActive(null);
    };

    const onInvalid = (e: Event) => {
      const el = e.target;
      if (!isFormControl(el)) return;
      e.preventDefault(); // no native bubble

      if (!el.hasAttribute('aria-invalid')) {
        el.setAttribute('aria-invalid', 'true');
        flagged.add(el);
      }

      // A submit fires `invalid` for every bad control in one go; like the browser, only the first is reported.
      if (reportedThisSubmit) return;
      reportedThisSubmit = true;
      setTimeout(() => {
        reportedThisSubmit = false;
      }, 0);

      setActive({ el, message: getValidationMessage(el, messages.current) });
      el.focus();
      clearTimeout(hideTimer);
      hideTimer = setTimeout(hide, AUTO_HIDE_MS);
    };

    // Typing or choosing fixes the problem (or at least acknowledges it): drop the bubble, and the red state once valid.
    const onEdit = (e: Event) => {
      const el = e.target;
      if (!isFormControl(el) || !flagged.has(el)) return;
      setActive((prev) => (prev?.el === el ? null : prev));
      if (el.validity.valid) {
        el.removeAttribute('aria-invalid');
        flagged.delete(el);
      }
    };

    const onFocusOut = (e: FocusEvent) => {
      setActive((prev) => (prev && prev.el === e.target ? null : prev));
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hide();
    };

    // `invalid` does not bubble, so listen in the capture phase on the document.
    document.addEventListener('invalid', onInvalid, true);
    document.addEventListener('input', onEdit, true);
    document.addEventListener('change', onEdit, true);
    document.addEventListener('focusout', onFocusOut);
    document.addEventListener('mousedown', hide);
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(hideTimer);
      document.removeEventListener('invalid', onInvalid, true);
      document.removeEventListener('input', onEdit, true);
      document.removeEventListener('change', onEdit, true);
      document.removeEventListener('focusout', onFocusOut);
      document.removeEventListener('mousedown', hide);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  // The field may be unmounted (modal closed, mode switched) while its bubble is up.
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      if (!active.el.isConnected) setActive(null);
    }, 500);
    return () => clearInterval(id);
  }, [active]);

  if (!active) return null;
  return (
    <>
      <TooltipBubble anchor={active.el} placement="bottom" variant="error">
        <span className="flex items-center gap-2 text-xs font-bold text-text-primary">
          <AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0 text-accent-red" />
          <span>{active.message}</span>
        </span>
      </TooltipBubble>
      <span role="alert" className="sr-only">
        {active.message}
      </span>
    </>
  );
};
