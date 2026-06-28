import { useEffect, useState } from "react";
import { useStore } from "./store";
import { TopBar, AgentRail, TelemetryStrip } from "./components/shell";
import { CommandView } from "./components/command";
import { AgentDetail, MapView, HomeView } from "./components/views";
import { SpecView } from "./components/spec";

type Tab = "home" | "command" | "agent" | "map" | "spec";

export function App() {
  const [tab, setTab] = useState<Tab>("home");
  const [theme, setTheme] = useState<string>(() => localStorage.getItem("agos.theme") || "dark");
  const [selectedAgent, setSelectedAgent] = useState<string>("");
  const [clock, setClock] = useState<string>(formatClock());

  const agents = useStore((s) => s.snapshot.agents);
  const telemetry = useStore((s) => s.snapshot.telemetry);
  const connected = useStore((s) => s.connected);
  const hydrate = useStore((s) => s.hydrate);
  const startStream = useStore((s) => s.startStream);

  useEffect(() => {
    hydrate();
    startStream();
  }, [hydrate, startStream]);

  useEffect(() => {
    const i = setInterval(() => setClock(formatClock()), 1000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("agos.theme", theme);
  }, [theme]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const map: Record<string, Tab> = { "1": "home", "2": "command", "3": "agent", "4": "map", "5": "spec" };
      if (map[e.key]) {
        setTab(map[e.key]);
        e.preventDefault();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function onOpenAgent(id: string) {
    setSelectedAgent(id);
    setTab("agent");
  }

  const selected = agents.find((a) => a.id === selectedAgent) || agents[0];

  return (
    <>
      <div className="grain" />
      <div className="app">
        <TopBar tab={tab} setTab={setTab} theme={theme} setTheme={setTheme} clock={clock} connected={connected} />
        <AgentRail agents={agents} selected={tab === "agent" ? selectedAgent : null} onOpenAgent={onOpenAgent} />
        <main className="main">
          {tab === "home" && <HomeView onOpenAgent={onOpenAgent} onGotoTab={(t) => setTab(t)} />}
          {tab === "command" && <CommandView />}
          {tab === "agent" && selected && <AgentDetail agent={selected} />}
          {tab === "map" && <MapView />}
          {tab === "spec" && <SpecView />}
        </main>
        <TelemetryStrip telemetry={telemetry} connected={connected} />
      </div>
    </>
  );
}

function formatClock(): string {
  return new Date().toTimeString().slice(0, 8);
}
