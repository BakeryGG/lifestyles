"use client";

import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import type { PresentedPick } from "@/lib/present";

type ControllerProps = {
  live: boolean;
  tierName: string;
  accent: string;
  categories: {
    id: string;
    name: string;
    section: string;
    number: number;
    pick: PresentedPick | null;
  }[];
  children: ReactNode;
};

/**
 * Loads the drawer on the client after first paint. Coming-soon pages never render this,
 * so they do not download the drawer chunk.
 */
export function TierShell(props: ControllerProps) {
  const [Controller, setController] = useState<ComponentType<ControllerProps> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void import("./pick-controller").then((mod) => {
      if (!cancelled) setController(() => mod.PickController);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!Controller) return props.children;
  return <Controller {...props} />;
}
