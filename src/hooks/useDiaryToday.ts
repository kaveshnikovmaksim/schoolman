import { useEffect, useState } from "react";
import { diaryDayRefreshDelay, diaryToday } from "@/lib/diaryProvisionalGrades";

/** Refresh date-dependent diary rules at midnight and when returning to the tab. */
export function useDiaryToday() {
  const [today, setToday] = useState(diaryToday);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(timer);
      setToday(diaryToday());
      timer = setTimeout(refresh, diaryDayRefreshDelay());
    };
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);
  return today;
}