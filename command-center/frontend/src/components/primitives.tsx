import type { CSSProperties, ReactNode } from "react";
import type { Agent, AgentStatus, ProjectStatus } from "../types";

export function StatusDot({ status, size = 6 }: { status: AgentStatus | ProjectStatus | string; size?: number }) {
  return (
    <span
      className={`status-dot ${status}`}
      style={{ width: size, height: size, borderRadius: "50%", display: "inline-block", verticalAlign: "middle", background: dotColor(status) }}
    />
  );
}

function dotColor(status: string): string {
  if (status === "working" || status === "in-flight") return "var(--st-working)";
  if (status === "blocked") return "var(--st-blocked)";
  if (status === "error") return "var(--st-error)";
  if (status === "done") return "var(--st-ok)";
  return "var(--st-idle)";
}

export function AgentHue({ agent, height = 12, width = 2 }: { agent: Agent | null | undefined; height?: number; width?: number }) {
  if (!agent) return null;
  return (
    <span
      style={{ display: "inline-block", width, height, background: `var(${agent.hueVar})`, borderRadius: 1, flexShrink: 0 }}
    />
  );
}

export function AgentAvatar({ agent, size = 20 }: { agent: { id: string; name: string; hueVar: string }; size?: number }) {
  const initial = agent.id === "me" ? "Y" : agent.name[0];
  const isMe = agent.id === "me";
  return (
    <span
      style={{
        width: size, height: size,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        background: isMe ? "var(--bg-3)" : `color-mix(in oklab, var(${agent.hueVar}) 22%, var(--bg-2))`,
        color: isMe ? "var(--fg-1)" : `var(${agent.hueVar})`,
        borderRadius: 3,
        fontFamily: "var(--font-mono)",
        fontSize: size <= 18 ? 10 : 11,
        fontWeight: 500,
        flexShrink: 0,
        border: `1px solid color-mix(in oklab, var(${agent.hueVar || "--line-2"}) 30%, transparent)`,
      }}
    >
      {initial}
    </span>
  );
}

export function formatNum(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + "M";
  if (n >= 10_000) return (n / 1000).toFixed(1) + "k";
  if (n >= 1000) return (n / 1000).toFixed(2) + "k";
  return String(n);
}

export function Pill({ children, kind, style }: { children: ReactNode; kind?: string; style?: CSSProperties }) {
  return <span className={`chip ${kind || ""}`} style={style}>{children}</span>;
}

export function KPI({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, paddingRight: 24, minWidth: 90, flexShrink: 0 }}>
      <span className="eyebrow" style={{ fontSize: 9.5, whiteSpace: "nowrap" }}>{label}</span>
      <span className="num" style={{ fontSize: 13, color: "var(--fg-0)", whiteSpace: "nowrap" }}>{value}</span>
      {hint && <span style={{ fontSize: 10, color: "var(--fg-3)", whiteSpace: "nowrap" }}>{hint}</span>}
    </div>
  );
}

export function Eyebrow({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div className="eyebrow" style={style}>{children}</div>;
}

export function StatusPill({ status }: { status: string }) {
  const klass: Record<string, string> = {
    "in-flight": "status-working",
    blocked: "status-blocked",
    planned: "status-idle",
    done: "status-done",
    idle: "status-idle",
    working: "status-working",
    error: "status-error",
  };
  return <span className={`chip ${klass[status] || "status-idle"}`}>{status}</span>;
}
