// Snapshot contract — pinned to daemon's GET /api/snapshot output.

export type AgentStatus = "idle" | "working" | "blocked" | "error";

export interface Agent {
  id: string;
  name: string;
  role: string;
  hueVar: string;
  status: AgentStatus;
  contextWindowSize: number;
  currentTokens: number;
  currentContextTokens: number;
  currentContextPct: number;
  currentTools: number;
  sessionId: string | null;
  lastActiveAt: string | null;
  inboxCount: number;
  latestSessionFile: string | null;
  model: string | null;
  attentionCount?: number;
}

export interface HarnessSummary {
  byAgent: Record<string, number>;
  total: number;
  enabled: boolean;
}

export type ProjectStatus = "in-flight" | "blocked" | "planned" | "done";

export interface ProjectKpi {
  label: string;
  value: string;
}

export interface Project {
  id: string;
  ownerAgentId: string;
  title: string;
  status: ProjectStatus;
  lastSyncedAt: string;
  vaultPath: string;
  kpis: ProjectKpi[];
  conflict: boolean;
  blockers: string[];
}

export interface Thread {
  id: string;
  title: string;
  count: number;
  active: boolean;
  agents?: string[];
}

export interface Attachment {
  name: string;
  mime: string;
  size: number;
  url: string;
}

export interface Message {
  id: string;
  channelId: string;
  authorId: string;
  body: string;
  mentions: string[];
  routedTo: string[];
  toolCalls: string[];
  timestamp: string;
  ts?: string;
  orchestratorRouted?: string[];
  pending?: boolean;
  attachments?: Attachment[];
}

export interface AgentSdkAction {
  ts?: string;
  timestamp?: string;
  kind?: string;
  type?: string;
  summary?: string;
  outcome?: string;
  status?: string;
  [key: string]: unknown;
}

export interface AgentSdkState {
  stateDir: string;
  exists: boolean;
  missingFiles: string[];
  currentTask: Record<string, unknown> | null;
  recentActions: AgentSdkAction[];
  pendingApprovals: Record<string, unknown>[];
  pendingApprovalsCount: number;
  contextSummaryPreview: string;
  contextSummaryUpdatedAt: string | null;
  lastUpdatedAt: string | null;
}

export interface Edge {
  from: string;
  to: string;
  source?: "blocker" | "route";
}

export interface Telemetry {
  totalTokens: number;
  totalTools: number;
  blocked: number;
  inFlight: number;
  sessionsLive: number;
  todayTokens: number;
  todayTools: number;
  tokensPerMin: number;
}

export type RoutineKind = "launchd" | "scheduled-task";

export interface Routine {
  id: string;
  kind: RoutineKind;
  label: string;
  schedule: string;
  description: string;
  status: string;
  enabled: boolean;
  pid: number | null;
  lastExitStatus: number | null;
  lastRun: string | null;
  nextRunAt: string | null;
  cronExpression?: string;
  program: string;
  logPath: string | null;
  errPath: string | null;
  plistPath: string | null;
  skillPath: string | null;
}

export interface RoutinesMeta {
  lastFetchedAt: string;
  fetchedBy: string;
}

export interface Snapshot {
  agents: Agent[];
  projects: Project[];
  threads: Thread[];
  messages: Message[];
  edges: Edge[];
  routines?: Routine[];
  routinesMeta?: RoutinesMeta;
  pinnedMessageIds?: Record<string, string[]>;
  harness?: HarnessSummary;
  agentSdk?: AgentSdkState;
  telemetry: Telemetry;
  _meta: {
    phase: number;
    generatedAt: string;
    sessionsScanned: number;
  };
}
