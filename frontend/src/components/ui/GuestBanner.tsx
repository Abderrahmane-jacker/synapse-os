"use client";

import { useEffect, useState } from "react";
import { Sparkles, Terminal } from "lucide-react";
import SetupWizard from "@/components/setup/SetupWizard";

export default function GuestBanner() {
  const [isSetupDone, setIsSetupDone] = useState<boolean>(true);
  const [isSetupOpen, setIsSetupOpen] = useState(false);

  useEffect(() => {
    const checkSetup = () => {
      const setup = localStorage.getItem("nexus_setup_completed");
      setIsSetupDone(setup === "true");
    };
    checkSetup();

    window.addEventListener("nexus_settings_changed", checkSetup);
    window.addEventListener("storage", checkSetup);
    return () => {
      window.removeEventListener("nexus_settings_changed", checkSetup);
      window.removeEventListener("storage", checkSetup);
    };
  }, []);

  if (isSetupDone) return null;

  return (
    <>
      <div style={{
        width: "100%",
        background: "#0F0F0F",
        borderBottom: "2px solid #0F0F0F",
        padding: "8px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontSize: "0.78rem",
        fontFamily: "var(--font-mono)",
        color: "#FFFFFF",
        zIndex: 999,
        position: "relative"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{
            background: "#D0FF14",
            color: "#0F0F0F",
            fontWeight: 800,
            padding: "2px 6px",
            fontSize: "0.68rem"
          }}>
            SANDBOX
          </span>
          <span>
            GUEST RUNTIME: Virtual memory mode. Initialize your operator credentials and Obsidian vault.
          </span>
        </div>

        <button
          onClick={() => setIsSetupOpen(true)}
          style={{
            background: "#D0FF14",
            border: "1px solid #0F0F0F",
            boxShadow: "2px 2px 0px #0F0F0F",
            color: "#0F0F0F",
            padding: "4px 12px",
            fontWeight: 800,
            fontSize: "0.72rem",
            fontFamily: "var(--font-mono)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            flexShrink: 0
          }}
          onMouseOver={e => e.currentTarget.style.background = "#E4FF66"}
          onMouseOut={e => e.currentTarget.style.background = "#D0FF14"}
        >
          <Sparkles size={12} />
          <span>RUN SETUP WIZARD</span>
        </button>
      </div>

      <SetupWizard
        isOpen={isSetupOpen}
        onComplete={() => {
          setIsSetupOpen(false);
          setIsSetupDone(true);
        }}
        canDismiss={true}
      />
    </>
  );
}
