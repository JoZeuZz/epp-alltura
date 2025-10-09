import { useState, ChangeEvent, useCallback } from 'react';

export function useForm<T>(initialValues: T) {
  const [values, setValues] = useState<T>(initialValues);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
  };

  // Memoize the reset function. It will only be recreated if initialValues changes.
  const reset = useCallback(() => setValues(initialValues), [initialValues]);

  return { values, handleChange, reset };
}
