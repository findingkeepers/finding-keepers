"use client";

import { useEffect } from "react";
import { enforceTabScopedSession } from "@/lib/supabase/browser";

export function AuthSessionGuard() {
  useEffect(() => {
    void enforceTabScopedSession();
  }, []);

  return null;
}