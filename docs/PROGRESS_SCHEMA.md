# Onboarding Progress Schema

This is the canonical schema for:

```text
vault/04 — Operations/onboarding-progress.json
```

The setup co-pilot writes this file during setup. It is the source of truth for progress, evals, and resume state.

## Full Schema

```json
{
  "$schema": "agent-os-onboarding-progress-v2",
  "session_id": "uuid",
  "created": "ISO 8601 timestamp",
  "last_updated": "ISO 8601 timestamp",
  "source": "standalone | imported_setup_package",
  "setup_lane": "cowork | claude_code | codex | blended",

  "diagnostic": {
    "profile": "Organizer | Deep Worker | Enterprise Operator | Builder | Team Lead",
    "primary_goal": "string",
    "current_ai_use": ["chat", "ide", "claude_code", "codex", "cowork", "notion", "obsidian", "other"],
    "os": "mac | windows | linux | mixed",
    "preferred_lane": "chat_first | terminal_first | codex_first | blended | unsure",
    "memory_state": {
      "obsidian": "not_installed | fresh | existing_vault",
      "notion": "not_installed | fresh | existing_workspace",
      "project_folder": "none | new | existing"
    },
    "risk_constraints": ["string"],
    "success_test": "string"
  },

  "team": {
    "lead_agent": "string",
    "specialist_agents": ["string"],
    "ownership_notes": "string"
  },

  "syllabus": {
    "estimated_minutes": 90,
    "quests": [
      {
        "id": "Q0",
        "name": "string",
        "description": "string",
        "estimated_minutes": 5,
        "status": "not_started | in_progress | completed | skipped",
        "started_at": "ISO 8601 timestamp or null",
        "completed_at": "ISO 8601 timestamp or null",
        "actual_minutes": 0,
        "difficulty_rating": "1 to 5 or null",
        "check_in": {
          "question": "string",
          "response": "string",
          "note": "string or null"
        },
        "friction": {
          "category": "tool_install | concept_confusion | co_pilot_error | permission_blocker | security_blocker | other | null",
          "note": "string or null",
          "resolved": true
        },
        "retry_count": 0,
        "magic_moment": "string or null"
      }
    ]
  },

  "eval": {
    "quests_completed": 0,
    "quests_total": 0,
    "total_time_minutes": 0,
    "sessions_count": 1,
    "current_session_started": "ISO 8601 timestamp or null",
    "handoff_test": "not_run | passed | failed",
    "vault_lint": "not_run | passed | warnings | failed",
    "security_review": "not_run | green | yellow | red",
    "graduation": {
      "achieved": false,
      "timestamp": "ISO 8601 timestamp or null",
      "success_test_met": "true | false | null",
      "user_sentiment": "string or null",
      "recommend_score": "1 to 10 or null"
    }
  },

  "eval_baseline": {
    "agent_setup": "1 to 5",
    "memory_management": "1 to 5",
    "multi_agent_handoff": "1 to 5",
    "prompt_engineering": "1 to 5",
    "system_design": "1 to 5",
    "local_tooling": "1 to 5"
  }
}
```

## Required Quest IDs

| ID | Name |
|---|---|
| Q0 | Plan and dashboard |
| Q1 | Vault foundation |
| Q2 | Coordination layer |
| Q3 | Dashboard |
| Q4 | Chief of Staff |
| Q5 | Specialist agent |
| Q6 | Handoff loop |
| Q7 | Quality checks |
| Q8 | Optional power tools |

## Status Rules

- Write the file before starting Quest 1.
- Update before each quest starts.
- Update after each quest completes or is skipped.
- Update on friction.
- Update before save-up.
- On resume, read this file before asking the user where things left off.

## Privacy Rules

Do not store:

- credential values
- private client names unless the user explicitly approves
- raw private chat
- raw inbox exports
- sensitive screenshots

Use short summaries for risk constraints.
