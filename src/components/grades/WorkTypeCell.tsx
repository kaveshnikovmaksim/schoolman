import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface WorkTypeCellProps {
  dateStr: string;
  sw: { work_type_id: string; short_name: string; name: string } | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSetWorkType: (dateStr: string, workTypeId: string) => void;
  onRemoveWorkType: (dateStr: string) => void;
  workTypes: any[];
}

export default function WorkTypeCell({ dateStr, sw, isOpen, onOpenChange, onSetWorkType, onRemoveWorkType, workTypes }: WorkTypeCellProps) {
  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button className="w-full min-h-[22px] text-[10px] hover:bg-primary/10 transition-colors leading-tight px-0.5">
          {sw ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-primary font-medium cursor-default">{sw.short_name}</span>
              </TooltipTrigger>
              <TooltipContent><p>{sw.name}</p></TooltipContent>
            </Tooltip>
          ) : ""}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2 max-w-[200px]" side="bottom" align="center">
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground mb-1.5">Вид работы:</div>
          {workTypes.length > 0 ? (
            <div className="space-y-1">
              {workTypes.map((wt: any) => (
                <button
                  key={wt.id}
                  onClick={() => onSetWorkType(dateStr, wt.id)}
                  className={`w-full text-left text-xs px-2 py-1.5 rounded hover:bg-secondary transition-colors ${sw?.work_type_id === wt.id ? "bg-primary/10 text-primary font-medium" : ""}`}
                >
                  {wt.name}
                </button>
              ))}
              {sw && (
                <button
                  onClick={() => onRemoveWorkType(dateStr)}
                  className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-destructive/10 text-destructive transition-colors border-t border-border mt-1 pt-1.5"
                >
                  Убрать
                </button>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Нет видов работ для этого предмета.</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
