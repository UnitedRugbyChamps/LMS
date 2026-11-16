"use client";

import { useStore } from "@/lib/store/StoreProvider";

export function ModeBanner() {
  const store = useStore();
  if (store.mode !== "demo") return null;
  return (
    <div className="bg-accent/20 text-center text-xs text-ink px-4 py-2">
      Demo mode: picks and results are saved in this browser only. Five pretend rivals play alongside you.
    </div>
  );
}
