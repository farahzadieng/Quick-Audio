export default function Field({
  name,
  label,
  value,
  onChange,
  placeholder = '',
  multiline = false,
  disabled = false,
}) {
  const props = {
    id: `field-${name}`,
    value: value ?? '',
    onChange: (e) => onChange(name, e.target.value),
    placeholder,
    disabled,
  };
  return (
    <label className={`field ${multiline ? 'full' : ''}`} htmlFor={`field-${name}`}>
      <span>{label}</span>
      {multiline ? (
        <textarea rows={name === 'lyrics' ? 5 : 3} {...props} />
      ) : (
        <input type="text" {...props} />
      )}
    </label>
  );
}
