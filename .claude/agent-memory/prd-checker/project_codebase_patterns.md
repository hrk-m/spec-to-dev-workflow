---
name: codebase patterns for prd-checker
description: Recurring implementation patterns discovered while checking get-group and related PRDs
type: project
---

## API error response structure (sample-api)

All error responses use `ResponseError{Message: err.Error()}` from `internal/rest/`. The exact message strings come from domain error values:
- `domain.ErrBadParamInput.Error()` → `"given param is not valid"`
- `domain.ErrNotFound.Error()` → `"your requested item is not found"`
- `domain.ErrInternalServerError.Error()` → `"internal server error"`

**Why:** PRDs specify exact message strings; verifying via domain package is required, not assuming.

**How to apply:** Always grep for `domain.Err*` constants when checking error message correctness.

## Path parameter validation (sample-api)

`parsePathID(s string)` in `internal/rest/params.go` uses `strconv.ParseUint` and rejects `id < 1`, so `id=0` and negative strings are both rejected at the handler layer (400), not the service layer. PRDs that say "Handler" for the `id ≤ 0` error case are correctly implemented this way.

## Handler response type pattern (sample-api)

Handler-specific response structs (e.g., `getGroupResponse`, `subgroupSummary`) live in the handler file itself (`internal/rest/group.go`), not in the domain package. This is by design to avoid polluting domain models with presentation concerns.

## FE model/state file conventions (sample-front)

- `model/group-detail.ts` — pure type definitions (no React hooks)
- `model/group-detail-state.ts` — React hooks that wrap API calls and expose state
- `api/fetch-*.ts` — raw fetch functions, re-export types for convenience
- Tests for UI components live in `ui/__tests__/`

## SubgroupSummary import source (sample-front)

After get-group refactor, `SubgroupSummary` is defined in `model/group-detail.ts`. Previously it was in `api/fetch-subgroups.ts` (now deleted). Any test or component importing from the old path would fail.
