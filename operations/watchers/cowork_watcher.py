#!/usr/bin/env python3
"""
Agent OS watcher bridge, public starter template.

This watcher is intentionally conservative:
- no command tokens in agent-readable files
- no freeform shell execution
- argv arrays only
- human approval in the terminal before every command
- redacted logs and redacted outbox output

Use this as an optional bridge for Cowork-style environments that cannot run
local commands directly. Claude Code and Codex usually do not need it.
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import time
from datetime import datetime
from pathlib import Path

WATCHER_DIR = Path(__file__).resolve().parent
INBOX = WATCHER_DIR / "_cowork_inbox.json"
OUTBOX = WATCHER_DIR / "_cowork_outbox.json"
LOG_FILE = WATCHER_DIR / "_cowork_watcher.log"
DEFAULT_WORKDIR = WATCHER_DIR
POLL_INTERVAL = 1.0
MAX_OUTPUT_CHARS = 4000

ALLOWED_COMMANDS = {
    "python3",
    "python",
    "git",
    "npm",
    "node",
    "ls",
    "pwd",
    "mkdir",
    "find",
    "open",
}

BLOCKLIST_PATTERNS = [
    r"\brm\b",
    r"\bsudo\b",
    r"\bchmod\b",
    r"\bchown\b",
    r"\bcurl\b.*\|",
    r"\bwget\b.*\|",
    r"\beval\b",
    r"\bexec\b",
    r"mkfs",
    r"\bdd\b",
]

SECRET_PATTERNS = [
    re.compile(r"sk-[A-Za-z0-9_-]{12,}"),
    re.compile(r"ghp_[A-Za-z0-9]{12,}"),
    re.compile(r"github_pat_[A-Za-z0-9_]{12,}"),
    re.compile(r"xox[baprs]-[A-Za-z0-9-]{12,}"),
    re.compile(r"AKIA[0-9A-Z]{16}"),
    re.compile(r"(?i)(token|secret|api[_-]?key|password)\s*[:=]\s*\S+"),
]

MIN_COMMAND_INTERVAL = 2.0


def redact(text: str) -> str:
    """Remove obvious secret-shaped strings before logging or writing outbox."""
    redacted = text or ""
    for pattern in SECRET_PATTERNS:
        redacted = pattern.sub("[REDACTED]", redacted)
    return redacted


def contains_secret(text: str) -> bool:
    """Return true if text contains an obvious secret-shaped value."""
    return any(pattern.search(text or "") for pattern in SECRET_PATTERNS)


def log(message: str, level: str = "INFO") -> None:
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{timestamp}] [{level}] {redact(message)}"
    print(line)
    try:
        with LOG_FILE.open("a", encoding="utf-8") as handle:
            handle.write(line + "\n")
    except OSError:
        pass


def get_file_mtime(path: Path) -> float | None:
    try:
        return path.stat().st_mtime
    except OSError:
        return None


def load_inbox() -> dict:
    with INBOX.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def normalize_argv(inbox: dict) -> tuple[list[str] | None, str | None]:
    argv = inbox.get("argv")
    if not isinstance(argv, list) or not argv:
        return None, "Command must be provided as a non-empty argv array."
    if not all(isinstance(part, str) and part for part in argv):
        return None, "Every argv item must be a non-empty string."
    if "command" in inbox:
        return None, "Freeform shell command strings are not accepted. Use argv."
    if any(contains_secret(part) for part in argv):
        return None, "argv contains a secret-shaped value. Refusing to persist or execute it."
    return argv, None


def check_command(argv: list[str]) -> tuple[bool, str]:
    base = os.path.basename(argv[0])
    if base not in ALLOWED_COMMANDS:
        return False, f"Command '{base}' is not in the public starter allowlist."

    joined = " ".join(argv)
    for pattern in BLOCKLIST_PATTERNS:
        if re.search(pattern, joined):
            return False, f"Command matches blocked pattern: {pattern}"
    return True, "OK"


def ask_for_approval(argv: list[str], workdir: Path, reason: str) -> bool:
    print()
    print("Agent OS watcher approval required")
    print(f"Reason: {reason or 'No reason provided'}")
    print(f"Directory: {workdir}")
    print(f"Command: {' '.join(argv)}")
    answer = input("Run this command? Type yes to approve: ").strip().lower()
    return answer == "yes"


def execute(argv: list[str], workdir: Path, timeout: int) -> dict:
    start = time.time()
    try:
        result = subprocess.run(
            argv,
            cwd=str(workdir),
            capture_output=True,
            text=True,
            timeout=timeout,
            shell=False,
        )
        duration = round(time.time() - start, 2)
        return {
            "status": "completed",
            "exit_code": result.returncode,
            "stdout": redact(result.stdout[-MAX_OUTPUT_CHARS:]),
            "stderr": redact(result.stderr[-MAX_OUTPUT_CHARS:]),
            "duration": duration,
            "workdir": str(workdir),
        }
    except subprocess.TimeoutExpired:
        return {
            "status": "timeout",
            "exit_code": -1,
            "stdout": "",
            "stderr": f"Timed out after {timeout}s",
            "duration": timeout,
            "workdir": str(workdir),
        }
    except Exception as exc:
        return {
            "status": "error",
            "exit_code": -1,
            "stdout": "",
            "stderr": redact(str(exc)),
            "duration": 0,
            "workdir": str(workdir),
        }


def write_outbox(payload: dict) -> None:
    with OUTBOX.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2)


def reject(cmd_id: str, reason: str) -> None:
    write_outbox(
        {
            "id": cmd_id,
            "status": "rejected",
            "exit_code": -1,
            "stdout": "",
            "stderr": f"SECURITY: {redact(reason)}",
            "duration": 0,
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S"),
        }
    )
    log(f"Rejected {cmd_id}: {reason}", "WARN")


def main() -> None:
    log("=" * 50)
    log("AGENT OS WATCHER, APPROVAL REQUIRED MODE")
    log("=" * 50)
    log(f"Inbox: {INBOX}")
    log(f"Outbox: {OUTBOX}")
    log(f"Allowed commands: {', '.join(sorted(ALLOWED_COMMANDS))}")
    log("No command tokens are accepted in inbox files.")

    last_mtime = get_file_mtime(INBOX)
    last_exec_time = 0.0

    while True:
        time.sleep(POLL_INTERVAL)
        current_mtime = get_file_mtime(INBOX)
        if current_mtime is None or current_mtime == last_mtime:
            continue

        last_mtime = current_mtime
        try:
            inbox = load_inbox()
        except (json.JSONDecodeError, OSError) as exc:
            log(f"Could not read inbox: {exc}", "ERROR")
            continue

        cmd_id = str(inbox.get("id", "unknown"))
        argv, error = normalize_argv(inbox)
        if error:
            reject(cmd_id, error)
            continue

        assert argv is not None
        ok, reason = check_command(argv)
        if not ok:
            reject(cmd_id, reason)
            continue

        raw_workdir = str(inbox.get("workdir") or DEFAULT_WORKDIR)
        workdir = Path(os.path.expanduser(raw_workdir)).resolve()
        timeout = int(inbox.get("timeout", 120))
        reason = str(inbox.get("reason", ""))

        elapsed = time.time() - last_exec_time
        if elapsed < MIN_COMMAND_INTERVAL:
            time.sleep(MIN_COMMAND_INTERVAL - elapsed)

        if not ask_for_approval(argv, workdir, reason):
            reject(cmd_id, "User did not approve command.")
            continue

        log(f"Executing {cmd_id}: base={os.path.basename(argv[0])} dir={workdir}")
        result = execute(argv, workdir, timeout)
        result["id"] = cmd_id
        result["command_base"] = os.path.basename(argv[0])
        result["timestamp"] = time.strftime("%Y-%m-%dT%H:%M:%S")
        write_outbox(result)
        last_exec_time = time.time()
        log(f"Finished {cmd_id}: exit={result['exit_code']} duration={result['duration']}s")


if __name__ == "__main__":
    main()
