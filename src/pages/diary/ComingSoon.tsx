import { LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  title: string;
  description?: string;
}

const ComingSoon = ({ icon: Icon, title, description }: Props) => (
  <div className="px-4 py-16 flex flex-col items-center text-center">
    <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center mb-4 text-slate-400">
      <Icon className="w-7 h-7" />
    </div>
    <h2 className="text-lg font-semibold text-slate-900 mb-1">{title}</h2>
    <p className="text-sm text-slate-500 max-w-xs">
      {description ?? "Этот раздел появится в следующей версии. Сейчас доступны Оценки и Профиль."}
    </p>
  </div>
);

export default ComingSoon;
