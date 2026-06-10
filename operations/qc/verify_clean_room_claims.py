#!/usr/bin/env python3
"""Evidence-backed clean-room verifier for Agent OS."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
import tempfile
from html.parser import HTMLParser
from pathlib import Path


REQUIRED_FILES = (
    "README.md",
    "START_HERE.md",
    "GETTING_STARTED.md",
    "docs/DIAGNOSTIC.md",
    "docs/SETUP_PATHS.md",
    "docs/IMPLEMENTATION_QC.md",
    "docs/COWORK_PREREQS.md",
    "docs/PLAYBOOKS.md",
    "docs/SKILLS_PACK.md",
    "docs/LOCAL_DASHBOARD.md",
    "docs/VECTOR_RETRIEVAL.md",
    "docs/EVALS.md",
    "docs/SAVE_UP.md",
    "docs/SECURITY_REVIEW.md",
    "docs/CLAUDE_LANE_EVIDENCE_GATE.md",
    "vault/00 — Home/BRAIN_INDEX.md",
    "vault/README.md",
    "vault/04 — Operations/onboarding-progress.example.json",
    "vault/09 — VaultBus/00 — Protocol/VAULTBUS_PROTOCOL.md",
    "examples/dashboards/setup-progress-dashboard.html",
    "operations/lint/vault_lint.py",
    "operations/retrieval/simple_retrieval.py",
)

EXPECTED_QUESTS = [f"Q{i}" for i in range(9)]
PRIVATE_INDEX_PATH_MARKERS = (
    "01 — Security",
    "05 — Sessions",
    "08 — Handoffs",
    "09 — VaultBus",
    "04 — Operations/lint-reports",
    "Logs",
    "backups",
    "backup",
    "snapshots",
    "snapshot",
)


class Result:
    def __init__(self) -> None:
        self.rows: list[tuple[str, bool, str]] = []

    def add(self, name: str, ok: bool, detail: str) -> None:
        self.rows.append((name, ok, detail))

    @property
    def ok(self) -> bool:
        return all(row[1] for row in self.rows)

    def print(self) -> None:
        for name, ok, detail in self.rows:
            status = "PASS" if ok else "FAIL"
            print(f"[{status}] {name}: {detail}")
        print(f"[SUMMARY] {'GREEN' if self.ok else 'YELLOW'}")


def run(cmd: list[str], cwd: Path) -> tuple[int, str]:
    proc = subprocess.run(
        cmd,
        cwd=cwd,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        check=False,
    )
    return proc.returncode, proc.stdout.strip()


def parse_html(path: Path) -> bool:
    HTMLParser().feed(path.read_text(encoding="utf-8"))
    return True


def load_dashboard_data(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    start_tag = '<script id="progress-data" type="application/json">'
    end_tag = "</script>"
    start = text.find(start_tag)
    if start == -1:
        raise ValueError("progress-data script not found")
    start += len(start_tag)
    end = text.find(end_tag, start)
    if end == -1:
        raise ValueError("progress-data script not closed")
    return json.loads(text[start:end])


def verify(repo: Path) -> Result:
    result = Result()

    for rel in REQUIRED_FILES:
        path = repo / rel
        result.add(f"required file {rel}", path.exists(), "found" if path.exists() else "missing")

    codex_dir = repo / "Codex"
    result.add(
        "root Codex folder",
        not codex_dir.exists() or (codex_dir / "README.md").exists(),
        "absent or documented" if not codex_dir.exists() or (codex_dir / "README.md").exists() else "exists without README",
    )

    progress_path = repo / "vault/04 — Operations/onboarding-progress.example.json"
    try:
        progress = json.loads(progress_path.read_text(encoding="utf-8"))
        quest_ids = [quest.get("id") for quest in progress["syllabus"]["quests"]]
        result.add("progress example JSON", quest_ids == EXPECTED_QUESTS, f"quests={quest_ids}")
    except Exception as exc:
        result.add("progress example JSON", False, str(exc))

    dashboard_path = repo / "examples/dashboards/setup-progress-dashboard.html"
    try:
        parse_html(dashboard_path)
        dashboard = load_dashboard_data(dashboard_path)
        quest_count = len(dashboard["syllabus"]["quests"])
        text = dashboard_path.read_text(encoding="utf-8")
        result.add("dashboard HTML parse", True, "parsed")
        result.add("dashboard quest data", quest_count == 9, f"quests={quest_count}")
        result.add("dashboard safe render", "innerHTML" not in text, "no innerHTML" if "innerHTML" not in text else "innerHTML found")
    except Exception as exc:
        result.add("dashboard checks", False, str(exc))

    code, output = run([sys.executable, "-m", "py_compile", "operations/lint/vault_lint.py", "operations/retrieval/simple_retrieval.py"], repo)
    result.add("python compile", code == 0, output or "ok")

    code, output = run([sys.executable, "operations/lint/vault_lint.py", "--vault", "vault", "--report-dir", "vault/04 — Operations/lint-reports"], repo)
    result.add("vault lint", code == 0 and "0 problem orphans" in output, output)

    with tempfile.TemporaryDirectory(prefix="agent-os-qc-") as tmp:
        index_path = Path(tmp) / "index.json"
        code, output = run(
            [
                sys.executable,
                "operations/retrieval/simple_retrieval.py",
                "--vault",
                ".",
                "--index",
                str(index_path),
                "--build",
                "--query",
                "How do I run Vault Lint?",
                "--max-results",
                "3",
            ],
            repo,
        )
        result.add("retrieval command", code == 0 and "VAULT_LINT.md" in output, output)
        try:
            index = json.loads(index_path.read_text(encoding="utf-8"))
            paths = [doc.get("path", "") for doc in index.get("docs", [])]
            blocked = [path for path in paths if any(marker in path for marker in PRIVATE_INDEX_PATH_MARKERS)]
            result.add("retrieval omits absolute vault path", "vault" not in index, "no vault key" if "vault" not in index else "vault key present")
            result.add("retrieval omits private folders", not blocked, f"blocked_paths={blocked[:5]}")
        except Exception as exc:
            result.add("retrieval index inspection", False, str(exc))

    if (repo / ".git").exists():
        code, output = run(["git", "diff", "--check"], repo)
        result.add("git diff check", code == 0, output or "ok")

    return result


def main() -> int:
    parser = argparse.ArgumentParser(description="Run Agent OS clean-room evidence checks.")
    parser.add_argument("--repo", default=".", help="Repo path to verify.")
    args = parser.parse_args()

    repo = Path(args.repo).resolve()
    if not repo.exists():
        print(f"[FAIL] repo path: not found: {repo}")
        return 1
    if not repo.is_dir():
        print(f"[FAIL] repo path: not a directory: {repo}")
        return 1
    result = verify(repo)
    result.print()
    return 0 if result.ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
