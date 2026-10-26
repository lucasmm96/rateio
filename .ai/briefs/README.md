# .ai/briefs/ — Implementation briefs

Each file is a self-contained spec for one feature or change. The goal is to
do the analysis upfront — reading code, identifying patterns, mapping
dependencies — so the implementation session is "thin": read the brief, execute,
verify. No re-exploration needed.

## Workflow

**Analysis session** (can be a separate conversation):
1. Explore the codebase as needed
2. Write the brief following the template below
3. Set status to `ready`

**Implementation session**:
1. Read the brief
2. Execute the steps in order
3. Run verification
4. Set status to `done`

## File naming

`kebab-case-feature-name.md` — one file per feature/change.

Examples: `add-expense-categories.md`, `export-csv.md`, `dark-mode-toggle.md`

## Template

```markdown
# [Feature name]

> Status: draft | ready | done

## Objective
2–3 sentences: what is being built and why.

## Scope

**Create**: list of new files
**Edit**: list of existing files to change
**Do not touch**: files that should not be modified

## Context
Key patterns, constraints and code snippets from the codebase that the
implementer needs without having to re-explore. Include:
- Relevant existing patterns to follow (with file:line references)
- Types or interfaces the feature uses or extends
- Any non-obvious constraints (RLS, triggers, Decimal, etc.)

## Steps
Ordered, specific implementation tasks. Each step should be independently
verifiable.

1. ...
2. ...

## Constraints
- Things not to do
- Invariants to preserve
- Edge cases to handle

## Verification
How to confirm it worked:
- Command to run (e.g. `npm test`, `npm run build`)
- Manual steps in the browser (golden path + edge cases)
- Expected behavior
```
