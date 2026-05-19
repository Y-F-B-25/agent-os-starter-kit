# Vector Retrieval Starter

Retrieval is optional. Add it after the vault has enough useful material to search.

This repo includes a no-dependency local starter:

```text
operations/retrieval/simple_retrieval.py
```

It builds a small local vector-space index from approved markdown files and answers queries with ranked file paths. It does not call an API, store raw document text, write absolute vault paths into the index, or require a vector database. A user can replace it later with embeddings, a vector database, or a hosted retrieval service.

## Start Simple

Run:

```bash
python3 operations/retrieval/simple_retrieval.py --vault . --index .agent-os-retrieval/root-index.json --build
python3 operations/retrieval/simple_retrieval.py --vault . --index .agent-os-retrieval/root-index.json --query "What is the handoff protocol?"
```

The script writes its local index to `.agent-os-retrieval/index.json`, which should stay out of git.

## Default Exclusions

The starter excludes high-risk and noisy folders by default:

- security notes
- sessions
- handoffs
- all VaultBus folders
- generated logs
- lint reports
- backups
- snapshots
- git and dependency folders

The setup co-pilot should explain exclusions before indexing. If the user wants to index private or client material, stop and ask for explicit approval.

## Retrieval Eval

Use three known questions:

1. What is the handoff protocol?
2. How do I run Vault Lint?
3. How do I choose Cowork, Claude Code, Codex, or blended?

Pass criteria:

- top results point to the right docs
- excluded paths do not appear
- no credential-shaped text is printed
- no absolute vault path is written into the index
- the co-pilot records what was indexed

## When To Upgrade

Upgrade beyond this starter when:

- the vault has hundreds of durable notes
- lexical search is missing obvious answers
- the user needs semantic matching across long project docs
- the user approves a provider, local model, or vector database

Before upgrading, record:

- provider or local model choice
- folders indexed
- folders excluded
- cost or local resource impact
- security notes
