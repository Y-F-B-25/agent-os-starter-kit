import { useEffect, useMemo, useRef, useState } from "react";
import type { Agent, AgentSdkAction, AgentSdkState, Project, ProjectStatus, Routine } from "../types";
import { useStore } from "../store";
import { AgentAvatar, AgentHue, Eyebrow, formatNum, KPI, StatusDot, StatusPill } from "./primitives";
import { displayClockFromMessage } from "../time";

const STATUS_ORDER: ProjectStatus[] = ["in-flight", "blocked", "planned", "done"];

export function AgentDetail({ agent }: { agent: Agent }) {
  const allProjects = useStore((s) => s.snapshot.projects);
  const agents = useStore((s) => s.snapshot.agents);
  const agentSdk = useStore((s) => s.snapshot.agentSdk);

  const ownedProjects = allProjects.filter((p) => p.ownerAgentId === agent.id);
  const agentsById = Object.fromEntries(agents.map((a) => [a.id, a]));

  const inFlight = ownedProjects.filter((p) => p.status === "in-flight").length;
  const blocked = ownedProjects.filter((p) => p.status === "blocked").length;
  const planned = ownedProjects.filter((p) => p.status === "planned").length;
  const ctxPct = agent.contextWindowSize > 0 ? Math.round((agent.currentTokens / agent.contextWindowSize) * 100) : 0;

  const statusFilter = useStore((s) => s.projectStatusFilter);
  const toggleStatus = useStore((s) => s.toggleProjectStatus);
  const showOnly = useStore((s) => s.isolateProjectStatus);
  const showAll = useStore((s) => s.resetProjectStatusFilter);

  const counts: Record<ProjectStatus, number> = {
    "in-flight": inFlight,
    blocked,
    planned,
    done: ownedProjects.filter((p) => p.status === "done").length,
  };

  const visibleProjects = ownedProjects.filter((p) => statusFilter.has(p.status));

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div style={{ padding: "16px 20px 14px", borderBottom: "1px solid var(--line-1)", display: "flex", alignItems: "flex-start", gap: 16, flexShrink: 0 }}>
        <AgentAvatar agent={agent} size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "nowrap", minWidth: 0 }}>
            <AgentNameEditor agent={agent} />
            <StatusDot status={agent.status} size={7} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--fg-3)", letterSpacing: 0.04, flexShrink: 0 }}>{agent.status}</span>
            <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>
              session {agent.sessionId ? agent.sessionId.slice(0, 8) : "—"}
            </span>
          </div>
          <div style={{ fontSize: 12, color: "var(--fg-2)", marginTop: 2 }}>{agent.role}</div>
          {agent.latestSessionFile && (
            <div style={{ fontSize: 10.5, color: "var(--fg-3)", marginTop: 4, fontFamily: "var(--font-mono)" }}>
              latest · {agent.latestSessionFile} · inbox {agent.inboxCount}
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--line-1)", display: "flex", gap: 0, alignItems: "stretch", flexWrap: "wrap", flexShrink: 0 }}>
        <KPI label="In-flight" value={inFlight} />
        <KPI label="Blocked" value={blocked} hint={blocked > 0 ? "see DAG" : undefined} />
        <KPI label="Planned" value={planned} />
        <KPI label="Context" value={`${formatNum(agent.currentTokens)} / 1M`} hint={`${ctxPct}%`} />
        <KPI label="Tools" value={agent.currentTools} hint="this session" />
        <KPI label="Inbox" value={agent.inboxCount} hint={agent.status === "blocked" ? "blocking" : undefined} />
      </div>

      {agent.id === "agent-one" && <AgentLivePanel state={agentSdk} />}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, overflow: "hidden" }}>
        <StatusFilterBar
          counts={counts}
          active={statusFilter}
          onToggle={toggleStatus}
          onOnly={showOnly}
          onAll={showAll}
          totalOwned={ownedProjects.length}
        />
        <div style={{ flex: "1 1 auto", overflowY: "auto", borderBottom: "1px solid var(--line-1)", minHeight: 120 }}>
          <ProjectList
            projects={visibleProjects}
            totalOwned={ownedProjects.length}
            statusFilter={statusFilter}
            allProjects={allProjects}
            agentsById={agentsById}
            onShowAll={showAll}
          />
        </div>
        <div style={{ flex: "0 0 320px", overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ padding: "8px 20px", borderBottom: "1px solid var(--line-1)", display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
            <Eyebrow>Dependency graph · {agent.name}'s projects</Eyebrow>
            <span style={{ fontSize: 10, color: "var(--fg-3)", whiteSpace: "nowrap" }}>orphans left → chains right · hover for blockers</span>
          </div>
          <div style={{ flex: 1, position: "relative", overflow: "auto", minHeight: 0 }}>
            <DAG projects={ownedProjects} allProjects={allProjects} agentsById={agentsById} mode="agent" />
          </div>
        </div>
      </div>
    </div>
  );
}

