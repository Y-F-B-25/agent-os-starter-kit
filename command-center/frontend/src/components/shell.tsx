import { useEffect, useRef, useState } from "react";
import type { Agent, Telemetry } from "../types";
import { AgentHue, Eyebrow, formatNum } from "./primitives";
import { useStore } from "../store";

type Tab = "home" | "command" | "agent" | "map" | "spec";

export function TopBar({ tab, setTab, theme, setTheme, clock, connected }: {
  tab: Tab;
  setTab: (t: Tab) => void;
  theme: string;
  setTheme: (t: string) => void;
  clock: string;
  connected: boolean;
}) {
  const tabs: { id: Tab; label: string; k: string }[] = [
    { id: "home", label: "Home", k: "1" },
    { id: "command", label: "Command", k: "2" },
    { id: "agent", label: "Agent", k: "3" },
    { id: "map", label: "Map", k: "4" },
    { id: "spec", label: "Spec", k: "5" },
  ];
  return (
    <header className="topbar">
      <div className="brand">
        <span className="dot" />
        <span>AG OS</span>
        <span className="sub">command center · v0.4</span>
      </div>
      <nav className="tabs" role="tablist">
        {tabs.map((t) => (
          <div key={t.id} role="tab" aria-selected={tab === t.id} className="tab" onClick={() => setTab(t.id)}>
            {t.label}
            <kbd>{t.k}</kbd>
          </div>
        ))}
      </nav>
      <div className="right">
        <span className="ws-label" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: connected ? "var(--st-working)" : "var(--st-blocked)", boxShadow: connected ? "0 0 6px var(--st-working)" : "none" }} />
          ws · {connected ? "live" : "offline"}
        </span>
        <span className="sep">/</span>
        <span className="clock">{clock}</span>
        <span className="sep">/</span>
        <button className="theme-toggle" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
          {theme === "dark" ? "DARK" : "LIGHT"}
        </button>
      </div>
    </header>
  );
}

export function AgentRail({ agents, selected, onOpenAgent }: {
  agents: Agent[];
  selected: string | null;
  onOpenAgent: (id: string) => void;
}) {
  const primary = agents[0];
  const specialists = agents.slice(1);

  return (
    <aside className="rail">
      <div className="rail-header">
        <span>Agents</span>
        <span className="num" style={{ color: "var(--fg-3)" }}>{agents.length}</span>
      </div>
      <div className="rail-list">
        {primary && <AgentRow agent={primary} pinned selected={selected === primary.id} onClick={() => onOpenAgent(primary.id)} />}
        <div className="rail-divider" />
        <Eyebrow style={{ padding: "4px 8px 6px" }}>Specialists</Eyebrow>
        {specialists.map((a) => (
          <AgentRow key={a.id} agent={a} selected={selected === a.id} onClick={() => onOpenAgent(a.id)} />
        ))}
      </div>
      <div style={{ borderTop: "1px solid var(--line-1)", padding: "10px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
        <Eyebrow>Sources</Eyebrow>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11 }}>
          <SourceRow label="Vault filesystem" detail="watching · vault/" />
          <SourceRow label="Claude Code session JSONLs" detail="tail · ~/.claude/projects" />
          <SourceRow label="Anthropic API usage" detail="poll · 60s" />
        </div>
      </div>
    </aside>
  );
}

function SourceRow({ label, detail, warn }: { label: string; detail: string; warn?: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--fg-1)", fontSize: 11 }}>
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: warn ? "var(--st-blocked)" : "var(--st-working)", flexShrink: 0 }} />
        {label}
      </span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: warn ? "var(--st-blocked)" : "var(--fg-3)", paddingLeft: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{detail}</span>
    </div>
  );
}

