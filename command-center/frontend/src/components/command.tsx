import { useLayoutEffect, useMemo, useRef, useState, useEffect } from "react";
import type { ChangeEvent } from "react";
import type { Agent, Attachment, Message, Thread } from "../types";
import { useStore, useMessages, DAEMON_BASE } from "../store";
import type { OutgoingAttachment } from "../store";
import { AgentAvatar, AgentHue, Eyebrow, Pill } from "./primitives";
import { displayClockFromMessage } from "../time";

const ALLOWED_IMAGE_MIMES = new Set([
  "image/png", "image/jpeg", "image/gif", "image/webp", "image/svg+xml",
]);

// @team / @everyone / @all tag every agent. Server expands these to the full
// roster; client just adds the chip and pre-fills mentionedIds for preview.
const TEAM_TOKENS = new Set(["team", "everyone", "all"]);

function fileToOutgoingAttachment(file: File): Promise<OutgoingAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string; // data URL
      const comma = result.indexOf(",");
      if (comma < 0) return reject(new Error("could not parse data URL"));
      const dataBase64 = result.slice(comma + 1);
      resolve({
        name: file.name || "image.png",
        mime: file.type || "image/png",
        dataBase64,
        previewUrl: result,
      });
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function attachmentSrc(att: Attachment): string {
  // Optimistic posts use a data: URL; real ones use the daemon-served path.
  if (att.url.startsWith("data:") || att.url.startsWith("http")) return att.url;
  return `${DAEMON_BASE}${att.url}`;
}

