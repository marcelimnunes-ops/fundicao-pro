interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  placeholder?: string;  ← ADICIONADO
  options: Array<{ value: string | number; label: string }>;
}

export default function FormSelect({
  label,
  error,
  helperText,
  placeholder,  ← ADICIONADO
  options,
  ...props
}: FormSelectProps) {
  ...
  {placeholder && <option value="">{placeholder}</option>}  ← CORRIGIDO
