"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/hooks/useI18n";
import type { PermissionMode } from "@/lib/permission-modes";

const MODES: PermissionMode[] = ["workspace", "risk", "full"];

interface Props {
  compact?: boolean;
  planModeActive?: boolean;
  planModeAvailable?: boolean;
  onTogglePlanMode?: () => Promise<void>;
}

export function PermissionControl({ compact = false, planModeActive = false, planModeAvailable = false, onTogglePlanMode }: Props) {
  const { t } = useI18n();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<PermissionMode>("workspace");
  const [installed, setInstalled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [planSaving, setPlanSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/permissions", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json() as { installed?: boolean; mode?: PermissionMode; error?: string };
        if (!response.ok) throw new Error(data.error ?? `HTTP ${response.status}`);
        if (data.mode) setMode(data.mode);
        setInstalled(data.installed !== false);
      })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : String(reason)));
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  const selectMode = async (nextMode: PermissionMode) => {
    if (saving || nextMode === mode) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/permissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: nextMode }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? `HTTP ${response.status}`);
      setMode(nextMode);
      setOpen(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setSaving(false);
    }
  };

  const modeColor = mode === "full" ? "#dc2626" : mode === "risk" ? "#d97706" : "var(--accent)";

  const togglePlanMode = async () => {
    if (!onTogglePlanMode || planSaving) return;
    setPlanSaving(true);
    try {
      await onTogglePlanMode();
    } finally {
      setPlanSaving(false);
    }
  };

  return (
    <div ref={rootRef} style={{ position: "relative", height: "100%", flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        title={t("permissions.title")}
        style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          width: compact ? 36 : undefined, height: "100%", padding: compact ? 0 : "0 11px",
          border: "none", borderRight: "1px solid var(--border)", borderTop: open ? `2px solid ${modeColor}` : "2px solid transparent",
          background: open ? "var(--bg-selected)" : "none", color: modeColor,
          cursor: "pointer", fontSize: 11, whiteSpace: "nowrap",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
          {mode === "full" ? <path d="m9 12 2 2 4-4" /> : <path d="M12 8v4M12 16h.01" />}
        </svg>
        {!compact && <span>{t(`permissions.${mode}`)}</span>}
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: "absolute", zIndex: 700, top: "100%", left: 0,
            width: "min(420px, calc(100vw - 20px))", padding: 8,
            border: "1px solid var(--border)", borderRadius: 0,
            background: "var(--bg-panel)", boxShadow: "0 18px 50px rgba(0,0,0,0.22)",
          }}
        >
          <div style={{ padding: "5px 8px 9px", color: "var(--text)", fontSize: 12, fontWeight: 700 }}>
            {t("permissions.heading")}
          </div>
          {MODES.map((item) => {
            const active = item === mode;
            return (
              <button
                key={item}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                disabled={saving || !installed}
                onClick={() => void selectMode(item)}
                style={{
                  display: "grid", gridTemplateColumns: "18px minmax(0, 1fr)", gap: 9,
                  width: "100%", padding: "10px 9px", border: "none", borderRadius: 7,
                  background: active ? "var(--bg-selected)" : "transparent", color: "var(--text)",
                  cursor: saving || !installed ? "not-allowed" : "pointer", textAlign: "left",
                }}
              >
                <span style={{
                  display: "grid", placeItems: "center", width: 16, height: 16, marginTop: 1,
                  border: `1px solid ${active ? modeColor : "var(--border)"}`, borderRadius: "50%",
                }}>
                  {active && <span style={{ width: 8, height: 8, borderRadius: "50%", background: modeColor }} />}
                </span>
                <span>
                  <span style={{ display: "block", fontSize: 12, fontWeight: 650 }}>{t(`permissions.${item}`)}</span>
                  <span style={{ display: "block", marginTop: 3, color: "var(--text-muted)", fontSize: 11, lineHeight: 1.45 }}>
                    {t(`permissions.${item}Description`)}
                  </span>
                </span>
              </button>
            );
          })}
          <div style={{ margin: "7px 8px", borderTop: "1px solid var(--border)" }} />
          <div style={{ padding: "3px 8px 7px", color: "var(--text-muted)", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            {t("permissions.workMode")}
          </div>
          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={planModeActive}
            disabled={!planModeAvailable || planSaving}
            onClick={() => void togglePlanMode()}
            style={{
              display: "grid", gridTemplateColumns: "18px minmax(0, 1fr)", gap: 9,
              width: "100%", padding: "10px 9px", border: "none", borderRadius: 7,
              background: planModeActive ? "var(--bg-selected)" : "transparent", color: "var(--text)",
              cursor: !planModeAvailable || planSaving ? "not-allowed" : "pointer", textAlign: "left",
              opacity: !planModeAvailable ? 0.55 : 1,
            }}
          >
            <span aria-hidden="true" style={{
              display: "grid", placeItems: "center", width: 16, height: 16, marginTop: 1,
              border: `1px solid ${planModeActive ? "var(--accent)" : "var(--border)"}`, borderRadius: "50%",
            }}>
              {planModeActive && <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)" }} />}
            </span>
            <span>
              <span style={{ display: "block", fontSize: 12, fontWeight: 650 }}>{t("chat.planMode")}</span>
              <span style={{ display: "block", marginTop: 3, color: "var(--text-muted)", fontSize: 11, lineHeight: 1.45 }}>
                {t("permissions.planModeDescription")}
              </span>
            </span>
          </button>
          {!installed && <div style={{ padding: 8, color: "#dc2626", fontSize: 11 }}>{t("permissions.notInstalled")}</div>}
          {error && <div role="alert" style={{ padding: 8, color: "#dc2626", fontSize: 11, overflowWrap: "anywhere" }}>{error}</div>}
          {saving && <div style={{ padding: 8, color: "var(--text-muted)", fontSize: 11 }}>{t("permissions.saving")}</div>}
        </div>
      )}
    </div>
  );
}
