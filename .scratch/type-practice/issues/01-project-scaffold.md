Status: ready-for-agent

## Parent

`.scratch/type-practice/PRD.md`

## What to build

Set up the frontend and backend project skeletons so that both can be started with a single command. The frontend serves a blank page in the browser. The backend starts an HTTP server with a health check endpoint. Both have test runners configured and passing (a trivial smoke test each).

This slice establishes the build system, dev workflow, and project conventions that all subsequent slices build on.

## Acceptance criteria

- [ ] Frontend project initialized (SPA framework) with a blank home page
- [ ] Backend project initialized with a `GET /api/health` endpoint returning 200
- [ ] A single dev command starts both frontend and backend concurrently
- [ ] Frontend test runner configured with one passing smoke test
- [ ] Backend test runner configured with one passing smoke test
- [ ] Project structure documented in a top-level README (how to start, how to test)

## Blocked by

None - can start immediately
