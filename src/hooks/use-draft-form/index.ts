import { Dispatch, FormEvent, SetStateAction, useState } from "react";
import { getErrorMessage } from "react-error-boundary";
import { z } from "zod";

type FieldErrors = Record<string, string>;

type SubmitAction<Values> = (values: Values) => void | Promise<void>;

type UseDraftFormOptions<Values extends Record<string, unknown>> = {
  schema: z.ZodType<Values>;
  /** Pass a factory when the initial draft contains generated ids. */
  initialValues: Values | (() => Values);
  /** Called with the parsed, valid values once the draft passes `schema`. */
  onValid: SubmitAction<Values>;
};

/**
 * Owns a form's draft state, Zod validation, and submit lifecycle,
 * independent of how the valid result gets submitted (a mutation, a server
 * action, whatever). Field error keys are dotted paths (`"sections.0.name"`),
 * matching HeroUI `TextField`/`FieldError` `name`s so they can be handed
 * straight to `Form`'s `validationErrors` prop.
 */
export function useDraftForm<Values extends Record<string, unknown>>({
  schema,
  initialValues,
  onValid,
}: UseDraftFormOptions<Values>) {
  const [values, setValues] = useState<Values>(initialValues);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function setField<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  /**
   * Validate the draft, then run `action` with the parsed values. Owning the
   * pending state here (rather than reading a mutation's `loading`) keeps it
   * accurate for submits that take more than one step — e.g. uploading a
   * photo before the mutation runs.
   */
  async function validateThen(action: SubmitAction<Values>) {
    const result = schema.safeParse(values);
    if (!result.success) {
      const errors: FieldErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join(".");
        errors[key] ??= issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await action(result.data);
    } catch (error) {
      setSubmitError(getErrorMessage(error) ?? "Unknown error");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    void validateThen(onValid);
  }

  return {
    values,
    setValues: setValues as Dispatch<SetStateAction<Values>>,
    setField,
    fieldErrors,
    submitError,
    setSubmitError,
    isSubmitting,
    /** For alternate submit actions that share validation (e.g. Save as Copy). */
    validateThen,
    handleSubmit,
  };
}
