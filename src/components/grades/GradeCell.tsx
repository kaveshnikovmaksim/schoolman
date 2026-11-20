import { useState, useEffect, useRef } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { X, Lock, MessageSquare } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { type GradeEntry, isProvisionalActive, gradeColor } from "@/pages/teacher/Grades";
import GradeHistorySection from "@/components/grades/GradeHistorySection";
import { isControlWorkTypeName, MAX_GRADE_WEIGHT } from "@/lib/gradeWeight";

/** Оценка в ячейке журнала: без рамки; вес (если > 1) — серая полупрозрачная цифра в правом нижнем углу */
const CellGrade = ({ g, prov, dim }: { g: GradeEntry; prov: boolean; dim?: boolean }) => {
  const weight = g.weight ?? 1;
  return (
    <span className={`relative inline-flex items-baseline justify-center leading-none ${gradeColor(g.value, prov)} ${dim ? "opacity-70" : ""}`}>
      {g.value}{prov && <span className="text-destructive">•</span>}
      {weight > 1 && (
        <span className="absolute -bottom-0.5 -right-1.5 text-[8px] font-semibold text-muted-foreground/60 leading-none">{weight}</span>
      )}
    </span>
  );
};

interface GradeCellHistoryRefs {
  studentId: string;
  subjectId: string;
}

const GRADE_VALUES = [5, 4, 3, 2] as const;

interface GradeCellProps {
  cellKey: string;
  grades: GradeEntry[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAddGrade: (value: number, provisionalUntil?: string, workTypeId?: string, comment?: string, weight?: number) => void;
  onRemoveGrade: (id: string) => void;
  onUpdateGrade?: (id: string, value: number) => void;
  workTypes: any[];
  dateStr: string;
  studentName: string;
  absenceType?: string | null;
  onSetAbsence: (type: string) => void;
  onRemoveAbsence: () => void;
  cellComment?: string;
  onSaveComment: (comment: string) => void;
  columnLastWorkType?: string;
  readOnly?: boolean;
  locked?: boolean;
  showLock?: boolean;
  lockReason?: string;
  studentId?: string;
  subjectId?: string;
}

export default function GradeCell({
  grades, isOpen, onOpenChange, onAddGrade, onRemoveGrade, onUpdateGrade,
  workTypes, dateStr, studentName,
  absenceType, onSetAbsence, onRemoveAbsence,
  cellComment = "", onSaveComment,
  columnLastWorkType = "",
  readOnly = false,
  locked = false,
  showLock = false,
  lockReason,
  studentId, subjectId,
}: GradeCellProps) {
  // Default work type priority:
  //   1) category of an existing grade in THIS cell (so re-opening shows what's there)
  //   2) last category used in THIS date column
  const existingWorkTypeId = grades.find(g => g.work_type_id)?.work_type_id || "";
  const defaultWorkType = existingWorkTypeId || columnLastWorkType || "";

  const [selectedWorkType, setSelectedWorkType] = useState<string>("");
  const [weight, setWeight] = useState(1);
  const [comment, setComment] = useState("");
  const [showError, setShowError] = useState(false);
  const [pendingGrade, setPendingGrade] = useState<{ value: number; provisionalUntil?: string } | null>(null);
  const submitted = useRef(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingAbsence, setPendingAbsence] = useState<"excused" | "unexcused" | null>(null);
  const [provisionalDate, setProvisionalDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return format(d, "yyyy-MM-dd");
  });

  useEffect(() => {
    if (isOpen) submitted.current = false;
  }, [isOpen]);

  const wasOpen = useRef(false);
  useEffect(() => {
    const justOpened = isOpen && !wasOpen.current;
    wasOpen.current = isOpen;
    if (justOpened) {
      setComment(cellComment || "");
      setShowError(false);
      setPendingGrade(null);
      setPendingAbsence(null);
      setEditingId(null);
      setSelectedWorkType(defaultWorkType);
      setWeight(1);
    }
  }, [isOpen, cellComment, defaultWorkType]);

  const hasWorkTypes = workTypes.length > 0;
  const selectedWorkTypeName = workTypes.find((w: any) => w.id === selectedWorkType)?.name;
  const isControlSelected = isControlWorkTypeName(selectedWorkTypeName);
  const commentChanged = comment !== (cellComment || "");

  const persistCommentIfChanged = () => {
    if (commentChanged) onSaveComment(comment);
  };

  const submitGrade = (value: number, provisionalUntil: string | undefined, wtId: string, w: number) => {
    if (submitted.current || !isOpen || readOnly || locked) return;
    submitted.current = true;
    onAddGrade(value, provisionalUntil, wtId || undefined, comment || undefined, w);
    persistCommentIfChanged();
    setPendingGrade(null);
    setShowError(false);
    onOpenChange(false);
  };

