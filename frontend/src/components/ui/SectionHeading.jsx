import { cn } from "../../utils/cn";

const SectionHeading = ({ title, subtitle, align = "left", className }) => {
  return (
    <div className={cn("space-y-3", align === "center" && "text-center", className)}>
      <h2 className="font-display text-3xl sm:text-4xl text-text-primary tracking-tight">{title}</h2>
      {subtitle ? (
        <p className={cn("max-w-2xl text-base sm:text-lg text-text-secondary leading-relaxed", align === "center" && "mx-auto")}>
          {subtitle}
        </p>
      ) : null}
    </div>
  );
};

export default SectionHeading;
