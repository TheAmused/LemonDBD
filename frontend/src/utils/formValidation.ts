// frontend/src/utils/formValidation.ts
//
// Turns a form control's constraint-validation state into ONE localized sentence.
// The browser's own `validationMessage` is in the browser's language, not the
// site's, so the app never shows it (see components/common/FormValidation.tsx).
import { formatMessage } from '@/utils/i18nFormat';

export interface ValidationMessages {
  valueMissing: string;
  valueMissingCheckbox: string;
  valueMissingSelect: string;
  typeMismatchEmail: string;
  typeMismatchUrl: string;
  tooShort: string;
  tooLong: string;
  rangeUnderflow: string;
  rangeOverflow: string;
  stepMismatch: string;
  badInput: string;
  patternMismatch: string;
  invalidValue: string;
}

/** The slice of an input/select/textarea the message depends on (structural, so it runs without a DOM). */
export interface ValidatableControl {
  tagName: string;
  type?: string;
  /** For `pattern` fields the author's `title` explains the expected format. */
  title?: string;
  min?: string;
  max?: string;
  minLength?: number;
  maxLength?: number;
  /** Only read for `setCustomValidity` messages written by the app itself. */
  validationMessage?: string;
  validity: Pick<
    ValidityState,
    | 'customError'
    | 'valueMissing'
    | 'typeMismatch'
    | 'tooShort'
    | 'tooLong'
    | 'rangeUnderflow'
    | 'rangeOverflow'
    | 'stepMismatch'
    | 'badInput'
    | 'patternMismatch'
  >;
}

export function getValidationMessage(el: ValidatableControl, t: ValidationMessages): string {
  const v = el.validity;
  const type = (el.type || '').toLowerCase();

  // Messages the app set itself with setCustomValidity() are already written for the user.
  if (v.customError && el.validationMessage) return el.validationMessage;

  if (v.valueMissing) {
    if (type === 'checkbox' || type === 'radio') return t.valueMissingCheckbox;
    if (el.tagName.toLowerCase() === 'select') return t.valueMissingSelect;
    return t.valueMissing;
  }
  if (v.typeMismatch) {
    if (type === 'email') return t.typeMismatchEmail;
    if (type === 'url') return t.typeMismatchUrl;
    return t.invalidValue;
  }
  if (v.tooShort) return formatMessage(t.tooShort, { min: el.minLength });
  if (v.tooLong) return formatMessage(t.tooLong, { max: el.maxLength });
  if (v.rangeUnderflow) return formatMessage(t.rangeUnderflow, { min: el.min });
  if (v.rangeOverflow) return formatMessage(t.rangeOverflow, { max: el.max });
  if (v.stepMismatch) return t.stepMismatch;
  if (v.badInput) return t.badInput;
  if (v.patternMismatch) return el.title || t.patternMismatch;
  return t.invalidValue;
}
