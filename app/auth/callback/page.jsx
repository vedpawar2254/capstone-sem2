"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleAuth = async () => {
      const { data, error } = await supabase.auth.getSession(); // or exchangeCodeForSession() for OAuth

      if (error) {
        console.error("Auth callback error:", error.message);
        return;
      }

      if (data?.session) {
        router.replace("/"); // or redirect to dashboard
      } else {
        console.warn("No session found.");
        router.replace("/login");
      }
    };

    handleAuth();
  }, [router]);

  return <> <p className="text-center">Completing sign-in...</p> </>;
}
