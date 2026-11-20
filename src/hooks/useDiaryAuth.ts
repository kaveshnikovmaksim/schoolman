import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DiaryAccount {
  userId: string;
  classId: string;
  className: string;
  email: string;
}

export function useDiaryAuth() {
  const [account, setAccount] = useState<DiaryAccount | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async (userId: string | null) => {
      if (!userId) {
        if (mounted) {
          setAccount(null);
          setLoading(false);
        }
        return;
      }
      const { data } = await supabase
        .from("class_accounts")
        .select("user_id, class_id, email, classes:class_id(name)")
        .eq("user_id", userId)
        .maybeSingle();
      if (!mounted) return;
      if (data) {
        setAccount({
          userId: data.user_id,
          classId: data.class_id,
          email: data.email,
          // @ts-ignore
          className: data.classes?.name ?? "",
        });
      } else {
        setAccount(null);
      }
      setLoading(false);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      load(session?.user?.id ?? null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      load(session?.user?.id ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { account, loading };
}
