"use client";

import { useEffect, useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { flushAll, hasQueued, loadAll, syncIfChanged, useStore } from "@/lib/client-store";
import { cn } from "@/lib/utils";
import AppSidebar from "./AppSidebar";
import AppHeader from "./AppHeader";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const loaded = useStore((s) => s.loaded);

  useEffect(() => {
    loadAll();
    try {
      // Preferenza locale letta solo dopo il mount, per non rompere l'hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCollapsed(localStorage.getItem("banca:sidebar") === "1");
    } catch {}
    const onUnload = (e: BeforeUnloadEvent) => {
      if (!hasQueued()) return;
      flushAll();
      e.preventDefault();
    };
    const onHide = () => document.visibilityState === "hidden" && flushAll();
    const poll = setInterval(() => syncIfChanged().catch(() => {}), 4000);
    window.addEventListener("beforeunload", onUnload);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      document.removeEventListener("visibilitychange", onHide);
      clearInterval(poll);
    };
  }, []);

  const toggle = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem("banca:sidebar", c ? "0" : "1");
      } catch {}
      return !c;
    });
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-muted/30">
        <div className="hidden lg:block">
          <AppSidebar collapsed={collapsed} onToggle={toggle} />
        </div>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-64 p-0">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <AppSidebar collapsed={false} onToggle={() => setMobileOpen(false)} onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>

        <div className={cn("transition-all duration-300", collapsed ? "lg:ml-16" : "lg:ml-64")}>
          <AppHeader onMenuToggle={() => setMobileOpen(true)} />
          <div className="p-6">
            {loaded ? (
              children
            ) : (
              <div className="flex h-[60vh] items-center justify-center text-sm text-muted-foreground">
                Apro la banca…
              </div>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
