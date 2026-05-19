#!/usr/bin/env python3
"""Small local retrieval starter for Agent OS vaults."""

from __future__ import annotations

import argparse
import json
import math
import re
from collections import Counter
from pathlib import Path

TOKEN_RE = re.compile(r"[a-zA-Z0-9_]{2,}")
SECRET_VALUE_RE = (
    re.compile(r"sk-[A-Za-z0-9_-]{12,}"),
    re.compile(r"ghp_[A-Za-z0-9]{12,}"),
    re.compile(r"github_pat_[A-Za-z0-9_]{12,}"),
    re.compile(r"xox[baprs]-[A-Za-z0-9-]{12,}"),
    re.compile(r"AKIA[0-9A-Z]{16}"),
)
SENSITIVE_TOKEN_RE = re.compile(r"^(sk|ghp|github_pat|xox[baprs]|akia)[a-z0-9_]{8,}$", re.IGNORECASE)

DEFAULT_EXCLUDES = (
    ".git",
    "node_modules",
    "__pycache__",
    ".agent-os-retrieval",
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


def tokenize(text: str) -> Counter[str]:
    return Counter(
        token.lower()
        for token in TOKEN_RE.findall(text)
        if not should_skip_token(token)
    )


def should_skip_document(text: str) -> bool:
    return any(pattern.search(text) for pattern in SECRET_VALUE_RE)


def should_skip_token(token: str) -> bool:
    if SENSITIVE_TOKEN_RE.match(token):
        return True
    if len(token) >= 24 and any(char.isdigit() for char in token) and any(char.isalpha() for char in token):
        return True
    return False


def is_excluded(path: Path, vault: Path, extra_excludes: list[str]) -> bool:
    rel = path.relative_to(vault).as_posix()
    excludes = DEFAULT_EXCLUDES + tuple(extra_excludes)
    return any(part in rel for part in excludes)


def title_for(path: Path) -> str:
    try:
        for line in path.read_text(encoding="utf-8", errors="ignore").splitlines():
            stripped = line.strip()
            if stripped.startswith("#"):
                return stripped.lstrip("#").strip() or path.stem
    except OSError:
        pass
    return path.stem


def build_index(vault: Path, index_path: Path, extra_excludes: list[str]) -> dict:
    docs = []
    for path in sorted(vault.rglob("*.md")):
        if not path.is_file() or is_excluded(path, vault, extra_excludes):
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        if should_skip_document(text):
            continue
        terms = tokenize(text)
        if not terms:
            continue
        docs.append(
            {
                "path": path.relative_to(vault).as_posix(),
                "title": title_for(path),
                "terms": dict(terms),
                "length": math.sqrt(sum(count * count for count in terms.values())),
            }
        )

    index = {
        "schema": "agent-os-simple-retrieval-v1",
        "docs_count": len(docs),
        "excludes": list(DEFAULT_EXCLUDES) + extra_excludes,
        "docs": docs,
    }
    index_path.parent.mkdir(parents=True, exist_ok=True)
    index_path.write_text(json.dumps(index, indent=2, sort_keys=True), encoding="utf-8")
    return index


def load_index(vault: Path, index_path: Path, extra_excludes: list[str], force_build: bool) -> dict:
    if force_build or not index_path.exists():
        return build_index(vault, index_path, extra_excludes)
    return json.loads(index_path.read_text(encoding="utf-8"))


def score(query_terms: Counter[str], doc: dict) -> float:
    doc_terms = doc["terms"]
    numerator = sum(query_terms[term] * doc_terms.get(term, 0) for term in query_terms)
    query_length = math.sqrt(sum(count * count for count in query_terms.values()))
    doc_length = doc.get("length") or 1
    if not query_length or not doc_length:
        return 0.0
    return numerator / (query_length * doc_length)


def search(index: dict, query: str, limit: int) -> list[tuple[float, dict]]:
    query_terms = tokenize(query)
    scored = [(score(query_terms, doc), doc) for doc in index["docs"]]
    ordered = sorted(scored, key=lambda item: item[0], reverse=True)
    return [(value, doc) for value, doc in ordered[:limit] if value > 0]


def main() -> int:
    parser = argparse.ArgumentParser(description="Build and query a small local Agent OS retrieval index.")
    parser.add_argument("--vault", default="vault", help="Vault folder to index.")
    parser.add_argument("--index", default=".agent-os-retrieval/index.json", help="Index output path.")
    parser.add_argument("--build", action="store_true", help="Rebuild the index before querying.")
    parser.add_argument("--query", help="Question to search for.")
    parser.add_argument("--max-results", type=int, default=5, help="Number of results to print.")
    parser.add_argument("--exclude", action="append", default=[], help="Additional path substring to exclude.")
    args = parser.parse_args()

    vault = Path(args.vault).resolve()
    index_path = Path(args.index).resolve()
    if not vault.exists():
        raise SystemExit(f"Vault not found: {vault}")

    index = load_index(vault, index_path, args.exclude, args.build)
    print(f"[retrieval] indexed {index['docs_count']} markdown files")
    print(f"[retrieval] index: {index_path}")

    if not args.query:
        return 0

    results = search(index, args.query, args.max_results)
    if not results:
        print("[retrieval] no matches")
        return 0

    for rank, (value, doc) in enumerate(results, start=1):
        print(f"{rank}. {doc['path']} | score={value:.3f} | {doc['title']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