  const handleGradeClick = (value: number, provisional?: boolean) => {
    if (editingId && onUpdateGrade) {
      if (submitted.current) return;
      submitted.current = true;
      const current = grades.find((g) => g.id === editingId);
      if (current && current.value !== value) onUpdateGrade(editingId, value);
      persistCommentIfChanged();
      setEditingId(null);
      onOpenChange(false);
      return;
    }
    if (hasWorkTypes && !selectedWorkType) {
      setPendingGrade({ value, provisionalUntil: provisional ? provisionalDate : undefined });
      setShowError(true);
      return;
    }
    submitGrade(value, provisional ? provisionalDate : undefined, selectedWorkType, isControlSelected ? weight : 1);
  };

  const handleSelectWorkType = (wtId: string) => {
    setSelectedWorkType(wtId);
    setShowError(false);
    setWeight(1);
    const control = isControlWorkTypeName(workTypes.find((w: any) => w.id === wtId)?.name);
    // Для контрольных ждём выбора веса — оценка выставится по нажатию на вес
    if (pendingGrade && !control) {
      submitGrade(pendingGrade.value, pendingGrade.provisionalUntil, wtId, 1);
    }
  };

  const handleWeightClick = (w: number) => {
    setWeight(w);
    if (pendingGrade) {
      submitGrade(pendingGrade.value, pendingGrade.provisionalUntil, selectedWorkType, w);
    }
  };

  const handleAbsenceClick = (type: "excused" | "unexcused") => {
    if (absenceType === type) {
      onRemoveAbsence();
      persistCommentIfChanged();
      onOpenChange(false);
      return;
    }
    if (pendingAbsence === type) {
      onSetAbsence(type);
      persistCommentIfChanged();
      setPendingAbsence(null);
      onOpenChange(false);
    } else {
      setPendingAbsence(type);
    }
  };

  const handleSaveCommentOnly = () => {
    onSaveComment(comment);
    onOpenChange(false);
  };

  /** Не теряем оценку: если она ждала выбора категории/веса — сохраняем при закрытии */
  const handleOpenChange = (open: boolean) => {
    if (!open && pendingGrade && selectedWorkType) {
      submitGrade(pendingGrade.value, pendingGrade.provisionalUntil, selectedWorkType, isControlSelected ? weight : 1);
      return;
    }
    onOpenChange(open);
  };


  const dateObj = parseISO(dateStr);
  const hasCellComment = !!(cellComment && cellComment.trim());

