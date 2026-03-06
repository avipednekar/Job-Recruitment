import { cn } from "../../utils/cn";

const tones = {
  brand: "badge badge-brand",
  neutral: "badge badge-neutral",
  success: "badge badge-success",
};

const Badge = ({ children, tone = "neutral", className }) => {
  return <span className={cn(tones[tone], className)}>{children}</span>;
};

export default Badge;
