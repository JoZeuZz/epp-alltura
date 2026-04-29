# epp-alltura — Claude Code Instructions

## Purpose

This repository contains the Alltura EPP, tools and equipment management application.

The product goal is to manage company assets, EPP, tools, equipment, workers, assignments, returns, status history and traceability.

Optimize for maintainability, clarity, minimal changes and low token usage.

## Token and context discipline

- Do not scan the whole repository unless the task explicitly requires it.
- Start with targeted search using grep, rg, find or file names before reading files.
- Read only the files needed for the current task.
- Avoid opening generated files, build outputs, logs, dependency folders or large dumps.
- Do not paste long command outputs into the response.
- When a command fails, inspect only the relevant error lines.
- Prefer small, phase-based changes over broad rewrites.
- For large tasks, first produce a concise plan and wait for approval unless the user explicitly asks to implement immediately.
- At the end of each phase, summarize only changed files, decisions, verification commands and pending work.

## Repository scope

Work only inside this repository unless explicitly instructed otherwise.

Do not assume access to other Alltura repositories.

If a task mentions behavior from another application, infer the intended pattern from the instruction and from existing code in this repository.

## Current product decisions

- Login users should be limited to:
  - administrador
  - supervisor
- The previous bodega capabilities must be merged into supervisor.
- Trabajador is a domain entity, not an active login user.
- Trabajador may have a profile and relationships with assets, EPP, tools, equipment, assignments and returns.
- Trabajador should not have a dedicated login flow unless explicitly requested.
- Avoid reintroducing bodega as an independent login role.

## Architecture rules

- Preserve the existing monorepo structure.
- Preserve existing backend, frontend, database and deployment conventions unless a task explicitly asks to change them.
- Prefer existing services, middleware, route patterns, validation patterns and UI components.
- Do not introduce new architectural patterns without explaining why they are necessary.
- Do not perform broad rewrites when a localized change is enough.
- Keep domain logic explicit and easy to trace.
- Keep role and permission logic centralized where the existing architecture allows it.
- Avoid duplicating permission checks across unrelated files.

## Backend rules

- Follow the existing Express/Node patterns in this repository.
- Keep validation close to the route/controller pattern already used.
- Reuse existing auth and authorization middleware when possible.
- When changing roles, check backend enforcement points before frontend-only changes.
- Do not rely only on frontend route guards for security.
- Keep database changes explicit and reversible when possible.
- If SQL migrations or seed changes are needed, explain the expected data impact.
- Do not change production credentials, secrets or environment-specific values.
- Do not commit real secrets.

## Frontend rules

- Follow the existing React, TypeScript and Vite patterns.
- Reuse existing layout, guards, services, hooks and UI components.
- Avoid creating duplicate API clients.
- Prefer typed services over scattered fetch calls when the project already provides an API layer.
- Keep screens simple and oriented to operational workflows.
- When modifying navigation, check sidebar, route definitions, guards and role visibility together.
- Do not add UI options for roles or features that no longer exist.

## Role refactor checklist

When a task touches users, roles, auth or permissions, inspect only the relevant files for:

- user model or schema
- role enum or constants
- auth middleware
- authorization middleware
- route guards
- sidebar/menu visibility
- login/session handling
- seed data
- migrations or SQL init files
- tests or fixtures
- frontend role checks
- backend protected routes

Expected target behavior:

- administrador has maximum system access.
- supervisor has supervisor capabilities plus previous bodega capabilities.
- trabajador remains a managed entity, not a login account.
- references to bodega as a login role should be removed or migrated.
- historical data should not be destroyed unless explicitly requested.

## Alltura standards

- Keep the application aligned with the Alltura app style and operational simplicity.
- Prefer clear screens, direct actions and understandable labels.
- Avoid unnecessary complexity for workers or operational users.
- Optimize for traceability of assets and responsibilities.
- Prioritize assignment, return, status and location workflows.

## Git and change discipline

- Before editing, identify the minimal set of files required.
- Do not modify unrelated formatting.
- Do not rename files or components unless necessary.
- Do not delete code without checking references.
- After changes, report:
  - files changed
  - what changed
  - verification performed
  - risks or pending checks
- Do not create commits unless explicitly instructed.

## Verification

Prefer targeted verification first.

Use available project commands only after checking package scripts or existing documentation.

Typical verification order:

1. typecheck relevant frontend/backend code if available
2. run targeted tests if available
3. run lint if available
4. run build only when the change affects buildable code or routing
5. manually inspect affected routes, guards or API contracts when tests are missing

If verification cannot be run, explain exactly why.

## Command output policy

- Keep command output summaries short.
- Include only relevant errors.
- For long outputs, use tail, grep or targeted filtering.
- Do not include full logs unless explicitly requested.

Suggested patterns:

```bash
npm run build 2>&1 | tail -120
npm test 2>&1 | tail -120
npm run lint 2>&1 | tail -120
rg "bodega|supervisor|trabajador|admin|administrador" .