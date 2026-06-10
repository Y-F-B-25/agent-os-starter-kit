#!/usr/bin/env python3
"""Small public vault lint for Agent OS starter vaults."""

from __future__ import annotations

import argparse
import re
from collections import defaultdict
from pathlib import Path

WIKILINK_RE = re.compile(r"\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]")
MD_LINK_RE = re.compile(r"\[[^\]]+\]\(([^)]+\.md)(?:#[^)]+)?\)")
CODE_PATH_RE = re.compile(r"`([^`\n]+\.md)(?:#[^`]*)?`")

QUIET_PATH_PARTS = {
    "09 — VaultBus/20 — Commands",
    "09 — VaultBus/10 — Status",
    "09 — VaultBus/30 — Escalations",
    "09 — VaultBus/40 — Events",
    "04 — Operations/lint-reports",
}


def rel(path: Path, root: Path) -> str:
    return path.relative_to(root).as_posix()


def is_quiet(path: str) -> bool:
    return any(part in path for part in QUIET_PATH_PARTS)


def index_markdown(root: Path) -> tuple[list[Path], dict[str, list[Path]]]:
    files = sorted(root.rglob("*.md"))
    by_stem: dict[str, list[Path]] = defaultdict(list)
    for file in files:
        by_stem[file.stem].append(file)
    return files, by_stem


def resolve_markdown_link(source: Path, target: str, root: Path) -> Path | None:
    if "://" in target or target.startswith("#"):
        return None
    target_path = (source.parent / target).resolve()
    try:
        target_path.relative_to(root.resolve())
    except ValueError:
        return None
    return target_path


def resolve_code_path(source: Path, target: str, root: Path) -> Path | None:
    if "://" in target or target.startswith("#"):
        return None
    if "[" in target or "]" in target or target.startswith("~"):
        return None

    clean_target = target
    root_name = root.name + "/"
    if clean_target.startswith(root_name):
        clean_target = clean_target[len(root_name) :]

    candidates = [
        source.parent / target,
        root / clean_target,
    ]

    for candidate in candidates:
        candidate = candidate.resolve()
        try:
            candidate.relative_to(root.resolve())
        except ValueError:
            continue
        if candidate.exists():
            return candidate
    return None


def lint(root: Path) -> dict:
    files, by_stem = index_markdown(root)
    inbound: dict[Path, set[Path]] = defaultdict(set)
    broken = []
    ambiguous = []
    wikilinks = 0
    markdown_links = 0
    code_path_links = 0

    for file in files:
        text = file.read_text(encoding="utf-8", errors="ignore")

        for match in WIKILINK_RE.finditer(text):
            wikilinks += 1
            name = match.group(1).strip()
            matches = by_stem.get(Path(name).stem, [])
            if not matches:
                broken.append((file, name))
            elif len(matches) > 1:
                ambiguous.append((file, name, matches))
            else:
                inbound[matches[0]].add(file)

        for match in MD_LINK_RE.finditer(text):
            markdown_links += 1
            target = resolve_markdown_link(file, match.group(1), root)
            if target and target.exists():
                inbound[target].add(file)
            elif target:
                broken.append((file, match.group(1)))

        for match in CODE_PATH_RE.finditer(text):
            target = resolve_code_path(file, match.group(1), root)
            if target:
                code_path_links += 1
                inbound[target].add(file)

    problem_orphans = []
    quiet_orphans = []
    for file in files:
        path = rel(file, root)
        if file.name == "BRAIN_INDEX.md":
            continue
        if not inbound.get(file):
            if is_quiet(path):
                quiet_orphans.append(file)
            else:
                problem_orphans.append(file)

    return {
        "files": files,
        "wikilinks": wikilinks,
        "markdown_links": markdown_links,
        "code_path_links": code_path_links,
        "broken": broken,
        "ambiguous": ambiguous,
        "problem_orphans": problem_orphans,
        "quiet_orphans": quiet_orphans,
    }


def write_report(root: Path, report_dir: Path, result: dict) -> Path:
    report_dir.mkdir(parents=True, exist_ok=True)
    report = report_dir / "latest_lint.md"
    status = "PASS" if not result["broken"] and not result["ambiguous"] and not result["problem_orphans"] else "FAIL"
    lines = [
        "# Agent OS Vault Lint",
        "",
        f"Status: {status}",
        "",
        f"- Files scanned: {len(result['files'])}",
        f"- Wikilinks: {result['wikilinks']}",
        f"- Markdown note links: {result['markdown_links']}",
        f"- Backticked path links: {result['code_path_links']}",
        f"- Broken links: {len(result['broken'])}",
        f"- Ambiguous links: {len(result['ambiguous'])}",
        f"- Problem orphans: {len(result['problem_orphans'])}",
        f"- Accepted quiet orphans: {len(result['quiet_orphans'])}",
        "",
    ]

    if result["broken"]:
        lines += ["## Broken Links", ""]
        for source, target in result["broken"][:100]:
            lines.append(f"- `{rel(source, root)}` -> `{target}`")
        lines.append("")

    if result["ambiguous"]:
        lines += ["## Ambiguous Links", ""]
        for source, target, matches in result["ambiguous"][:100]:
            choices = ", ".join(f"`{rel(match, root)}`" for match in matches)
            lines.append(f"- `{rel(source, root)}` -> `{target}` matches {choices}")
        lines.append("")

    if result["problem_orphans"]:
        lines += ["## Problem Orphans", ""]
        for file in result["problem_orphans"][:150]:
            lines.append(f"- `{rel(file, root)}`")
        lines.append("")

    report.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return report


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--vault", default="vault")
    parser.add_argument("--report-dir", default="vault/04 — Operations/lint-reports")
    args = parser.parse_args()

    root = Path(args.vault).resolve()
    report_dir = Path(args.report_dir).resolve()
    if not root.exists():
        raise SystemExit(f"Vault not found: {root}")
    if not root.is_dir():
        raise SystemExit(f"Vault path is not a directory: {root}")
    result = lint(root)
    if not result["files"]:
        raise SystemExit(f"Vault contains no markdown files: {root}")
    report = write_report(root, report_dir, result)
    print(
        f"[vault_lint] {len(result['files'])} files, "
        f"{len(result['broken'])} broken, "
        f"{len(result['ambiguous'])} ambiguous, "
        f"{len(result['problem_orphans'])} problem orphans. "
        f"Report: {report}"
    )
    return 1 if result["broken"] or result["ambiguous"] or result["problem_orphans"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
