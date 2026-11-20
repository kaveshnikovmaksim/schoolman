import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, CalendarDays, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDiaryAuth } from "@/hooks/useDiaryAuth";
import { useDiaryHomework } from "@/hooks/useSchoolData";

export default function HomeworkDetail() {
  const { homeworkId } = useParams();
  const { account } = useDiaryAuth();
  const { data, isLoading, isError, refetch } = useDiaryHomework(account?.classId, homeworkId);
  const item = data?.[0];
  return <main className="px-4 py-6 text-diary-fg md:px-0">
    <Button asChild variant="ghost" className="mb-6"><Link to="/diary/student/tasks"><ArrowLeft />Домашние задания</Link></Button>
    {isLoading ? <p className="text-diary-muted">Загрузка…</p> : isError ? <div><p className="text-destructive">Не удалось загрузить задание</p><Button variant="outline" onClick={() => refetch()}>Повторить</Button></div> : !item ? <p className="text-diary-muted">Задание удалено или недоступно для вашего класса</p> :
      <article className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center gap-2 text-primary"><BookOpen className="h-5 w-5" /><span>{item.subjects?.name ?? "Домашнее задание"}</span></div>
        <h1 className="break-words text-2xl font-semibold">{item.title}</h1>
        <div className="flex flex-wrap gap-4 text-sm text-diary-muted">
          <span className="flex items-center gap-2"><CalendarDays className="h-4 w-4" />К {new Date(`${item.due_date}T12:00:00`).toLocaleDateString("ru-RU")}</span>
          <span className="flex items-center gap-2"><UserRound className="h-4 w-4" />{item.teachers?.name ?? "Учитель"}</span>
        </div>
        <p className="whitespace-pre-wrap break-words border-t border-border pt-6 leading-relaxed">{item.description || "Дополнительное описание не указано"}</p>
      </article>}
  </main>;
}