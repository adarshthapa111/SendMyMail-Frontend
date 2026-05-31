# tasks/ — per-feature working logs

> 📋 One folder per feature, each with a `change_log.md` that tracks the
> planning → in-progress → done lifecycle of that feature's implementation.
> Newest entries at the top of each log.

## Convention

```
tasks/
└── feature-{kebab-case-name}/
    └── change_log.md
```

Feature names mirror [doc/implementation_doc/feature-*.md](../doc/implementation_doc/) where one exists. For foundational / infra work that isn't in the per-feature impl docs, use a descriptive `feature-{name}` slug (e.g. `feature-frontend-shell`).

## What goes in `change_log.md`

Every log has the same skeleton — adjust as needed:

```markdown
# Feature: {name} — change log

> One-line description of the feature and a link to its impl doc.

## Scope
- What's IN this PR
- What's NOT (defer to a later PR)

## Acceptance criteria
- Bullet list of "done means…"

## Dependencies
- Packages added / removed in this PR

## Changes (newest first)

### YYYY-MM-DD · 📋 Planning — {short title}
What we're about to do and why. Decisions, alternatives considered.

### YYYY-MM-DD · 🚧 In progress — {short title}
What we've shipped so far. Files touched. Deviations from the plan.

### YYYY-MM-DD · ✅ Done — {short title}
Final state. Acceptance criteria met. Any follow-ups noted.
```

## Status legend

| Symbol | Meaning |
|---|---|
| 📋 | Planned — design phase, no code yet |
| 🚧 | In progress — code being written |
| ✅ | Done — merged & deployed |
| ⛔ | Reverted — kept for posterity, links to revert reason |

## Why this folder exists

The per-feature impl docs ([doc/implementation_doc/](../doc/implementation_doc/)) describe **what to build** (spec). The change logs here describe **what's actually been built** (history). They complement each other:

- **Need to know the spec for billing?** → `doc/implementation_doc/feature-billing.md`
- **Need to know what's actually shipped for billing and what's left?** → `tasks/feature-billing/change_log.md`

## Current logs

(Update this section as features get folders.)

- [feature-frontend-shell](./feature-frontend-shell/change_log.md) — foundational React shell (router, Tailwind, tokens, app chrome)