function firstString(source: Record<string, unknown> | null | undefined, keys: string[]): string | null {
  if (!source) return null;
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function firstNumber(source: Record<string, unknown> | null | undefined, keys: string[]): number | null {
  if (!source) return null;
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
}

function actionText(action: AgentSdkAction): string {
  const label = action.kind || action.type || action.status;
  if (action.summary && label) return `${label}: ${action.summary}`;
  return action.summary || action.outcome || label || JSON.stringify(action);
}

function statusColor(status: string): string {
  if (status === "awaiting-approval" || status === "blocked") return "var(--st-blocked)";
  if (status === "thinking" || status === "tool-call") return "var(--st-working)";
  if (status === "done") return "var(--st-ok)";
  return "var(--fg-2)";
}

function AgentLivePanel({ state }: { state?: AgentSdkState }) {
  const currentTask = state?.currentTask || null;
  const headline = firstString(currentTask, ["headline", "title", "task", "current_task", "summary"]) || "Waiting for SDK state";
  const mode = firstString(currentTask, ["mode", "status", "phase"]) || (state?.exists ? "ready" : "not ready");
  const currentStep = firstString(currentTask, ["current_step"]);
  const pendingCount = firstNumber(currentTask, ["pending_approval_count"]) ?? state?.pendingApprovalsCount ?? 0;
  const actions = state?.recentActions || [];
  const lastAction = actions[actions.length - 1];
  const missing = state?.missingFiles || [];

  return (
    <section
      style={{
        borderBottom: "1px solid var(--line-1)",
        background: "var(--bg-1)",
        padding: "10px 20px",
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: 14,
        flexShrink: 0,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <Eyebrow>BK Live</Eyebrow>
        <div style={{ marginTop: 5, color: "var(--fg-0)", fontSize: 13, lineHeight: 1.35, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {headline}
        </div>
        <div style={{ marginTop: 5, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--fg-3)" }}>
          <span className="chip" style={{ color: statusColor(mode) }}>{mode}</span>
          <span>{currentTask?.last_updated_at ? `updated ${formatRelative(String(currentTask.last_updated_at))}` : state?.lastUpdatedAt ? `updated ${formatRelative(state.lastUpdatedAt)}` : "no state writes yet"}</span>
        </div>
        {currentStep && (
          <div style={{ marginTop: 6, fontSize: 11.5, color: "var(--fg-2)", lineHeight: 1.35, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {currentStep}
          </div>
        )}
      </div>

      <div style={{ minWidth: 0 }}>
        <Eyebrow>Recent actions</Eyebrow>
        {lastAction?.ts && (
          <div style={{ marginTop: 5, fontFamily: "var(--font-mono)", fontSize: 10.5, color: "var(--fg-3)" }}>
            last {formatRelative(lastAction.ts)}
          </div>
        )}
        {actions.length === 0 ? (
          <div style={{ marginTop: 7, fontSize: 11.5, color: "var(--fg-3)" }}>No actions yet.</div>
        ) : (
          <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 3 }}>
            {actions.slice(-5).reverse().map((action, i) => (
              <div key={i} style={{ fontSize: 11.5, color: "var(--fg-1)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {actionText(action)}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ minWidth: 0 }}>
        <Eyebrow>Approvals</Eyebrow>
        <div style={{ marginTop: 5, fontSize: 22, color: pendingCount ? "var(--st-blocked)" : "var(--fg-0)", fontFamily: "var(--font-mono)" }}>
          {pendingCount}
        </div>
        {missing.length > 0 && (
          <div style={{ marginTop: 4, fontSize: 10.5, color: "var(--fg-3)", lineHeight: 1.35 }}>
            Waiting on {missing.join(", ")}
          </div>
        )}
      </div>
    </section>
  );
}

function AgentNameEditor({ agent }: { agent: Agent }) {
  const renameAgent = useStore((s) => s.renameAgent);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(agent.name);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Reset draft if the underlying name changes from elsewhere (e.g. WS push from another tab).
  useEffect(() => { if (!editing) setDraft(agent.name); }, [agent.name, editing]);

  function commit() {
    const trimmed = draft.trim();
    if (!trimmed || trimmed === agent.name) { setEditing(false); setDraft(agent.name); return; }
    renameAgent(agent.id, trimmed);
    setEditing(false);
  }

  function cancel() {
    setEditing(false);
    setDraft(agent.name);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); commit(); }
          else if (e.key === "Escape") { e.preventDefault(); cancel(); }
        }}
        className="display"
        style={{
          fontSize: 22, margin: 0, padding: "0 4px",
          background: "var(--bg-2)",
          border: "1px solid var(--line-2)",
          borderRadius: 3,
          color: "var(--fg-0)",
          fontFamily: "inherit",
          outline: "none",
          maxWidth: 280,
        }}
      />
    );
  }
  return (
    <h1
      className="display"
      onDoubleClick={() => setEditing(true)}
      title="Double-click to rename"
      style={{ fontSize: 22, margin: 0, color: "var(--fg-0)", whiteSpace: "nowrap", flexShrink: 0, cursor: "text" }}
    >
      {agent.name}
    </h1>
  );
}

function StatusFilterBar({ counts, active, onToggle, onOnly, onAll, totalOwned }: {
  counts: Record<ProjectStatus, number>;
  active: Set<ProjectStatus>;
  onToggle: (s: ProjectStatus) => void;
  onOnly: (s: ProjectStatus) => void;
  onAll: () => void;
  totalOwned: number;
}) {
  if (totalOwned === 0) return null;
  const allOn = STATUS_ORDER.every((s) => active.has(s));
  return (
    <div
      style={{
        padding: "8px 20px",
        borderBottom: "1px solid var(--line-1)",
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexShrink: 0,
        background: "var(--bg-1)",
      }}
    >
      <span className="eyebrow" style={{ marginRight: 4 }}>filter</span>
      {STATUS_ORDER.map((s) => {
        const isActive = active.has(s);
        const count = counts[s];
        const dotVar = ({
          "in-flight": "--st-working",
          blocked: "--st-blocked",
          planned: "--st-idle",
          done: "--st-ok",
        } as const)[s];
        const dotColor = `var(${dotVar})`;
        return (
          <button
            key={s}
            onClick={() => onToggle(s)}
            onDoubleClick={() => onOnly(s)}
            title={`Click to toggle. Double-click to show only ${s}.`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "3px 9px",
              fontSize: 11,
              fontFamily: "var(--font-mono)",
              letterSpacing: 0.04,
              border: `1px solid ${isActive ? "var(--line-3)" : "var(--line-1)"}`,
              borderRadius: 999,
              background: isActive ? "var(--bg-2)" : "transparent",
              color: isActive ? "var(--fg-1)" : "var(--fg-3)",
              cursor: "pointer",
              opacity: count === 0 ? 0.45 : 1,
              transition: "background 80ms ease, color 80ms ease, opacity 80ms ease",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: dotColor,
                opacity: isActive ? 1 : 0.4,
              }}
            />
            <span>{s}</span>
            <span className="num" style={{ fontSize: 10.5, color: "var(--fg-3)" }}>{count}</span>
          </button>
        );
      })}
      {!allOn && (
        <button
          onClick={onAll}
          style={{
            marginLeft: "auto",
            padding: "3px 8px",
            fontSize: 10.5,
            color: "var(--fg-3)",
            background: "transparent",
            border: "none",
            fontFamily: "var(--font-mono)",
            cursor: "pointer",
            letterSpacing: 0.04,
          }}
        >
          show all
        </button>
      )}
    </div>
  );
}

function ProjectList({ projects, totalOwned, statusFilter, allProjects, agentsById, onShowAll }: {
  projects: Project[];
  totalOwned: number;
  statusFilter: Set<ProjectStatus>;
  allProjects: Project[];
  agentsById: Record<string, Agent>;
  onShowAll: () => void;
}) {
  if (totalOwned === 0) {
    return (
      <div style={{ padding: 24, color: "var(--fg-3)", fontSize: 12 }}>
        No projects yet for this agent. They land here once the agent authors <code>05 — Sessions/&lt;Agent&gt;/projects.json</code>.
      </div>
    );
  }
  if (projects.length === 0) {
    const activeList = Array.from(statusFilter);
    return (
      <div style={{ padding: 24, color: "var(--fg-3)", fontSize: 12 }}>
        {activeList.length === 0
          ? "No statuses selected. Click a filter chip above to show projects."
          : `No projects match the current filter (${activeList.join(", ")}). `}
        <button
          onClick={onShowAll}
          style={{ background: "transparent", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: 12, padding: 0 }}
        >
          show all {totalOwned}
        </button>
      </div>
    );
  }
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
      <thead>
        <tr style={{ position: "sticky", top: 0, background: "var(--bg-0)", zIndex: 1 }}>
          {["Title", "Status", "Deps", "KPIs", "Vault path", "Last sync"].map((h) => (
            <th key={h} style={{ textAlign: "left", padding: "8px 16px", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 400, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: 0.1, borderBottom: "1px solid var(--line-1)" }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {projects.map((p) => {
          const blockingAgents = (p.blockers || [])
            .map((bid) => allProjects.find((x) => x.id === bid))
            .filter(Boolean)
            .map((b) => agentsById[(b as Project).ownerAgentId]);
          return (
            <tr
              key={p.id}
              style={{ borderBottom: "1px solid var(--line-1)" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-2)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <td style={{ padding: "10px 16px", color: "var(--fg-0)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {p.title}
                  {p.conflict && <span className="conflict">vault conflict</span>}
                </div>
              </td>
              <td style={{ padding: "10px 16px" }}><StatusPill status={p.status} /></td>
              <td style={{ padding: "10px 16px", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-2)" }}>
                {p.blockers?.length > 0 ? (
                  <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
                    {p.blockers.length} blocker{p.blockers.length > 1 ? "s" : ""}
                    <span style={{ display: "inline-flex", gap: 2 }}>
                      {blockingAgents.map((a, i) => a && <AgentHue key={i} agent={a} height={10} width={2} />)}
                    </span>
                  </span>
                ) : "—"}
              </td>
              <td style={{ padding: "10px 16px", fontSize: 11 }}>
                <span style={{ display: "inline-flex", gap: 12, color: "var(--fg-1)" }}>
                  {p.kpis.map((k, i) => (
                    <span key={i}><span style={{ color: "var(--fg-3)", fontSize: 10 }}>{k.label} </span><span className="num">{k.value}</span></span>
                  ))}
                </span>
              </td>
              <td style={{ padding: "10px 16px", fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--fg-3)" }}>{p.vaultPath}</td>
              <td style={{ padding: "10px 16px", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-3)" }}>{p.lastSyncedAt}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function layoutDAG(projects: Project[]) {
  const ids = new Set(projects.map((p) => p.id));
  const layer = new Map<string, number>();
  function layerOf(id: string, seen = new Set<string>()): number {
    if (layer.has(id)) return layer.get(id)!;
    if (seen.has(id)) return 0;
    seen.add(id);
    const p = projects.find((x) => x.id === id);
    if (!p) return 0;
    const incoming = (p.blockers || []).filter((b) => ids.has(b));
    if (incoming.length === 0) { layer.set(id, 0); return 0; }
    const l = 1 + Math.max(...incoming.map((b) => layerOf(b, seen)));
    layer.set(id, l);
    return l;
  }
  projects.forEach((p) => layerOf(p.id));

  const cols: Record<number, Project[]> = {};
  projects.forEach((p) => {
    const l = layer.get(p.id) || 0;
    cols[l] = cols[l] || [];
    cols[l].push(p);
  });

  const colW = 220, rowH = 56, padX = 32, padY = 24;
  const positions: Record<string, { x: number; y: number }> = {};
  const colKeys = Object.keys(cols).map(Number).sort((a, b) => a - b);
  colKeys.forEach((c) => {
    cols[c].forEach((p, i) => {
      positions[p.id] = { x: padX + c * colW, y: padY + i * rowH };
    });
  });
  const maxRows = Math.max(1, ...colKeys.map((c) => cols[c].length));
  const width = padX + (colKeys.length || 1) * colW;
  const height = padY * 2 + maxRows * rowH;
  return { positions, width, height };
}

function DAG({ projects, allProjects, agentsById, mode = "agent", highlightSet, dim = false }: {
  projects: Project[];
  allProjects: Project[];
  agentsById: Record<string, Agent>;
  mode?: string;
  highlightSet?: Set<string>;
  dim?: boolean;
}) {
  const { positions, width, height } = useMemo(() => layoutDAG(projects), [projects]);
  const ids = new Set(projects.map((p) => p.id));
  const [hover, setHover] = useState<string | null>(null);

  const edges: { from: string; to: string }[] = [];
  for (const p of projects) {
    for (const b of p.blockers || []) {
      if (ids.has(b)) edges.push({ from: b, to: p.id });
    }
  }

  if (projects.length === 0) {
    return (
      <div style={{ padding: 24, color: "var(--fg-3)", fontSize: 12 }}>
        No dependency graph — projects feed lands in phase 2.5.
      </div>
    );
  }

  const NODE_W = 188, NODE_H = 44;

  return (
    <div style={{ position: "relative", width: Math.max(width, 600), height: Math.max(height, 240), padding: 0 }}>
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--line-3)" />
          </marker>
          <marker id="arrow-hi" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent)" />
          </marker>
        </defs>
        {edges.map((e, i) => {
          const a = positions[e.from], b = positions[e.to];
          if (!a || !b) return null;
          const x1 = a.x + NODE_W, y1 = a.y + NODE_H / 2;
          const x2 = b.x, y2 = b.y + NODE_H / 2;
          const cx = (x1 + x2) / 2;
          const path = `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;
          const targetProj = projects.find((p) => p.id === e.to);
          const blockerOwner = agentsById[allProjects.find((p) => p.id === e.from)?.ownerAgentId || ""];
          const isHi = highlightSet ? highlightSet.has(e.from) && highlightSet.has(e.to) : false;
          const stroke = isHi ? "var(--accent)" : targetProj?.status === "blocked" ? "var(--st-blocked)" : "var(--line-3)";
          return (
            <g key={i}>
              <path
                d={path} fill="none" stroke={stroke} strokeWidth={isHi ? 1.5 : 1}
                strokeDasharray={targetProj?.status === "blocked" ? "3 3" : undefined}
                markerEnd={isHi ? "url(#arrow-hi)" : "url(#arrow)"}
                opacity={dim && !isHi ? 0.25 : 1}
              />
              {blockerOwner && mode === "blocked-tree" && (
                <text x={cx} y={(y1 + y2) / 2 - 4} fontSize="9" fill="var(--fg-3)" textAnchor="middle" style={{ fontFamily: "var(--font-mono)" }}>
                  via {blockerOwner.name}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {projects.map((p) => {
        const pos = positions[p.id];
        if (!pos) return null;
        const owner = agentsById[p.ownerAgentId];
        const isHi = highlightSet ? highlightSet.has(p.id) : false;
        const isDim = dim && !isHi;
        return (
          <div
            key={p.id}
            onMouseEnter={() => setHover(p.id)}
            onMouseLeave={() => setHover(null)}
            style={{
              position: "absolute",
              left: pos.x, top: pos.y,
              width: NODE_W, minHeight: NODE_H,
              background: "var(--bg-2)",
              border: `1px solid ${p.status === "blocked" ? "var(--st-blocked)" : isHi ? "var(--accent)" : "var(--line-2)"}`,
              borderLeft: `3px solid var(${owner?.hueVar || "--line-3"})`,
              borderRadius: 3,
              padding: "6px 8px",
              fontSize: 11,
              cursor: "default",
              opacity: isDim ? 0.4 : 1,
              boxShadow: isHi ? "0 0 0 2px var(--accent-tint)" : "none",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 6 }}>
              <span style={{ color: "var(--fg-0)", fontSize: 11.5, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{p.title}</span>
              <StatusDot status={p.status === "in-flight" ? "working" : p.status} size={5} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 10, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>
              <span>{owner?.name}</span>
              {p.blockers?.length > 0 && <span style={{ color: "var(--st-blocked)" }}>← {p.blockers.length}</span>}
              {p.conflict && <span className="conflict" style={{ padding: "0 3px" }}>conflict</span>}
            </div>
            {hover === p.id && p.blockers?.length > 0 && (
              <div style={{ position: "absolute", left: 0, top: "100%", marginTop: 6, background: "var(--bg-3)", border: "1px solid var(--line-2)", borderRadius: 3, padding: "6px 8px", fontSize: 10, color: "var(--fg-1)", whiteSpace: "nowrap", zIndex: 10, boxShadow: "var(--shadow-2)" }}>
                <div style={{ color: "var(--fg-3)", fontSize: 9.5, textTransform: "uppercase", letterSpacing: 0.1, marginBottom: 4 }}>Blocked by</div>
                {p.blockers.map((bid) => {
                  const b = allProjects.find((x) => x.id === bid);
                  const o = b ? agentsById[b.ownerAgentId] : undefined;
                  return (
                    <div key={bid} style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      {o && <AgentHue agent={o} height={8} width={2} />}
                      <span>{b?.title}</span>
                      <span style={{ color: "var(--fg-3)" }}>· {o?.name}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function MapView() {
  const projects = useStore((s) => s.snapshot.projects);
  const agents = useStore((s) => s.snapshot.agents);
  const edges = useStore((s) => s.snapshot.edges);
  const [mode, setMode] = useState<"critical-path" | "parallelizable" | "blocked-tree" | "agent-routing">("critical-path");
  const agentsById = Object.fromEntries(agents.map((a) => [a.id, a]));

  const critical = useMemo(() => {
    const dist = new Map<string, number>();
    function d(id: string): number {
      if (dist.has(id)) return dist.get(id)!;
      const p = projects.find((x) => x.id === id);
      if (!p) return 0;
      const inc = p.blockers || [];
      const v = inc.length === 0 ? 1 : 1 + Math.max(...inc.map(d));
      dist.set(id, v);
      return v;
    }
    projects.forEach((p) => d(p.id));
    let endId: string | null = null, maxD = 0;
    for (const [id, v] of dist.entries()) { if (v > maxD) { maxD = v; endId = id; } }
    const chain = new Set<string>();
    function walk(id: string | null) {
      if (!id || chain.has(id)) return;
      chain.add(id);
      const p = projects.find((x) => x.id === id);
      const inc = ((p?.blockers as string[]) || []).slice().sort((a, b) => (dist.get(b) || 0) - (dist.get(a) || 0));
      if (inc.length) walk(inc[0]);
    }
    walk(endId);
    return chain;
  }, [projects]);

  const blockedTree = useMemo(() => {
    const set = new Set<string>();
    function walkUp(id: string) {
      if (set.has(id)) return;
      set.add(id);
      const p = projects.find((x) => x.id === id);
      (p?.blockers || []).forEach(walkUp);
    }
    projects.filter((p) => p.status === "blocked").forEach((p) => walkUp(p.id));
    return set;
  }, [projects]);

  const visible = useMemo(() => {
    if (mode === "blocked-tree") return projects.filter((p) => blockedTree.has(p.id));
    return projects;
  }, [mode, projects, blockedTree]);

  const highlight = mode === "critical-path" ? critical : mode === "blocked-tree" ? blockedTree : undefined;
  const dim = mode === "critical-path";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--line-1)", display: "flex", alignItems: "center", gap: 16 }}>
        <h1 className="display" style={{ fontSize: 20, margin: 0 }}>Map</h1>
        <span style={{ fontSize: 11, color: "var(--fg-3)" }}>· cross-agent dependency view · {visible.length} of {projects.length} projects</span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 0, alignItems: "center", border: "1px solid var(--line-2)", borderRadius: 3, overflow: "hidden" }}>
          {([
            ["critical-path", "Critical path"],
            ["parallelizable", "Parallelizable"],
            ["blocked-tree", "Blocked tree"],
            ["agent-routing", "Routing"],
          ] as const).map(([id, label], i, arr) => (
            <button
              key={id}
              onClick={() => setMode(id)}
              style={{
                padding: "5px 12px",
                fontSize: 11,
                background: mode === id ? "var(--bg-3)" : "transparent",
                color: mode === id ? "var(--fg-0)" : "var(--fg-2)",
                borderRight: i < arr.length - 1 ? "1px solid var(--line-2)" : "none",
                fontFamily: "var(--font-mono)",
                letterSpacing: 0.04,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "8px 20px", borderBottom: "1px solid var(--line-1)", fontSize: 11, color: "var(--fg-2)" }}>
        {mode === "critical-path" && `Longest dependency chain · ${highlight?.size || 0} on the critical path. Other work is dimmed.`}
        {mode === "parallelizable" && "Independent chains side-by-side. Different columns can run concurrently."}
        {mode === "blocked-tree" && "Blocked items and what they're waiting on. Edge labels name the agent doing the unblocking."}
        {mode === "agent-routing" && "Who asks whom. Each @mention in chat is a directed edge between agents. Source: VaultBus routes.jsonl."}
      </div>

      <div style={{ flex: 1, overflow: "auto", background: "var(--bg-0)", position: "relative" }}>
        {mode === "agent-routing" ? (
          <AgentRoutingGraph agents={agents} edges={edges.filter((e) => e.source === "route")} />
        ) : projects.length === 0 ? (
          <div style={{ padding: 40, color: "var(--fg-3)", fontSize: 12, textAlign: "center" }}>
            No cross-agent edges to render. Map view feeds from VaultBus inbox routing metadata · phase 4.
          </div>
        ) : (
          <DAG projects={visible} allProjects={projects} agentsById={agentsById} mode={mode} highlightSet={highlight} dim={dim} />
        )}
      </div>
    </div>
  );
}

function AgentRoutingGraph({ agents, edges }: {
  agents: Agent[];
  edges: { from: string; to: string; source?: string }[];
}) {
  const involved = useMemo(() => {
    const ids = new Set<string>();
    for (const e of edges) { ids.add(e.from); ids.add(e.to); }
    return agents.filter((a) => ids.has(a.id));
  }, [edges, agents]);

  const NODE_W = 156;
  const NODE_H = 44;
  const COL_GAP = 80;
  const ROW_GAP = 22;
  const PAD = 32;
  const cols = Math.min(3, Math.max(1, Math.ceil(Math.sqrt(involved.length))));
  const rows = Math.max(1, Math.ceil(involved.length / cols));
  const width = PAD * 2 + cols * NODE_W + (cols - 1) * COL_GAP;
  const height = PAD * 2 + rows * NODE_H + (rows - 1) * ROW_GAP;

  const positions = useMemo(() => {
    const out: Record<string, { x: number; y: number }> = {};
    involved.forEach((a, i) => {
      const c = i % cols;
      const r = Math.floor(i / cols);
      out[a.id] = { x: PAD + c * (NODE_W + COL_GAP), y: PAD + r * (NODE_H + ROW_GAP) };
    });
    return out;
  }, [involved, cols]);

  if (edges.length === 0) {
    return (
      <div style={{ padding: 40, color: "var(--fg-3)", fontSize: 12, textAlign: "center" }}>
        No routing edges yet. Each @mention in the group chat creates a directed edge.
      </div>
    );
  }

  return (
    <div style={{ position: "relative", width: Math.max(width, 600), height: Math.max(height, 240) }}>
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <defs>
          <marker id="arrow-route" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent)" />
          </marker>
        </defs>
        {edges.map((e, i) => {
          const a = positions[e.from];
          const b = positions[e.to];
          if (!a || !b) return null;
          const x1 = a.x + NODE_W / 2;
          const y1 = a.y + NODE_H;
          const x2 = b.x + NODE_W / 2;
          const y2 = b.y;
          const cy = (y1 + y2) / 2;
          const path = `M ${x1} ${y1} C ${x1} ${cy}, ${x2} ${cy}, ${x2} ${y2}`;
          return (
            <path
              key={i}
              d={path}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={1.5}
              strokeDasharray="6 3"
              markerEnd="url(#arrow-route)"
              opacity={0.85}
            >
              <animate attributeName="stroke-dashoffset" from="0" to="-9" dur="0.9s" repeatCount="indefinite" />
            </path>
          );
        })}
      </svg>

      {involved.map((a) => {
        const pos = positions[a.id];
        if (!pos) return null;
        return (
          <div
            key={a.id}
            style={{
              position: "absolute",
              left: pos.x,
              top: pos.y,
              width: NODE_W,
              height: NODE_H,
              background: "var(--bg-2)",
              border: "1px solid var(--line-2)",
              borderLeft: `3px solid var(${a.hueVar || "--line-3"})`,
              borderRadius: 3,
              padding: "6px 10px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 2,
            }}
          >
            <div style={{ color: "var(--fg-0)", fontSize: 12, lineHeight: 1.2 }}>{a.name}</div>
            <div style={{ color: "var(--fg-3)", fontSize: 10, fontFamily: "var(--font-mono)" }}>{a.role}</div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// HomeView (Phase 5, CC v4 2026-04-28)
// ============================================================================
// the owner's ask: "We're together to think about how we add the routines to the
// Command Center Dashboard and how we want to show the Command Center Dashboard.
// Where's our home page?"
// Answer: Home is a new first tab. Lands on KPIs + routines + agent grid +
// recent VaultBus activity. Command stays the chat. Style guide tokens only.

export function HomeView({ onOpenAgent, onGotoTab }: {
  onOpenAgent: (id: string) => void;
  onGotoTab: (t: "command" | "agent" | "map" | "spec") => void;
}) {
  const agents = useStore((s) => s.snapshot.agents);
  const projects = useStore((s) => s.snapshot.projects);
  const messages = useStore((s) => s.snapshot.messages);
  const telemetry = useStore((s) => s.snapshot.telemetry);
  const routines = useStore((s) => s.snapshot.routines || []);
  const routinesMeta = useStore((s) => s.snapshot.routinesMeta);
  const meta = useStore((s) => s.snapshot._meta);

  const primary = agents[0];
  const specialists = agents.slice(1);
  const onlineAgents = agents.filter((a) => {
    if (!a.lastActiveAt) return false;
    return Date.now() - new Date(a.lastActiveAt).getTime() < 5 * 60 * 1000;
  });
  const recentMsgs = useMemo(() => messages.slice(-5).reverse(), [messages]);
  const agentsById = Object.fromEntries(agents.map((a) => [a.id, a]));

  return (
    <div style={{ overflowY: "auto", height: "100%", padding: "20px 28px 80px", maxWidth: 1180, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 16 }}>
        <Eyebrow>Home</Eyebrow>
        <h1 className="display" style={{ fontSize: 22, margin: 0, color: "var(--fg-0)" }}>Agent OS</h1>
        <span style={{ fontSize: 11, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>
          phase {meta.phase} · {meta.sessionsScanned} sessions scanned
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 24, padding: "12px 14px", background: "var(--bg-1)", border: "1px solid var(--line-1)", borderRadius: 4 }}>
        <KPI label="agents online" value={`${onlineAgents.length} / ${agents.length}`} hint={onlineAgents.map((a) => a.name).join(", ") || "none active"} />
        <KPI label="tokens / min" value={formatNum(telemetry.tokensPerMin)} hint="rolling 60s" />
        <KPI label="today tokens" value={formatNum(telemetry.todayTokens)} hint={`${telemetry.todayTools} tool calls`} />
        <KPI label="projects" value={projects.length} hint={`${telemetry.inFlight} in-flight, ${telemetry.blocked} blocked`} />
        <KPI label="sessions live" value={telemetry.sessionsLive} hint="JSONL active" />
      </div>

      <Section title="Routines" hint={routinesMeta?.lastFetchedAt ? `last fetched ${formatRelative(routinesMeta.lastFetchedAt)}` : "no routines snapshot"}>
        {routines.length === 0 ? (
          <div style={{ padding: 20, color: "var(--fg-3)", fontSize: 12, border: "1px dashed var(--line-2)", borderRadius: 3, textAlign: "center" }}>
            No routines tracked. Pull via mcp__scheduled-tasks__list_scheduled_tasks and write to Operations/routines.json.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 10 }}>
            {routines.map((r) => <RoutineCard key={r.id} routine={r} />)}
          </div>
        )}
      </Section>

      <Section title="Agents" hint="click any row to open detail">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
          {primary && <AgentCard agent={primary} pinned onClick={() => onOpenAgent(primary.id)} />}
          {specialists.map((a) => <AgentCard key={a.id} agent={a} onClick={() => onOpenAgent(a.id)} />)}
        </div>
      </Section>

      <Section title="Recent group chat" hint={`${messages.length} messages total`} onSeeMore={() => onGotoTab("command")}>
        {recentMsgs.length === 0 ? (
          <div style={{ padding: 16, color: "var(--fg-3)", fontSize: 12 }}>No messages yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {recentMsgs.map((m) => {
              const author = m.authorId === "me" ? { id: "me", name: "Owner", hueVar: "--accent" } : agentsById[m.authorId];
              if (!author) return null;
              const preview = m.body.length > 180 ? m.body.slice(0, 180) + "…" : m.body;
              const displayTime = displayClockFromMessage(m);
              return (
                <div key={m.id} style={{ display: "grid", gridTemplateColumns: "20px 1fr auto", gap: 10, alignItems: "baseline", padding: "6px 10px", background: "var(--bg-1)", border: "1px solid var(--line-1)", borderRadius: 3 }}>
                  <AgentAvatar agent={author} size={18} />
                  <div style={{ minWidth: 0 }}>
                    <span style={{ color: "var(--fg-0)", fontWeight: 500, fontSize: 11.5 }}>{author.name}</span>
                    <span style={{ marginLeft: 8, fontSize: 11.5, color: "var(--fg-2)", lineHeight: 1.4 }}>{preview}</span>
                  </div>
                  <span className="num" style={{ fontSize: 10, color: "var(--fg-3)", whiteSpace: "nowrap" }}>{displayTime}</span>
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({ title, hint, onSeeMore, children }: {
  title: string;
  hint?: string;
  onSeeMore?: () => void;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
        <h2 className="display" style={{ fontSize: 14, margin: 0, color: "var(--fg-0)" }}>{title}</h2>
        {hint && <span style={{ fontSize: 11, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>{hint}</span>}
        {onSeeMore && (
          <button className="btn ghost" style={{ fontSize: 10.5, padding: "2px 8px", marginLeft: "auto" }} onClick={onSeeMore}>
            open
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

function RoutineCard({ routine }: { routine: Routine }) {
  const [, setTick] = useState(0);
  const [tipOpen, setTipOpen] = useState(false);
  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(i);
  }, []);
  const nextIn = routine.nextRunAt ? msUntil(routine.nextRunAt) : null;
  const lastAgo = routine.lastRun ? Date.now() - new Date(routine.lastRun).getTime() : null;
  const overdue = nextIn !== null && nextIn < 0;
  const runningService = routine.kind === "launchd" && routine.status === "running";
  const lastLabel = runningService
    ? "state"
    : routine.kind === "launchd"
    ? routine.schedule === "at-login" ? "setup" : "log"
    : "run";
  const lastText = runningService
    ? "running now"
    : lastAgo === null
    ? routine.kind === "scheduled-task" ? "no local log" : "no log"
    : `${formatDuration(lastAgo)} ago`;
  const isHealthy =
    routine.kind === "launchd"
      ? routine.status === "running" || routine.status === "loaded"
      : routine.enabled;
  const accent = !routine.enabled
    ? "var(--line-3)"
    : overdue || (routine.lastExitStatus !== null && routine.lastExitStatus !== 0)
      ? "var(--st-blocked)"
      : isHealthy
        ? "var(--st-working)"
        : "var(--st-planned)";
  return (
    <div
      style={{
        background: "var(--bg-1)",
        border: "1px solid var(--line-1)",
        borderLeft: `3px solid ${accent}`,
        borderRadius: 3,
        padding: "10px 12px",
        display: "flex",
        flexDirection: "column",
        gap: 4,
        position: "relative",
      }}
      onMouseEnter={() => setTipOpen(true)}
      onMouseLeave={() => setTipOpen(false)}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ color: "var(--fg-0)", fontSize: 12.5 }}>{routine.label}</span>
        {routine.label !== routine.id && (
          <span style={{ fontSize: 10, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>{routine.id}</span>
        )}
        <button
          aria-label="What does this do?"
          onClick={(e) => { e.stopPropagation(); setTipOpen((v) => !v); }}
          style={{
            marginLeft: "auto",
            width: 16, height: 16,
            borderRadius: "50%",
            border: "1px solid var(--line-2)",
            background: tipOpen ? "var(--bg-3)" : "transparent",
            color: "var(--fg-2)",
            fontSize: 10,
            lineHeight: 1,
            cursor: "pointer",
            padding: 0,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-mono)",
          }}
        >i</button>
        <span style={{ fontSize: 9.5, color: "var(--fg-3)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: 0.06 }}>
          {routine.kind === "launchd" ? "launchd" : "task"}
        </span>
      </div>
      <div style={{ fontSize: 11, color: "var(--fg-2)", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" }}>
        {routine.description}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 10, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>
        <span>{routine.schedule}</span>
        <span style={{ color: routine.lastExitStatus && routine.lastExitStatus !== 0 ? "var(--st-blocked)" : routine.status === "running" ? "var(--st-working)" : "var(--fg-3)" }}>
          {routine.status}{routine.pid !== null ? ` · pid ${routine.pid}` : ""}
        </span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>
        {nextIn !== null && (
          <span style={{ color: overdue ? "var(--st-blocked)" : "var(--fg-2)" }}>
            next: {overdue ? `overdue by ${formatDuration(-nextIn)}` : `in ${formatDuration(nextIn)}`}
          </span>
        )}
        <span style={{ marginLeft: nextIn !== null ? 0 : "auto" }}>
          {lastLabel}: {lastText}
        </span>
      </div>
      {tipOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            right: 0,
            background: "var(--bg-3)",
            border: "1px solid var(--line-2)",
            borderRadius: 4,
            padding: "10px 12px",
            zIndex: 20,
            boxShadow: "var(--shadow-2)",
            display: "flex",
            flexDirection: "column",
            gap: 6,
            pointerEvents: "auto",
          }}
        >
          <div style={{ fontSize: 11, color: "var(--fg-0)", fontWeight: 500 }}>{routine.label}</div>
          <div style={{ fontSize: 11.5, color: "var(--fg-1)", lineHeight: 1.5 }}>{routine.description || "No description on file."}</div>
          <div style={{ display: "grid", gridTemplateColumns: "70px 1fr", gap: "2px 8px", fontSize: 10.5, color: "var(--fg-2)", fontFamily: "var(--font-mono)", marginTop: 4 }}>
            <span style={{ color: "var(--fg-3)" }}>id</span><span>{routine.id}</span>
            <span style={{ color: "var(--fg-3)" }}>schedule</span><span>{routine.schedule || "—"}</span>
            {routine.cronExpression && (<><span style={{ color: "var(--fg-3)" }}>cron</span><span>{routine.cronExpression}</span></>)}
            <span style={{ color: "var(--fg-3)" }}>kind</span><span>{routine.kind}</span>
            <span style={{ color: "var(--fg-3)" }}>status</span><span>{routine.status}</span>
            <span style={{ color: "var(--fg-3)" }}>{lastLabel}</span><span>{lastText}</span>
            {routine.logPath && (<><span style={{ color: "var(--fg-3)" }}>log</span><span>{routine.logPath}</span></>)}
            {routine.pid !== null && (<><span style={{ color: "var(--fg-3)" }}>pid</span><span>{routine.pid}</span></>)}
          </div>
        </div>
      )}
    </div>
  );
}

function AgentCard({ agent, pinned, onClick }: { agent: Agent; pinned?: boolean; onClick: () => void }) {
  const ctxPct = Math.min(1, Math.max(0, agent.currentContextPct || 0));
  const tier = ctxPct >= 0.70 ? "var(--st-blocked)" : ctxPct >= 0.50 ? "var(--st-planned)" : "var(--st-working)";
  return (
    <div
      onClick={onClick}
      style={{
        background: pinned ? "color-mix(in oklab, var(--accent-tint) 50%, var(--bg-1))" : "var(--bg-1)",
        border: "1px solid var(--line-1)",
        borderLeft: `3px solid var(${agent.hueVar})`,
        borderRadius: 3,
        padding: "10px 12px",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <StatusDot status={agent.status} />
        <span style={{ color: "var(--fg-0)", fontSize: 12.5 }}>{agent.name}</span>
        {pinned && <span className="kbd" style={{ fontSize: 9, padding: "0 3px", color: "var(--accent)", borderColor: "color-mix(in oklab, var(--accent) 40%, var(--line-2))" }}>CoS</span>}
        <span className="num" style={{ marginLeft: "auto", fontSize: 10, color: "var(--fg-3)" }}>{Math.round(ctxPct * 100)}%</span>
      </div>
      <div style={{ fontSize: 10.5, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>{agent.role}</div>
      <div style={{ height: 3, background: "var(--bg-3)", borderRadius: 2, overflow: "hidden", marginTop: 2 }}>
        <div style={{ width: `${Math.max(2, Math.round(ctxPct * 100))}%`, height: "100%", background: tier, transition: "width 200ms ease" }} />
      </div>
    </div>
  );
}

function msUntil(iso: string): number {
  return new Date(iso).getTime() - Date.now();
}

function formatDuration(ms: number): string {
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ${min % 60}m`;
  return `${Math.floor(hr / 24)}d ${hr % 24}h`;
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  return ms < 0 ? "future" : `${formatDuration(ms)} ago`;
}
