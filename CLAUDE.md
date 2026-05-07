# epp-alltura — Claude Code

## Skills
- `/using-superpowers` before any response → find and use available agents/tools correctly
- `/caveman ultra` for compressed output → save tokens across long sessions

## Project
EPP/tools/equipment management: assets, assignments, returns, status, traceability. Monorepo.

## Token discipline
- Targeted search first (`rg`/`find`/glob) — no full repo scans
- Read only needed files; skip dist/build/logs/node_modules
- Phase-based changes; plan before large tasks, wait for approval
- Command output: pipe to `2>&1 | tail -120` or `| grep -iE "error|warn"`
- End-of-phase summary: changed files + decisions + pending only

## MCP policy
Local files → CLI tools → MCP (only when MCP reduces context or improves accuracy).

**Serena**: symbol nav, find defs/refs, project structure, durable decisions. Skip: single-file edits, simple rg-equiv, noisy details. Memory: arch/role/auth/migration decisions + gotchas only.

**Context7**: external lib docs only (React/Vite/Express/Tailwind/Joi, version-specific behavior). Skip: this repo's own code, generic JS/TS, tasks solvable locally.

## Roles & product decisions
- Login: `administrador` (max access), `supervisor` (+ bodega capabilities)
- `trabajador` = domain entity, not login user; no dedicated login flow
- No `bodega` login role; merged into supervisor; preserve historical data

## Architecture
- 3 layers: `controllers` (HTTP only) → `services` (business logic) → `models` (data access)
- Preserve monorepo, existing conventions, middleware, route/validation patterns, UI components
- Role/permission logic: centralized, no cross-file duplication
- No new patterns without justification; no broad rewrites when localized change suffices

## Backend
- Express/Node patterns; reuse existing auth/authz middleware
- All API input: Joi validation before business logic; backend enforcement before frontend checks
- RBAC on every protected route + resource-scope validation
- Every request: `requestId` traceable in middleware + logs; redact `password`/`token`/`authorization`/cookies
- DB changes: explicit, reversible; explain data impact; no prod secrets in code or commits

## Frontend
- React + TypeScript + Vite; reuse layout/guards/services/hooks/components
- All API calls: same-origin `/api/...` — no hardcoded hosts/ports
- Navigation changes: sidebar + route defs + guards + role visibility together
- No UI options for removed roles/features; no duplicate API clients

## Role refactor checklist (auth/roles/permissions tasks)
Inspect: user model, role enum/constants, auth middleware, authz middleware, route guards, sidebar visibility, session handling, seed data, migrations, tests/fixtures, frontend role checks, backend protected routes.

Expected: `administrador` max access · `supervisor` + bodega · `trabajador` entity not login · no bodega login · preserve history.

## Alltura standards
- App Shell: `AppLayout` (every auth screen), `Modal`, `ConfirmationModal`, `ResponsiveTable`, `ResponsiveGrid`, `NotificationBell`, `TourOverlay`
- Contexts: `AuthContext`, `NotificationContext`, `TourContext`
- Tokens: `primary-blue #2A64A4`, `dark-blue #1E2A4A`; no inline hex; Inter typography; reuse `heading-*`/`body-*`/`label-*` classes
- Prioritize: assignment, return, status, location workflows; clear screens, direct actions

## Git discipline
- Minimal file set before editing; no unrelated formatting; no rename/delete without checking refs
- No commits unless instructed; no Co-Authored-By trailers
- After changes report: files changed · verification performed · risks

## Verification order
1. typecheck (if available)
2. targeted tests
3. lint
4. build (only if routing/buildable code affected)
5. manual inspect routes/guards/API contracts when tests missing

If verification cannot run, explain why.