  // ===== Read-only / locked mode =====
  if (readOnly || locked) {
    return (
      <Popover open={isOpen} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <button
            onClick={() => onOpenChange(true)}
            className="w-full h-full min-h-[36px] flex items-center justify-center gap-0.5 text-xs hover:bg-muted/40 transition-colors rounded-none cursor-not-allowed relative"
          >
            {absenceType ? (
              <span className={`text-[10px] font-bold opacity-70 ${absenceType === 'excused' ? 'text-emerald-600' : 'text-destructive'}`}>Н</span>
            ) : grades.length > 0 ? grades.map((g, i) => {
              const prov = isProvisionalActive(g.provisional_until);
              return (
                <span key={g.id} className="inline-flex items-center">
                  <CellGrade g={g} prov={prov} dim />
                  {i < grades.length - 1 && <span className="text-muted-foreground/40">/</span>}
                </span>
              );
            }) : locked && showLock ? (
              <Lock className="w-2.5 h-2.5 text-muted-foreground/40" />
            ) : ""}
            {hasCellComment && <MessageSquare className="absolute top-0 right-0 w-2 h-2 text-muted-foreground/60" />}
          </button>
        </PopoverTrigger>
        <PopoverContent side="right" align="start" sideOffset={8} className="w-[240px] p-0 z-50 shadow-xl">
          <div className="px-3 py-2 border-b border-border bg-amber-500/10 flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <div className="min-w-0">
              <div className="text-[12px] font-semibold text-foreground truncate">{studentName}</div>
              <div className="text-[10px] text-muted-foreground capitalize">
                {format(dateObj, "d MMMM, EEEE", { locale: ru })}
              </div>
            </div>
          </div>
          <div className="px-3 py-3 text-center">
            <div className="text-xs text-amber-700 font-medium mb-1">Только для просмотра</div>
            <div className="text-[11px] text-muted-foreground leading-snug">
              {readOnly
                ? "Заявка на отказ от предмета на рассмотрении у администратора. Доступ к редактированию временно ограничен."
                : lockReason || "Выставление оценок в этот день недоступно."}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          onClick={() => onOpenChange(true)}
          title={hasCellComment ? `💬 ${cellComment}` : undefined}
          className="w-full h-full min-h-[36px] flex items-center justify-center gap-0.5 text-xs hover:bg-primary/10 transition-colors rounded-none relative"
        >
          {absenceType ? (
            <span className={`text-[10px] font-bold ${absenceType === 'excused' ? 'text-emerald-600' : 'text-destructive'}`}>Н</span>
          ) : grades.length > 0 ? grades.map((g, i) => {
            const prov = isProvisionalActive(g.provisional_until);
            return (
              <span key={g.id} className="inline-flex items-center">
                <CellGrade g={g} prov={prov} />
                {i < grades.length - 1 && <span className="text-muted-foreground/40">/</span>}
              </span>
            );
          }) : ""}
          {hasCellComment && <MessageSquare className="absolute top-0 right-0 w-2 h-2 text-primary/70" />}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="start"
        sideOffset={8}
        collisionPadding={12}
        className="w-[280px] p-0 z-50 shadow-xl"
      >
        {/* Header */}
        <div className="px-3 py-2 border-b border-border flex items-center justify-between bg-secondary/40 rounded-t-md">
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-foreground truncate">{studentName}</div>
            <div className="text-[10px] text-muted-foreground capitalize">
              {format(dateObj, "d MMMM, EEEE", { locale: ru })}
            </div>
          </div>
          <button
            onClick={() => handleOpenChange(false)}
            className="p-1 rounded-md hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground shrink-0 ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Existing grades */}
        {grades.length > 0 && (
          <div className="px-3 pt-2.5 space-y-1">
            {grades.map((g) => {
              const prov = isProvisionalActive(g.provisional_until);
              return (
                <div key={g.id} className="flex items-center justify-between gap-2 bg-secondary/50 rounded-md px-2 py-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`text-sm font-bold ${gradeColor(g.value, prov)}`}>
                      {g.value}{prov && <span className="text-destructive">•</span>}
                    </span>
                    {(g.weight ?? 1) > 1 && (
                      <span className="text-[10px] font-semibold text-destructive shrink-0">×{g.weight}</span>
                    )}
                    {g.work_type_short && <span className="text-[10px] text-muted-foreground truncate">{g.work_type_short}</span>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                  {onUpdateGrade && (
                    <button
                      onClick={() => setEditingId(editingId === g.id ? null : g.id)}
                      aria-pressed={editingId === g.id}
                      className={`text-[10px] font-medium rounded px-1.5 py-1 leading-tight ${editingId === g.id ? "bg-primary text-primary-foreground" : "text-primary hover:bg-primary/10"}`}
                    >
                      Изменить
                    </button>
                  )}
                  <button
                    onClick={() => onRemoveGrade(g.id)}
                    className="shrink-0 text-[10px] font-medium text-destructive hover:bg-destructive/10 rounded px-1.5 py-1 leading-tight text-right"
                    style={{ maxWidth: '70px' }}
                  >
                    Убрать<br />оценку
                  </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="px-3 py-3 space-y-3">
          {editingId && (() => {
            const current = grades.find((g) => g.id === editingId);
            return (
              <div className="rounded-md border border-primary/40 bg-primary/5 p-2">
                <div className="text-[11px] font-medium text-primary mb-1.5">Новая оценка вместо {current?.value}:</div>
                <div className="grid grid-cols-4 gap-1">
                  {GRADE_VALUES.map((v) => (
                    <button key={`e-${v}`} type="button" disabled={v === current?.value} onClick={() => handleGradeClick(v)}
                      className={`h-9 rounded-md text-base font-bold border border-border bg-card hover:bg-secondary disabled:opacity-40 ${v === 5 ? "text-emerald-600" : v === 4 ? "text-primary" : v === 3 ? "text-amber-500" : "text-destructive"}`}>{v}</button>
                  ))}
                </div>
                <button type="button" onClick={() => setEditingId(null)} className="mt-1.5 text-[10px] text-muted-foreground hover:underline">Отмена</button>
              </div>
            );
          })()}
          {!editingId && (<>
          {/* Category */}
          <div>
            <div className="text-[10px] text-muted-foreground font-medium mb-1">
              Категория {hasWorkTypes && <span className="text-destructive">*</span>}
            </div>
            {hasWorkTypes ? (
              <Select value={selectedWorkType} onValueChange={handleSelectWorkType}>
                <SelectTrigger className={`h-8 text-xs ${showError ? "border-destructive ring-1 ring-destructive" : ""}`}>
                  <SelectValue placeholder="Выберите" />
                </SelectTrigger>
                <SelectContent className="z-[60]">
                  {workTypes.map((wt: any) => (
                    <SelectItem key={wt.id} value={wt.id} className="text-xs">{wt.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="text-[11px] text-muted-foreground">Нет категорий</div>
            )}
            {showError && <p className="text-[10px] text-destructive mt-0.5">Выберите категорию</p>}
          </div>

          {/* Вес оценки — только для контрольных работ */}
          {isControlSelected && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-2">
              <div className="text-[10px] font-medium text-destructive mb-1">
                Вес оценки {pendingGrade && <span>— нажмите, чтобы выставить</span>}
              </div>
              <div className="grid grid-cols-3 gap-1">
                {Array.from({ length: MAX_GRADE_WEIGHT }, (_, i) => i + 1).map((w) => (
                  <button
                    key={w}
                    onClick={() => handleWeightClick(w)}
                    className={`h-8 rounded-md text-xs font-bold border transition-colors ${
                      weight === w
                        ? "bg-destructive text-white border-destructive"
                        : "bg-card text-destructive border-border hover:border-destructive"
                    }`}
                  >
                    ×{w}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Вес 2 — оценка считается как две при подсчёте среднего балла
              </p>
            </div>
          )}


          {/* Grades */}
          <div>
            <div className="text-[10px] text-muted-foreground font-medium mb-1">Оценка</div>
            <div className="grid grid-cols-4 gap-1 mb-1.5">
              {GRADE_VALUES.map((v) => (
                <button
                  key={v}
                  onClick={() => handleGradeClick(v)}
                  className={`h-9 rounded-md text-base font-bold transition-colors border border-border hover:border-primary/50 bg-card hover:bg-secondary ${
                    v === 5 ? "text-emerald-600" : v === 4 ? "text-primary" : v === 3 ? "text-amber-500" : "text-destructive"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
            <div className="text-[10px] text-muted-foreground font-medium mb-1">Исправимая (с точкой)</div>
            <div className="grid grid-cols-4 gap-1">
              {GRADE_VALUES.map((v) => (
                <button
                  key={`p-${v}`}
                  onClick={() => handleGradeClick(v, true)}
                  className={`h-9 rounded-md text-base font-medium transition-colors border border-dashed border-border hover:border-primary/50 bg-card hover:bg-secondary ${
                    v === 5 ? "text-emerald-600" : v === 4 ? "text-primary" : v === 3 ? "text-amber-500" : "text-destructive"
                  }`}
                >
                  {v}<span className="text-destructive text-[10px]">•</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">точка до:</span>
              <Input
                type="date"
                value={provisionalDate}
                onChange={(e) => setProvisionalDate(e.target.value)}
                className="h-7 text-[10px] px-1.5 flex-1"
              />
            </div>
          </div>
          </>)}

          {/* Comment */}
          <div>
            <div className="text-[10px] text-muted-foreground font-medium mb-1">Комментарий</div>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Написать..."
              className="min-h-[50px] text-xs resize-none"
            />
            {commentChanged && (
              <button
                onClick={handleSaveCommentOnly}
                className="mt-1.5 w-full h-7 rounded-md text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Сохранить комментарий
              </button>
            )}
          </div>

          {/* Absence */}
          <div className="border-t border-border pt-2.5">
            <div className="text-[10px] text-muted-foreground font-medium mb-1">
              Пропуск {pendingAbsence && <span className="text-primary">— нажмите ещё раз для подтверждения</span>}
            </div>
            <div className="grid grid-cols-2 gap-1">
              {(["excused", "unexcused"] as const).map((type) => {
                const isActive = absenceType === type;
                const isPending = pendingAbsence === type;
                const isExcused = type === "excused";
                const label = isExcused ? "Н уваж." : "Н неуваж.";
                return (
                  <button
                    key={type}
                    onClick={() => handleAbsenceClick(type)}
                    className={`h-8 rounded-md text-xs font-bold transition-all border ${
                      isActive
                        ? isExcused
                          ? "bg-emerald-500 text-white border-emerald-600"
                          : "bg-destructive text-white border-destructive"
                        : isPending
                        ? isExcused
                          ? "bg-emerald-500/20 text-emerald-700 border-emerald-500 ring-2 ring-emerald-500/40"
                          : "bg-destructive/20 text-destructive border-destructive ring-2 ring-destructive/40"
                        : isExcused
                        ? "bg-card text-emerald-600 border-border hover:border-emerald-500"
                        : "bg-card text-destructive border-border hover:border-destructive"
                    }`}
                  >
                    {isActive ? `${label} ✕` : isPending ? "ОК?" : label}
                  </button>
                );
              })}
            </div>
            {pendingAbsence && (
              <p className="text-[10px] text-muted-foreground mt-1 text-center">
                Нажмите ОК для подтверждения, или другую кнопку для отмены
              </p>
            )}
          </div>

          {/* History */}
          {studentId && subjectId && isOpen && (
            <GradeHistorySection studentId={studentId} subjectId={subjectId} date={dateStr} />
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