export function CommandView() {
  const agents = useStore((s) => s.snapshot.agents);
  const threads = useStore((s) => s.snapshot.threads);
  const postMessage = useStore((s) => s.postMessage);
  const pinMessage = useStore((s) => s.pinMessage);
  const unpinMessage = useStore((s) => s.unpinMessage);
  const pinnedByChannel = useStore((s) => s.snapshot.pinnedMessageIds || {});
  const [activeThread, setActiveThread] = useState<string>("main");
  const messages = useMessages(activeThread);
  const [draft, setDraft] = useState("");
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteQ, setAutocompleteQ] = useState("");
  const [showRouting, setShowRouting] = useState(true);
  const [pendingAttachments, setPendingAttachments] = useState<OutgoingAttachment[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [pinnedExpanded, setPinnedExpanded] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const pinnedIds = pinnedByChannel[activeThread] || [];
  const pinnedSet = useMemo(() => new Set(pinnedIds), [pinnedIds]);
  const pinnedMessages = useMemo(
    () => messages.filter((m) => pinnedSet.has(m.id)),
    [messages, pinnedSet]
  );

  async function attachFiles(files: FileList | File[]) {
    const filtered = Array.from(files).filter((f) => ALLOWED_IMAGE_MIMES.has(f.type));
    if (filtered.length === 0) {
      setAttachmentError("only PNG, JPEG, GIF, WebP, SVG are accepted");
      return;
    }
    try {
      const outs = await Promise.all(filtered.map(fileToOutgoingAttachment));
      setPendingAttachments((prev) => [...prev, ...outs]);
      setAttachmentError(null);
    } catch (e) {
      setAttachmentError(e instanceof Error ? e.message : String(e));
    }
  }

  function removePendingAttachment(idx: number) {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== idx));
  }

  const agentsById = useMemo(() => Object.fromEntries(agents.map((a) => [a.id, a])), [agents]);
  const me = { id: "me", name: "Owner", hueVar: "--accent" };

  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [activeThread, messages.length]);

  const mentionedIds = useMemo(() => {
    const re = /@(\w+)/g;
    const ids = new Set<string>();
    let m;
    while ((m = re.exec(draft)) !== null) {
      const lower = m[1].toLowerCase();
      if (TEAM_TOKENS.has(lower)) {
        agents.forEach((a) => ids.add(a.id));
        continue;
      }
      const a = agents.find((a) => a.name.toLowerCase().startsWith(lower) || a.id === lower);
      if (a) ids.add(a.id);
    }
    return Array.from(ids);
  }, [draft, agents]);

  function onDraftChange(e: ChangeEvent<HTMLTextAreaElement>) {
    const v = e.target.value;
    setDraft(v);
    const cursor = e.target.selectionStart;
    const before = v.slice(0, cursor);
    const m = before.match(/@(\w*)$/);
    if (m) {
      setShowAutocomplete(true);
      setAutocompleteQ(m[1].toLowerCase());
    } else {
      setShowAutocomplete(false);
    }
  }

  function selectMention(agent: Agent) {
    if (!inputRef.current) return;
    const cursor = inputRef.current.selectionStart;
    // "team" is the synthetic Everyone option; insert literal "@team " so the
    // server expands to the full roster on post.
    const insertToken = agent.id === "team" ? "team" : agent.name.split(" ")[0];
    const before = draft.slice(0, cursor).replace(/@\w*$/, `@${insertToken} `);
    const after = draft.slice(cursor);
    setDraft(before + after);
    setShowAutocomplete(false);
    inputRef.current.focus();
  }

  function send() {
    const trimmed = draft.trim();
    if (!trimmed && pendingAttachments.length === 0) return;
    postMessage(activeThread, trimmed, mentionedIds, pendingAttachments);
    setDraft("");
    setPendingAttachments([]);
    setAttachmentError(null);
    setShowAutocomplete(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 260px", height: "100%", minHeight: 0 }}>
      <section style={{ display: "flex", flexDirection: "column", minHeight: 0, borderRight: "1px solid var(--line-1)" }}>
        <ChannelHeader thread={threads.find((t) => t.id === activeThread)} showRouting={showRouting} setShowRouting={setShowRouting} />
        {pinnedMessages.length > 0 && (
          <PinnedBar
            messages={pinnedMessages}
            agentsById={agentsById}
            me={me}
            expanded={pinnedExpanded}
            onToggle={() => setPinnedExpanded((v) => !v)}
            onUnpin={(id) => unpinMessage(activeThread, id)}
          />
        )}
        <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: "12px 0 4px" }}>
          {messages.length === 0 && (
            <div style={{ padding: "40px 24px", color: "var(--fg-3)", fontSize: 12, textAlign: "center" }}>
              No messages yet. Post to broadcast to all agents · @mention a specialist to drop a file in their inbox.
            </div>
          )}
          {messages.map((msg, i) => (
            <MessageRow
              key={msg.id}
              msg={msg}
              author={msg.authorId === "me" ? me : agentsById[msg.authorId]}
              agentsById={agentsById}
              showRouting={showRouting}
              prevAuthor={i > 0 ? messages[i - 1].authorId : null}
              pinned={pinnedSet.has(msg.id)}
              onPin={() => pinMessage(activeThread, msg.id)}
              onUnpin={() => unpinMessage(activeThread, msg.id)}
            />
          ))}
        </div>
        <Composer
          draft={draft}
          onChange={onDraftChange}
          onKeyDown={onKeyDown}
          inputRef={inputRef}
          mentionedIds={mentionedIds}
          agents={agents}
          showAutocomplete={showAutocomplete}
          autocompleteQ={autocompleteQ}
          onSelectMention={selectMention}
          onSend={send}
          onDismissAutocomplete={() => setShowAutocomplete(false)}
          activeThread={activeThread}
          thread={threads.find((t) => t.id === activeThread)}
          pendingAttachments={pendingAttachments}
          onAttachFiles={attachFiles}
          onRemoveAttachment={removePendingAttachment}
          attachmentError={attachmentError}
        />
      </section>
      <ThreadSidebar threads={threads} active={activeThread} onSelect={setActiveThread} agentsById={agentsById} />
    </div>
  );
}

function ChannelHeader({ thread, showRouting, setShowRouting }: { thread?: Thread; showRouting: boolean; setShowRouting: (v: boolean) => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "10px 16px", borderBottom: "1px solid var(--line-1)", gap: 12 }}>
      <span className="display" style={{ fontSize: 16 }}># {thread?.title || "main"}</span>
      <span style={{ fontSize: 11, color: "var(--fg-3)" }}>· broadcast w/ inbox-trigger hook · @mention to file-route</span>
      <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
        <span className="eyebrow">routing</span>
        <button className="btn ghost" style={{ padding: "2px 8px", fontSize: 11 }} onClick={() => setShowRouting(!showRouting)}>
          {showRouting ? "shown" : "hidden"}
        </button>
      </div>
    </div>
  );
}