function AgentRow({ agent, selected, onClick, pinned }: {
  agent: Agent;
  selected: boolean;
  onClick: () => void;
  pinned?: boolean;
}) {
  const ctxPct = Math.min(1, Math.max(0, agent.currentContextPct || 0));
  const ctxPctDisplay = Math.round(ctxPct * 100);
  // the owner's locked thresholds (Rule 12): 50% yellow, 70% red.
  const tier = ctxPct >= 0.70 ? "red" : ctxPct >= 0.50 ? "yellow" : "green";
  const tierFill =
    tier === "red"    ? "var(--st-blocked)" :
    tier === "yellow" ? "var(--st-planned)" :
                        "var(--st-working)";
  const attention = agent.attentionCount || 0;
  // Severity tiers (CC v5 phase-one wake-failure follow-up):
  //   - dormant target (no sessionId): show a soft "queued" pill in muted gray.
  //     The harness can't deliver to a non-running agent yet (auto-spawn path
  //     in progress), so an alarming red ! mis-frames the state as agent error.
  //   - live target with pending: subtle yellow dot + count. Yellow = attention.
  //   - live target with escalated/no-ack: red ! (kept loud so it stands out).
  //
  // The escalated path is not yet wired through to snapshot; until then,
  // attentionCount > 0 + live session uses the yellow tier.
  const isDormant = !agent.sessionId;
  const badgeTier = attention === 0 ? "none" : isDormant ? "queued" : "attention";
  const badgeColor = badgeTier === "queued" ? "var(--fg-3)" : badgeTier === "attention" ? "var(--st-planned)" : "var(--st-blocked)";
  const badgeBg = badgeTier === "queued" ? "color-mix(in oklab, var(--fg-3) 18%, transparent)" : "color-mix(in oklab, var(--st-planned) 30%, transparent)";
  const badgeGlyph = badgeTier === "queued" ? "queued" : (attention > 1 ? `· ${attention}` : "·");
  const tooltipState = badgeTier === "queued"
    ? `${attention} harness signal${attention === 1 ? "" : "s"} queued — agent not running, can't deliver until wake. Context ${ctxPctDisplay}%`
    : badgeTier === "attention"
      ? `${attention} harness signal${attention === 1 ? "" : "s"} awaiting ack · context ${ctxPctDisplay}%`
      : `Context: ${ctxPctDisplay}%`;
  return (
    <div
      className="agent-row"
      aria-selected={selected || undefined}
      onClick={onClick}
      title={tooltipState}
      style={pinned ? { background: "color-mix(in oklab, var(--accent-tint) 60%, transparent)" } : undefined}
    >
      <span className={`status-dot ${agent.status}`} />
      <div className="body">
        <div className="name">
          <AgentHue agent={agent} />
          <RailNameEditor agent={agent} />
          {pinned && (
            <span className="kbd" style={{ fontSize: 9, padding: "0 3px", color: "var(--accent)", borderColor: "color-mix(in oklab, var(--accent) 40%, var(--line-2))" }}>
              CoS
            </span>
          )}
          {badgeTier !== "none" && (
            <span
              aria-label={tooltipState}
              style={{
                marginLeft: 6,
                fontSize: 9,
                fontWeight: 600,
                padding: "1px 5px",
                borderRadius: 8,
                background: badgeBg,
                color: badgeColor,
                lineHeight: 1.4,
                letterSpacing: 0.2,
                textTransform: badgeTier === "queued" ? "lowercase" : "none",
                whiteSpace: "nowrap",
              }}
            >
              {badgeGlyph}
            </span>
          )}
        </div>
        <div className="role">{agent.role}</div>
      </div>
      <div className="meta">
        <span>{formatNum(agent.currentTokens)} · {agent.currentTools}t</span>
        <span className={`ctx-bar ${tier === "red" ? "warn" : ""}`}>
          <i style={{ width: Math.max(2, ctxPctDisplay) + "%", background: tierFill }} />
        </span>
      </div>
    </div>
  );
}

function RailNameEditor({ agent }: { agent: Agent }) {
  const renameAgent = useStore((s) => s.renameAgent);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(agent.name);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { if (!editing) setDraft(agent.name); }, [agent.name, editing]);

  function commit() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === agent.name) { setEditing(false); setDraft(agent.name); return; }
    renameAgent(agent.id, trimmed);
    setEditing(false);
  }

  function cancel() { setEditing(false); setDraft(agent.name); }

  if (editing) {
    return (
      <input
        ref={inputRef}
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        onBlur={commit}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") { e.preventDefault(); commit(); }
          else if (e.key === "Escape") { e.preventDefault(); cancel(); }
        }}
        style={{
          fontSize: "inherit",
          fontFamily: "inherit",
          color: "var(--fg-0)",
          background: "var(--bg-2)",
          border: "1px solid var(--line-2)",
          borderRadius: 2,
          padding: "0 3px",
          outline: "none",
          minWidth: 0,
          width: Math.max(60, draft.length * 7) + "px",
        }}
      />
    );
  }
  return (
    <span
      onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}
      title="Double-click to rename"
      style={{ cursor: "text" }}
    >
      {agent.name}
    </span>
  );
}

export function TelemetryStrip({ telemetry, connected }: { telemetry: Telemetry; connected: boolean }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 1500);
    return () => clearInterval(i);
  }, []);
  const rate = telemetry.tokensPerMin + ((tick * 37) % 240) - 120;
  return (
    <footer className="strip">
      <div className="grp">
        <span className="ws-status"><span className={`d ${connected ? "" : "off"}`} /></span>
        <span className="lbl">{connected ? "live" : "offline"}</span>
      </div>
      <div className="grp"><span className="lbl">today tokens</span><span className="val">{formatNum(telemetry.todayTokens)}</span></div>
      <div className="grp"><span className="lbl">tools</span><span className="val">{telemetry.todayTools.toLocaleString()}</span></div>
      <div className="grp"><span className="lbl">rate</span><span className="val">{rate.toLocaleString()} tok/min</span></div>
      <div className="grp"><span className="lbl">in-flight</span><span className="val">{telemetry.inFlight}</span></div>
      <div className="grp"><span className="lbl">blocked</span><span className={`val ${telemetry.blocked ? "alert" : ""}`}>{telemetry.blocked}</span></div>
      <div className="grp"><span className="lbl">sessions</span><span className="val">{telemetry.sessionsLive}</span></div>
      <div className="right">
        <span>daemon · launchd:home.agos.telemetry</span>
      </div>
    </footer>
  );
}
