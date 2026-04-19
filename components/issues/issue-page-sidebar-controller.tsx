"use client";

import { useEffect, useRef } from "react";

import { useSidebar } from "@/components/ui/sidebar";

export function IssuePageSidebarController() {
  const { open, openMobile, setOpen, setOpenMobile } = useSidebar();
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (hasInitializedRef.current) {
      return;
    }

    hasInitializedRef.current = true;

    if (open) {
      setOpen(false);
    }

    if (openMobile) {
      setOpenMobile(false);
    }
  }, [open, openMobile, setOpen, setOpenMobile]);

  return null;
}
