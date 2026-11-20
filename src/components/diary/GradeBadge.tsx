import { cn } from "@/lib/utils";

interface GradeBadgeProps {
  value: number;
  weight?: number;
  highlighted?: boolean;
  provisional?: boolean;
  /** Контрольная работа — красная окантовка */
  control?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Оценка-бейдж в стиле СберКласс: квадрат со скруглёнными углами,
 * крупная цифра оценки и маленький вес снизу-справа.
 */
export const GradeBadge = ({ value, weight = 1, highlighted, control, provisional, size = "md", className }: GradeBadgeProps) => {
  const sizeClasses = {
    sm: "w-9 h-9 text-base rounded-lg",
    md: "w-11 h-11 text-lg rounded-xl",
    lg: "w-14 h-14 text-2xl rounded-2xl",
  };
  const weightSize = {
    sm: "text-[8px] right-1 bottom-0.5",
    md: "text-[10px] right-1.5 bottom-1",
    lg: "text-xs right-2 bottom-1.5",
  };

  return (
    <div
      className={cn(
        "relative flex items-center justify-center font-semibold bg-slate-100 text-slate-900 shrink-0",
        highlighted && "ring-2 ring-rose-400",
        control && "ring-2 ring-rose-500 bg-rose-50",
        provisional && "outline outline-2 outline-primary/40",
        sizeClasses[size],
        className
      )}
    >
      <span>{value}{provisional && <span className="text-primary">•</span>}</span>
      <span className={cn("absolute font-normal", control ? "text-rose-600 font-semibold" : "text-slate-500", weightSize[size])}>{weight}</span>
    </div>
  );
};