function MessageRow({ msg, author, agentsById, showRouting, prevAuthor, pinned, onPin, onUnpin }: {
  msg: Message;
  author?: { id: string; name: string; hueVar: string; role?: string };
  agentsById: Record<string, Agent>;
  showRouting: boolean;
  prevAuthor: string | null;
  pinned?: boolean;
  onPin?: () => void;
  onUnpin?: () => void;
}) {
  if (!author) return null;
  const sameAuthor = prevAuthor === msg.authorId;
  const displayTime = displayClockFromMessage(msg);
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: sameAuthor ? "2px 16px 2px" : "8px 16px 2px",
        display: "grid",
        gridTemplateColumns: "26px 1fr auto",
        gap: 10,
        opacity: msg.pending ? 0.65 : 1,
        background: hovered ? "color-mix(in oklab, var(--bg-2) 50%, transparent)" : undefined,
        position: "relative",
      }}
    >
      <div>{!sameAuthor && <AgentAvatar agent={author} size={20} />}</div>
      <div style={{ minWidth: 0 }}>
        {!sameAuthor && (
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 2 }}>
            <span style={{ color: "var(--fg-0)", fontWeight: 500, fontSize: 12.5 }}>{author.name}</span>
            <span className="num" style={{ fontSize: 10, color: "var(--fg-3)", marginLeft: "auto" }}>{displayTime}</span>
            {msg.pending && <span className="chip pending">posting</span>}
          </div>
        )}
        {msg.body && (
          <div style={{ fontSize: 12.5, color: "var(--fg-1)", lineHeight: 1.55, wordBreak: "break-word" }}>
            {renderBody(msg.body, agentsById)}
          </div>
        )}
        {msg.attachments && msg.attachments.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: msg.body ? 6 : 0 }}>
            {msg.attachments.map((a, i) => (
              <a
                key={i}
                href={attachmentSrc(a)}
                target="_blank"
                rel="noreferrer"
                style={{ display: "block", maxWidth: 320, maxHeight: 240, borderRadius: 4, overflow: "hidden", border: "1px solid var(--line-2)", background: "var(--bg-2)" }}
              >
                <img
                  src={attachmentSrc(a)}
                  alt={a.name}
                  style={{ display: "block", maxWidth: 320, maxHeight: 240, objectFit: "contain" }}
                />
              </a>
            ))}
          </div>
        )}
        {(msg.toolCalls?.length || msg.orchestratorRouted?.length) ? (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
            {msg.toolCalls?.map((tc) => (
              <Pill key={tc} kind="tool"><span className="pre">⏵</span>{tc}</Pill>
            ))}
            {showRouting && msg.orchestratorRouted && msg.orchestratorRouted.length > 0 && (
              <span style={{ fontSize: 10, color: "var(--fg-3)", fontFamily: "var(--font-mono)", letterSpacing: 0.02, marginLeft: 4 }}>
                Routed to {msg.orchestratorRouted.map((id) => agentsById[id]?.name).join(", ")}
              </span>
            )}
          </div>
        ) : null}
        {showRouting && msg.routedTo && msg.routedTo.length > 0 && msg.authorId === "me" && (
          <div style={{ marginTop: 4, fontSize: 10, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>
            inbox → {msg.routedTo.map((id) => agentsById[id]?.name || id).join(", ")}
          </div>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "flex-start", paddingTop: 2, opacity: pinned ? 1 : (hovered ? 1 : 0), transition: "opacity 80ms ease" }}>
        {(onPin || onUnpin) && (
          <button
            onClick={() => (pinned ? onUnpin && onUnpin() : onPin && onPin())}
            title={pinned ? "Unpin this message" : "Pin this message"}
            aria-label={pinned ? "Unpin" : "Pin"}
            style={{
              border: "1px solid var(--line-2)",
              background: pinned ? "color-mix(in oklab, var(--accent) 25%, var(--bg-2))" : "var(--bg-2)",
              color: pinned ? "var(--accent)" : "var(--fg-2)",
              borderRadius: 3,
              fontSize: 10,
              padding: "1px 6px",
              cursor: "pointer",
              fontFamily: "var(--font-mono)",
              letterSpacing: 0.04,
            }}
          >
            {pinned ? "★ pinned" : "☆ pin"}
          </button>
        )}
      </div>
    </div>
  );
}

