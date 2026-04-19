# Phase 1: Test Infrastructure - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-19
**Phase:** 01-test-infrastructure
**Areas discussed:** Backend test setup, AI service mock strategy, Resume fixtures, App factory pattern

---

## Backend Test Setup

| Option | Description | Selected |
|--------|-------------|----------|
| Jest + mongodb-memory-server | Real in-process Mongo, realistic queries, slower | ✓ |
| Jest + Mongoose mocks | Fast but misses real query issues | |

**User's choice:** Use sensible defaults (selected mongodb-memory-server)
**Notes:** ESM requires `--experimental-vm-modules` flag. App factory refactor needed.

---

## AI Service Mock Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Module-level mock (patch get_model()) | Fast, deterministic 384-dim vectors | ✓ |
| HTTP-level mock (mock Flask responses) | Tests Flask layer but not internals | |

**User's choice:** Use sensible defaults (selected module-level mock)
**Notes:** Real model is ~90MB, too slow for unit tests.

---

## Resume Fixtures

| Option | Description | Selected |
|--------|-------------|----------|
| Synthetic test PDFs/DOCXs | Known content, deterministic, no PII | ✓ |
| Real anonymized samples | More realistic but harder to maintain | |

**User's choice:** Use sensible defaults (selected synthetic fixtures)
**Notes:** Use reportlab for PDF, python-docx for DOCX generation.

---

## App Factory Pattern

| Option | Description | Selected |
|--------|-------------|----------|
| Refactor to createApp() | Minimal change, essential for testability | ✓ |
| Wrap tests around existing structure | No refactor but complex test setup | |

**User's choice:** Use sensible defaults (selected refactor)
**Notes:** Backward-compatible — existing `npm run dev` still works.

---

## Agent's Discretion

- Test directory structure
- pytest configuration approach
- Specific assertion libraries

## Deferred Ideas

None
