import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TrendingUp, Users, Award, AlertTriangle } from "lucide-react";

interface Props {
  averages: string[]; // each student's avg as string ("—" or "4.25")
  totalStudents: number;
  twosCount: number;
}

export default function ClassStatsPanel({ averages, totalStudents, twosCount }: Props) {
  const numeric = averages.map((a) => parseFloat(a)).filter((n) => !isNaN(n));
  const classAvg = numeric.length ? (numeric.reduce((s, v) => s + v, 0) / numeric.length).toFixed(2) : "—";
  // Успеваемость = доля имеющих средний >= 2.5 (из тех, у кого есть оценки)
  const passing = numeric.length ? Math.round((numeric.filter((n) => n >= 2.5).length / numeric.length) * 100) : 0;
  // Качество = доля имеющих средний >= 3.5
  const quality = numeric.length ? Math.round((numeric.filter((n) => n >= 3.5).length / numeric.length) * 100) : 0;

  const items = [
    { label: "Средний по классу", value: classAvg, icon: TrendingUp, color: "text-primary" },
    { label: "Успеваемость", value: `${passing}%`, icon: Users, color: "text-emerald-600", hint: "Доля учеников со средним баллом не ниже 2,5 среди учеников с оценками." },
    { label: "Качество знаний", value: `${quality}%`, icon: Award, color: "text-amber-500", hint: "Доля учеников со средним баллом не ниже 3,5 среди учеников с оценками." },
    { label: "Двоек", value: String(twosCount), icon: AlertTriangle, color: twosCount > 0 ? "text-destructive" : "text-muted-foreground" },
  ];

  return (
    <TooltipProvider>
      <Card className="mt-3">
      <CardContent className="p-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {items.map((it) => (
          <Tooltip key={it.label}>
            <TooltipTrigger asChild>
              <div tabIndex={0} aria-label={it.hint || it.label} className="flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <div className={`w-9 h-9 rounded-lg bg-secondary flex items-center justify-center ${it.color}`}>
              <it.icon className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="text-base font-bold text-foreground leading-tight">{it.value}</div>
              <div className="text-[10px] text-muted-foreground leading-tight">{it.label}</div>
            </div>
              </div>
            </TooltipTrigger>
            {it.hint && <TooltipContent side="top" className="max-w-64 text-xs">{it.hint}</TooltipContent>}
          </Tooltip>
        ))}
        <div className="col-span-2 sm:col-span-4 text-[10px] text-muted-foreground pt-1 border-t border-border">
          Учеников всего: {totalStudents}
        </div>
      </CardContent>
      </Card>
    </TooltipProvider>
  );
}
