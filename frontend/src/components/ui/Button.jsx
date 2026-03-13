import { cn } from "../../utils/cn";

const variants = {
  primary: "btn btn-primary",
  secondary: "btn btn-secondary",
  ghost: "btn btn-ghost",
};

const sizes = {
  sm: "btn-sm",
  md: "btn-md",
  lg: "btn-lg",
};

const Button = ({
  children,
  className,
  variant = "primary",
  size = "md",
  type = "button",
  isLoading = false,
  disabled = false,
  ...props
}) => {
  return (
    <button
      type={type}
      className={cn(
        variants[variant],
        sizes[size],
        "disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <span className="size-4 rounded-full border-2 border-current/30 border-t-current animate-spin" />
          <span>{children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};

export default Button;
