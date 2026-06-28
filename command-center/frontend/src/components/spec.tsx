import type { CSSProperties, ReactNode } from "react";
import { Eyebrow } from "./primitives";
import { useStore } from "../store";

const preStyle: CSSProperties = { background: "var(--bg-1)", border: "1px solid var(--line-1)", borderRadius: 3, padding: 14, fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--fg-1)", lineHeight: 1.55, overflowX: "auto", margin: "0 0 12px" };
const pStyle: CSSProperties = { fontSize: 13, color: "var(--fg-1)", lineHeight: 1.65, margin: "0 0 10px" };
const ulStyle: CSSProperties = { fontSize: 13, color: "var(--fg-1)", lineHeight: 1.7, paddingLeft: 18, margin: "0 0 8px" };

export function SpecView() {
  const meta = useStore((s) => s.snapshot._meta);
  return (
    <div style={{ overflowY: "auto", height: "100%", padding: "24px 32px 80px", maxWidth: 980, margin: "0 auto" }}>
      <div style={{ marginBottom: 28 }}>
        <Eyebrow>Specification</Eyebrow>
        <h1 className="display" style={{ fontSize: 32, margin: "4px 0 8px", color: "var(--fg-0)" }}>
          AG OS Command Center
        </h1>
        <p style={{ color: "var(--fg-2)", fontSize: 13.5, lineHeight: 1.6, maxWidth: 720, margin: 0 }}>
          A read/write aggregation layer for a primary orchestrator agent and a specialist roster.
          Source of truth is the Obsidian vault on disk · no Notion reconcile. Backend daemon tails Claude Code
          session JSONLs and watches the vault. Desktop-first, PWA-installable, no auth in v1 (local only).
        </p>
      </div>

      <Section n="01" title="Locked architecture">
        <ul style={ulStyle}>
          <li><b>Vault is the only canonical data source.</b> Daemon reads <code>vault/</code> on disk and Claude Code session JSONLs. Writes back to vault. No Notion.</li>
          <li><b>Group chat = broadcast with inbox-trigger hook.</b> User post writes a broadcast file plus per-mention inbox files. Every agent's next-boot reads them.</li>
          <li><b>Backend = single Node service, launchd-managed</b> (<code>home.agos.telemetry</code>) on <code>127.0.0.1:8787</code>. Pure stdlib · no node_modules.</li>
          <li><b>Frontend = React + Vite + TypeScript + PWA.</b> State: Zustand. Optimistic posts. Hydrate via REST, stream via WS.</li>
          <li><b>No auth.</b> Local only. Token-shaped query param can slot in later.</li>
        </ul>
      </Section>

      <Section n="02" title="Data model">
        <pre style={preStyle}>{`Agent    { id, name, role, status, contextWindowSize,
           currentTokens, currentTools, sessionId,
           lastActiveAt, inboxCount, latestSessionFile, model, hueVar }

Project  { id, ownerAgentId, title, status, kpis[],
           vaultPath, lastSyncedAt, blockers[], conflict }

Message  { id, channelId, authorId, body,
           mentions[], routedTo[], toolCalls[], timestamp,
           orchestratorRouted?, pending? }

Snapshot { agents[], projects[], threads[],
           messages[], edges[], telemetry, _meta }`}</pre>
        <p style={pStyle}>
          The daemon's <code>GET /api/snapshot</code> returns this exact shape. The frontend store hydrates from REST,
          then subscribes to <code>ws://127.0.0.1:8787/api/stream</code> for live <code>{`{ type: "snapshot", data }`}</code> frames.
        </p>
      </Section>

      <Section n="03" title="Broadcast with inbox-trigger hook">
        <p style={pStyle}>The Command view input box does three things on send:</p>
        <ul style={ulStyle}>
          <li><b>Broadcast file</b>. Writes <code>vault/VaultBus/Commands/broadcast/&lt;ts&gt;.md</code>. Every agent reads <code>broadcast/</code> on next boot.</li>
          <li><b>Per-mention inbox files</b>. For each <code>@agent</code>, writes <code>vault/VaultBus/Commands/inbox/&lt;slug&gt;/&lt;ts&gt;_broadcast.md</code>. Each agent's boot prompt already directs them to their inbox.</li>
          <li><b>Append to messages.jsonl</b>. <code>vault/VaultBus/Chat/messages.jsonl</code> is the append-only chat log. The daemon tails it and re-emits in <code>snapshot.messages[]</code>.</li>
        </ul>
        <p style={pStyle}>
          This design has no mid-session inject API today, so latency-to-act = next agent boot. The visibility layer is
          solved instantly via the broadcast file. A fresh-session-per-mention CLI subprocess can land later if message
          volume justifies it.
        </p>
      </Section>

      <Section n="04" title="Telemetry pipe">
        <ul style={ulStyle}>
          <li><b>Tail</b> <code>~/.claude/projects/&lt;your-project&gt;/&#42;.jsonl</code>. Match each session to an agent by boot-prompt fingerprint. Roll up tokens, tool counts, last-active timestamp.</li>
          <li><b>Watch</b> the vault recursively (<code>fs.watch</code>). Any change debounces a snapshot rebuild and a WS push.</li>
          <li><b>Status heuristic</b>. <code>working</code> = last assistant turn within 5 min. <code>blocked</code> = inbox count &gt; 0 and not working. Else <code>idle</code>.</li>
          <li><b>Anthropic API usage</b> · billing-level rollups every 60s (phase 3+).</li>
        </ul>
      </Section>

      <Section n="05" title="Frontend stack">
        <ul style={ulStyle}>
          <li><b>React 18 + Vite + TypeScript.</b></li>
          <li><b>Zustand</b> store with WS reconnect and exponential backoff. Optimistic message posts, reconciled on next snapshot.</li>
          <li><b>Inline SVG DAG.</b> Manual layered layout is sufficient for v2; <code>react-flow</code> + <code>elkjs</code> can swap in if drag-to-reschedule lands.</li>
          <li><b>PWA from day one.</b> Manifest + service worker. Installable from Chrome.</li>
          <li><b>Responsive breakpoints</b> down to 390px. Phone width is fallback, not target.</li>
        </ul>
      </Section>

      <Section n="06" title="Phased roadmap">
        <PhaseRow n="1" title="Backend daemon (shipped)">
          JSONL tail, vault watch, REST + WS, launchd plist. Status: live on <code>127.0.0.1:8787</code>.
        </PhaseRow>
        <PhaseRow n="2" title="Frontend wire-up + broadcast hook (this version)">
          Vite + React + TS, Zustand store, WS subscription, command/agent/map/spec views, broadcast POST.
        </PhaseRow>
        <PhaseRow n="2.5" title="Projects feed">
          Per-agent <code>projects.yaml</code> or handoff frontmatter parser. Populates <code>snapshot.projects[]</code> and the dependency DAG.
        </PhaseRow>
        <PhaseRow n="3" title="PWA polish + mobile breakpoints">
          Service worker tuning, install prompt, offline fallback, phone-width triage view.
        </PhaseRow>
        <PhaseRow n="4" title="Cross-agent edges">
          Real edges from VaultBus inbox routing metadata. Map view becomes load-bearing.
        </PhaseRow>
      </Section>

      <Section n="07" title="Out of scope for v2">
        <ul style={ulStyle}>
          <li>Real-time @mention mid-session inject. Pattern C does not support it. VaultBus inbox is the substitute.</li>
          <li>Drag-to-reschedule on Map view.</li>
          <li>Auth. Local only.</li>
          <li>Notion reconciler (killed).</li>
        </ul>
      </Section>

      <div style={{ marginTop: 40, paddingTop: 20, borderTop: "1px solid var(--line-1)", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-3)" }}>
        spec · v0.4 · daemon phase {meta.phase} · {meta.sessionsScanned} sessions scanned · generated {meta.generatedAt.slice(0, 19)}Z
      </div>
    </div>
  );
}

function Section({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <section style={{ marginBottom: 36, display: "grid", gridTemplateColumns: "60px 1fr", gap: 20, alignItems: "start" }}>
      <div style={{ paddingTop: 4, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-3)", letterSpacing: 0.1 }}>{n}</div>
      <div>
        <h2 className="display" style={{ fontSize: 20, margin: "0 0 12px", color: "var(--fg-0)" }}>{title}</h2>
        {children}
      </div>
    </section>
  );
}

function PhaseRow({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "32px 200px 1fr", gap: 16, padding: "10px 0", borderTop: "1px solid var(--line-1)", fontSize: 12.5, color: "var(--fg-1)", lineHeight: 1.55 }}>
      <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent)", fontSize: 11 }}>P{n}</span>
      <span style={{ color: "var(--fg-0)", fontWeight: 500 }}>{title}</span>
      <span>{children}</span>
    </div>
  );
}
