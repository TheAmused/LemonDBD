'use client';
// frontend/src/components/common/DateTimePicker.tsx
//
// THE date and time picker: a field that opens react-datepicker (a calendar with a time list beside it).
// The day is picked first, then the time, which closes it; the clear button empties the field. The look
// is in app/styles/datepicker.css (the library's own stylesheet is not used).
//
// The value is the one a `datetime-local` input uses ("YYYY-MM-DDTHH:mm", the viewer's time zone), so the
// helpers in admin/settingsForm.ts convert it to and from the UTC times a server stores. '' is "not set".
import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import { de } from 'date-fns/locale/de';
import { enUS } from 'date-fns/locale/en-US';
import { es } from 'date-fns/locale/es';
import { ja } from 'date-fns/locale/ja';
import { pl } from 'date-fns/locale/pl';
import { FieldButton, type FieldButtonProps, type FieldSize } from '@/components/common/Field';
import { useLocale } from '@/context/DictionaryContext';
import { cn } from '@/utils/cn';
import { formatDateTime } from '@/utils/format';

export interface DateTimePickerLabels {
  /** Shown in the field while no time is set. */
  placeholder: string;
  /** The clear button's name. */
  clear: string;
  /** The heading over the time list. */
  time: string;
}

interface DateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  labels: DateTimePickerLabels;
  id?: string;
  fieldSize?: FieldSize;
  disabled?: boolean;
  className?: string;
}

const CALENDAR_LOCALES = { en: enUS, pl, de, es, ja };
/** Minutes between the times in the list. */
const TIME_STEP = 5;
const PORTAL_ID = 'datepicker-portal';

const pad = (n: number): string => String(n).padStart(2, '0');

const valueOf = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/** The text the library hands a custom input, and the props meant for a text box, are dropped: this is a button. */
type PickerFieldProps = FieldButtonProps & { text: string; empty: boolean; value?: string; readOnly?: boolean; autoComplete?: string; placeholder?: string };

const PickerField = React.forwardRef<HTMLButtonElement, PickerFieldProps>(function PickerField(
  { text, empty, value: _value, readOnly: _readOnly, autoComplete: _autoComplete, onChange: _onChange, placeholder: _placeholder, ...rest },
  ref
) {
  return (
    <FieldButton ref={ref} {...rest}>
      <span className={cn('truncate', empty && 'text-text-muted')}>{text}</span>
    </FieldButton>
  );
});

export function DateTimePicker({ value, onChange, labels, id, fieldSize = 'sm', disabled = false, className }: DateTimePickerProps) {
  const locale = useLocale();
  const picked = value ? new Date(value) : null;
  const selected = picked && !Number.isNaN(picked.getTime()) ? picked : null;
  /** Days before it cannot be chosen; looked up again each time the picker opens (the page may stay open past midnight). */
  const [today, setToday] = useState(startOfToday);
  const text = selected ? formatDateTime(selected, locale, { dateStyle: 'medium', timeStyle: 'short' }) : labels.placeholder;

  return (
    <DatePicker
      id={id}
      selected={selected}
      onChange={(date: Date | null) => onChange(date ? valueOf(date) : '')}
      onCalendarOpen={() => setToday(startOfToday())}
      locale={CALENDAR_LOCALES[locale as keyof typeof CALENDAR_LOCALES] ?? enUS}
      showTimeSelect
      timeIntervals={TIME_STEP}
      timeCaption={labels.time}
      minDate={today}
      filterTime={(time) => time.getTime() > Date.now()}
      isClearable
      clearButtonTitle={labels.clear}
      disabled={disabled}
      portalId={PORTAL_ID}
      popperPlacement="bottom-start"
      showPopperArrow={false}
      customInput={<PickerField text={text} empty={!selected} fieldSize={fieldSize} className={className} />}
    />
  );
}
