import { cn } from "../../utils/cn";

const InputField = ({
  label,
  id,
  icon,
  rightIcon,
  error,
  className,
  inputClassName,
  ...props
}) => {
  return (
    <label htmlFor={id} className={cn("block space-y-2", className)}>
      <span className="text-sm font-semibold text-text-primary">{label}</span>
      <span className="relative block">
        {icon ? <span className="absolute inset-y-0 left-3 flex items-center text-text-secondary">{icon}</span> : null}
        <input
          id={id}
          className={cn(
            "input-field",
            icon && "pl-10",
            rightIcon && "pr-12",
            error && "border-error/60 focus-visible:ring-error/30",
            inputClassName
          )}
          {...props}
        />
        {rightIcon ? <span className="absolute inset-y-0 right-3 flex items-center text-text-secondary">{rightIcon}</span> : null}
      </span>
      {error ? <span className="block text-sm text-error">{error}</span> : null}
    </label>
  );
};

export default InputField;