function PinnedBar({ messages, agentsById, me, expanded, onToggle, onUnpin }: {
  messages: Message[];
  agentsById: Record<string, Agent>;
  me: { id: string; name: string; hueVar: string };
  expanded: boolean;
  onToggle: () => void;
  onUnpin: (id: string) => void;
}) {
  const count = messages.length;
  return (
    <div style={{
      borderBottom: "1px solid var(--line-1)",
      background: "color-mix(in oklab, var(--accent) 6%, var(--bg-1))",
      flexShrink: 0,
    }}>
      <button
        onClick={onToggle}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 16px",
          background: "transparent",
          border: "none",
          color: "var(--fg-1)",
          fontSize: 11.5,
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span style={{ color: "var(--accent)" }}>★</span>
        <span style={{ fontFamily: "var(--font-mono)", letterSpacing: 0.04 }}>
          {count} pinned message{count === 1 ? "" : "s"}
        </span>
        <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--fg-3)" }}>{expanded ? "hide" : "show"}</span>
      </button>
      {expanded && (
        <div style={{ borderTop: "1px solid var(--line-1)", padding: "6px 16px 8px", maxHeight: 240, overflowY: "auto" }}>
          {messages.map((m) => {
            const author = m.authorId === "me" ? me : agentsById[m.authorId];
            if (!author) return null;
            const preview = m.body.length > 200 ? m.body.slice(0, 200) + "…" : m.body;
            const displayTime = displayClockFromMessage(m);
            return (
              <div key={m.id} style={{ display: "grid", gridTemplateColumns: "20px 1fr auto", gap: 8, alignItems: "baseline", padding: "4px 0" }}>
                <AgentAvatar agent={author} size={16} />
                <div style={{ minWidth: 0, fontSize: 11.5 }}>
                  <span style={{ color: "var(--fg-0)", fontWeight: 500 }}>{author.name}</span>
                  <span style={{ marginLeft: 6, fontSize: 10, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>{displayTime}</span>
                  <div style={{ color: "var(--fg-1)", lineHeight: 1.4, marginTop: 1 }}>{preview}</div>
                </div>
                <button
                  onClick={() => onUnpin(m.id)}
                  title="Unpin"
                  style={{
                    border: "1px solid var(--line-2)",
                    background: "var(--bg-2)",
                    color: "var(--fg-3)",
                    borderRadius: 3,
                    fontSize: 9.5,
                    padding: "1px 6px",
                    cursor: "pointer",
                    fontFamily: "var(--font-mono)",
                  }}
                >unpin</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function renderInline(text: string, agentsById: Record<string, Agent>, keyPrefix: string) {
  const parts = text.split(/(@\w+)/g);
  return parts.map((p, i) => {
    if (p.startsWith("@")) {
      const lower = p.slice(1).toLowerCase();
      if (TEAM_TOKENS.has(lower)) {
        return (
          <span
            key={`${keyPrefix}-${i}`}
            className="chip mention"
            style={{ margin: "0 2px", background: "color-mix(in oklab, var(--accent) 25%, var(--bg-2))", color: "var(--accent)", borderColor: "color-mix(in oklab, var(--accent) 40%, var(--line-2))" }}
            title="all agents"
          >
            @everyone
          </span>
        );
      }
      const a = Object.values(agentsById).find((a) => a.name.toLowerCase().startsWith(lower) || a.id === lower);
      if (a) return <span key={`${keyPrefix}-${i}`} className="chip mention" style={{ margin: "0 2px" }}>@{a.name.split(" ")[0]}</span>;
    }
    return <span key={`${keyPrefix}-${i}`}>{p}</span>;
  });
}

function renderBody(body: string, agentsById: Record<string, Agent>) {
  // Split on newlines so bullets render as bullets and paragraphs break.
  // A line starting with "- ", "* ", or "• " is a list item; consecutive
  // bullet lines render together inside a <ul>. Everything else is a
  // line-broken paragraph.
  const lines = body.split(/\r?\n/);
  const blocks: React.ReactNode[] = [];
  let bulletGroup: { text: string; idx: number }[] = [];

  function flushBullets() {
    if (bulletGroup.length === 0) return;
    blocks.push(
      <ul key={`ul-${bulletGroup[0].idx}`} style={{ margin: "4px 0 4px 0", paddingLeft: 18, listStyle: "disc" }}>
        {bulletGroup.map((b) => (
          <li key={`li-${b.idx}`} style={{ marginBottom: 2 }}>
            {renderInline(b.text, agentsById, `li-${b.idx}`)}
          </li>
        ))}
      </ul>
    );
    bulletGroup = [];
  }

  lines.forEach((rawLine, idx) => {
    const line = rawLine;
    const m = line.match(/^\s*[-*•]\s+(.*)$/);
    if (m) {
      bulletGroup.push({ text: m[1], idx });
      return;
    }
    flushBullets();
    if (line.trim() === "") {
      blocks.push(<div key={`br-${idx}`} style={{ height: 6 }} />);
    } else {
      blocks.push(<div key={`ln-${idx}`}>{renderInline(line, agentsById, `ln-${idx}`)}</div>);
    }
  });
  flushBullets();

  return <>{blocks}</>;
}

function Composer({ draft, onChange, onKeyDown, inputRef, mentionedIds, agents, showAutocomplete, autocompleteQ, onSelectMention, onSend, onDismissAutocomplete, activeThread, thread, pendingAttachments, onAttachFiles, onRemoveAttachment, attachmentError }: {
  draft: string;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  inputRef: React.MutableRefObject<HTMLTextAreaElement | null>;
  mentionedIds: string[];
  agents: Agent[];
  showAutocomplete: boolean;
  autocompleteQ: string;
  onSelectMention: (a: Agent) => void;
  onSend: () => void;
  onDismissAutocomplete: () => void;
  activeThread: string;
  thread?: Thread;
  pendingAttachments: OutgoingAttachment[];
  onAttachFiles: (files: FileList | File[]) => void;
  onRemoveAttachment: (idx: number) => void;
  attachmentError: string | null;
}) {
  // Synthetic "Everyone" entry for @team mentions. Server expands "team",
  // "everyone", or "all" to the full roster. We surface it as the first
  // dropdown option when the query is empty or matches one of the team words.
  const teamOption: Agent = {
    id: "team",
    name: "Everyone",
    role: `all ${agents.length} agents`,
    hueVar: "--accent",
    status: "idle",
    contextWindowSize: 0,
    currentTokens: 0,
    currentContextTokens: 0,
    currentContextPct: 0,
    currentTools: 0,
    sessionId: null,
    lastActiveAt: null,
    inboxCount: 0,
    latestSessionFile: null,
    model: null,
  };
  const teamMatches = (q: string) =>
    q === "" || "team".startsWith(q) || "everyone".startsWith(q) || "all".startsWith(q);

  const baseMatches = autocompleteQ === ""
    ? agents
    : agents
        .filter((a) => a.name.toLowerCase().startsWith(autocompleteQ) || a.id.startsWith(autocompleteQ))
        .slice(0, 8);
  const matches = teamMatches(autocompleteQ) ? [teamOption, ...baseMatches] : baseMatches;
  const agentsById = Object.fromEntries(agents.map((a) => [a.id, a]));
  const isPrivateThread = activeThread !== "main";
  const threadAgents = (thread?.agents || []).map((id) => agentsById[id]).filter(Boolean);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);

  // Reset highlight whenever the matches list changes (new query, new agents).
  useEffect(() => { setHighlightIdx(0); }, [autocompleteQ, matches.length]);

  // Keydown wrapper: when autocomplete is open, ArrowUp/Down move highlight,
  // Enter / Tab commit the highlighted match (NOT send), Escape dismisses.
  // When closed, delegate Enter (= send) to the parent handler.
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (showAutocomplete && matches.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightIdx((i) => (i + 1) % matches.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIdx((i) => (i - 1 + matches.length) % matches.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const pick = matches[Math.min(highlightIdx, matches.length - 1)];
        if (pick) onSelectMention(pick);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        onDismissAutocomplete();
        return;
      }
    }
    onKeyDown(e);
  }

  function onPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (let i = 0; i < items.length; i += 1) {
      const it = items[i];
      if (it.kind === "file") {
        const f = it.getAsFile();
        if (f) files.push(f);
      }
    }
    if (files.length > 0) {
      e.preventDefault();
      onAttachFiles(files);
    }
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer?.files?.length) onAttachFiles(e.dataTransfer.files);
  }

  return (
    <div
      style={{ borderTop: "1px solid var(--line-1)", padding: "10px 16px 12px", position: "relative", background: dragActive ? "var(--bg-2)" : undefined, transition: "background 80ms ease" }}
      onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
      onDragLeave={() => setDragActive(false)}
      onDrop={onDrop}
    >
      {pendingAttachments.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
          {pendingAttachments.map((a, i) => (
            <div
              key={i}
              style={{
                position: "relative",
                width: 56, height: 56,
                borderRadius: 4,
                overflow: "hidden",
                border: "1px solid var(--line-2)",
                background: "var(--bg-2)",
              }}
            >
              <img src={a.previewUrl} alt={a.name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              <button
                onClick={() => onRemoveAttachment(i)}
                title="remove"
                aria-label={`remove ${a.name}`}
                style={{
                  position: "absolute", top: 2, right: 2,
                  width: 16, height: 16, lineHeight: "14px",
                  borderRadius: "50%", border: "none",
                  background: "rgba(14,12,10,0.85)", color: "#fff",
                  fontSize: 11, cursor: "pointer", padding: 0,
                }}
              >×</button>
            </div>
          ))}
        </div>
      )}
      {attachmentError && (
        <div style={{ fontSize: 10.5, color: "var(--st-blocked)", marginBottom: 6, fontFamily: "var(--font-mono)" }}>
          {attachmentError}
        </div>
      )}
      {showAutocomplete && matches.length > 0 && (
        <div style={{ position: "absolute", bottom: "calc(100% - 1px)", left: 16, right: 16, background: "var(--bg-2)", border: "1px solid var(--line-2)", borderRadius: 4, boxShadow: "var(--shadow-2)", padding: 4, zIndex: 10, maxHeight: 240, overflowY: "auto" }}>
          {matches.map((a, i) => {
            const isHighlighted = i === Math.min(highlightIdx, matches.length - 1);
            return (
              <div
                key={a.id}
                onMouseDown={(e) => { e.preventDefault(); onSelectMention(a); }}
                onMouseEnter={() => setHighlightIdx(i)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 8px",
                  borderRadius: 3,
                  cursor: "pointer",
                  background: isHighlighted ? "var(--bg-3)" : "transparent",
                }}
              >
                <AgentAvatar agent={a} size={18} />
                <span style={{ fontSize: 12, color: isHighlighted ? "var(--fg-0)" : "var(--fg-1)" }}>{a.name}</span>
                <span style={{ fontSize: 10, color: "var(--fg-3)", marginLeft: "auto" }}>{a.role.split(" · ")[0] || a.role}</span>
              </div>
            );
          })}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <PresenceRow agents={agents} />
        <textarea
          ref={inputRef}
          value={draft}
          onChange={onChange}
          onKeyDown={handleKeyDown}
          onPaste={onPaste}
          rows={2}
          placeholder={isPrivateThread ? `Message ${thread?.title || "this thread"}. Paste, drop, or pick a screenshot to attach.` : "Speak to the room. @mention to drop a file in a specialist's inbox. Paste, drop, or pick a screenshot to attach."}
          className="input"
          style={{ fontFamily: "var(--font-sans)", fontSize: 12.5, lineHeight: 1.5, resize: "none", background: "var(--bg-2)" }}
        />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
          multiple
          style={{ display: "none" }}
          onChange={(e) => { if (e.target.files) onAttachFiles(e.target.files); e.target.value = ""; }}
        />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 10.5, color: "var(--fg-3)" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button
              className="btn ghost"
              title="Attach image (or paste/drop into composer)"
              onClick={() => fileInputRef.current?.click()}
              style={{ fontSize: 11, padding: "2px 8px" }}
            >
              + image
            </button>
            <span style={{ fontFamily: "var(--font-mono)", letterSpacing: 0.04 }}>
              {mentionedIds.length === 0
                ? dragActive ? "drop to attach" : isPrivateThread
                  ? `private thread -> ${threadAgents.map((a) => a.name).join(", ") || "thread agents"}`
                  : "broadcast · all agents read on next boot"
                : `inbox → ${mentionedIds.map((id) => agentsById[id].name).join(", ")}`}
            </span>
            {mentionedIds.length > 0 && <span className="chip mention">scoped</span>}
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              className="btn primary"
              style={{ fontSize: 11 }}
              onClick={onSend}
              disabled={!draft.trim() && pendingAttachments.length === 0}
            >
              send
            </button>
            <span className="kbd">↵</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PresenceRow({ agents }: { agents: Agent[] }) {
  const now = Date.now();
  const ONLINE_MS = 5 * 60 * 1000;
  const presence = agents.map((a) => {
    const ageMs = a.lastActiveAt ? now - new Date(a.lastActiveAt).getTime() : Infinity;
    const online = ageMs < ONLINE_MS;
    return { agent: a, online, ageMs };
  });
  const onlineCount = presence.filter((p) => p.online).length;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "4px 0 2px",
        fontSize: 10.5,
        color: "var(--fg-3)",
        fontFamily: "var(--font-mono)",
      }}
    >
      <span style={{ letterSpacing: 0.04 }}>
        {onlineCount === 0 ? "no agents online" : `${onlineCount} online`}
      </span>
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        {presence.map(({ agent, online, ageMs }) => {
          const label = online
            ? `${agent.name} · active`
            : agent.lastActiveAt
              ? `${agent.name} · idle ${formatAge(ageMs)}`
              : `${agent.name} · never seen`;
          return (
            <span
              key={agent.id}
              title={label}
              aria-label={label}
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: online ? `var(${agent.hueVar})` : "var(--line-2)",
                boxShadow: online ? `0 0 6px var(${agent.hueVar})` : "none",
                opacity: online ? 1 : 0.5,
                transition: "opacity 120ms ease",
              }}
            />
          );
        })}
      </div>
      <span style={{ marginLeft: "auto", opacity: 0.6 }}>online = active &lt; 5min</span>
    </div>
  );
}

function formatAge(ms: number): string {
  if (!Number.isFinite(ms)) return "never";
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  return `${Math.floor(hr / 24)}d`;
}

function ThreadSidebar({ threads, active, onSelect, agentsById }: {
  threads: Thread[];
  active: string;
  onSelect: (id: string) => void;
  agentsById: Record<string, Agent>;
}) {
  const list = threads.length > 0 ? threads : [{ id: "main", title: "Main", count: 0, active: true } as Thread];
  return (
    <aside style={{ display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg-1)" }}>
      <div style={{ padding: "10px 14px 8px", borderBottom: "1px solid var(--line-1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Eyebrow>threads</Eyebrow>
        <span className="num" style={{ fontSize: 10, color: "var(--fg-3)" }}>{list.length}</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 4 }}>
        {list.map((t) => (
          <div
            key={t.id}
            onClick={() => onSelect(t.id)}
            style={{
              padding: "8px 10px", borderRadius: 3, cursor: "pointer",
              background: active === t.id ? "var(--bg-3)" : "transparent",
              borderLeft: active === t.id ? "2px solid var(--accent)" : "2px solid transparent",
              marginBottom: 2,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontSize: 12, color: "var(--fg-0)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>
              <span className="num" style={{ fontSize: 10, color: "var(--fg-3)" }}>{t.count}</span>
            </div>
            {t.agents && (
              <div style={{ display: "flex", gap: 3, marginTop: 4 }}>
                {t.agents.map((id) => agentsById[id] && <AgentHue key={id} agent={agentsById[id]} height={8} width={3} />)}
                <span style={{ fontSize: 10, color: "var(--fg-3)", marginLeft: 4 }}>
                  {t.agents.map((id) => agentsById[id]?.name).join(", ")}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={{ borderTop: "1px solid var(--line-1)", padding: 10, fontSize: 10, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>
        threads parsed from VaultBus · phase 2.5
      </div>
    </aside>
  );
}
