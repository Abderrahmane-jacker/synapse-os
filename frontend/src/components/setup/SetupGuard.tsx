"use client";

import React from "react";

export default function SetupGuard({ children }: { children: React.ReactNode }) {
  // Always render children directly without blocking or forcing SetupWizard
  return <>{children}</>;
}
