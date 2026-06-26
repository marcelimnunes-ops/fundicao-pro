import { useState, useCallback } from 'react';

interface FormErrors {
  [key: string]: string;
}

interface UseFormReturn<T> {
  values: T;
  errors: FormErrors;
  touched: { [key: string]: boolean };
  setValue: (field: keyof T, value: any) => void;
  setError: (field: string, error: string) => void;
  setTouched: (field: string, value: boolean) => void;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  handleBlur: (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => void;
  resetForm: () => void;
  validate: () => boolean;
  isValid: boolean;
}

export function useForm<T extends Record<string, any>>(
  initialValues: T,
  validate?: (values: T) => FormErrors
): UseFormReturn<T> {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name, value, type } = e.target;
      const finalValue = type === 'number' ? parseFloat(value) : value;
      
      setValues((prev) => ({
        ...prev,
        [name]: finalValue,
      }));

      if (errors[name]) {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[name];
          return newErrors;
        });
      }
    },
    [errors]
  );

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
      const { name } = e.target;
      setTouched((prev) => ({
        ...prev,
        [name]: true,
      }));
    },
    []
  );

  const setValue = useCallback((field: keyof T, value: any) => {
    setValues((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const setError = useCallback((field: string, error: string) => {
    setErrors((prev) => ({
      ...prev,
      [field]: error,
    }));
  }, []);

  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  const validateForm = useCallback((): boolean => {
    if (!validate) return true;

    const newErrors = validate(values);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [values, validate]);

  const isValid = Object.keys(errors).length === 0;

  return {
    values,
    errors,
    touched,
    setValue,
    setError,
    setTouched,
    handleChange,
    handleBlur,
    resetForm,
    validate: validateForm,
    isValid,
  };
}
