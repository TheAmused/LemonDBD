// frontend/src/components/smash-or-pass/creator/RequiredMark.tsx

/** The red asterisk after the label of a field the form cannot be saved without. */
export function RequiredMark() {
  return (
    <span className="ml-0.5 text-accent-red" aria-hidden="true">
      *
    </span>
  );
}
