# Schedule Baseline vs Actual Tracking

All task date fields are returned as ISO-8601 timestamps.

## Task response fields

- `startDate`, `endDate`: current planned schedule dates.
- `baselineStartDate`, `baselineEndDate`: immutable baseline snapshot (unless reset endpoint is called).
- `actualStartDate`, `actualEndDate`: execution dates as work progresses/completes.
- `scheduleRevision`: revision counter, incremented when planned schedule dates or baseline reset change.

## Behavior

1. On first task creation, baseline values initialize from `startDate`/`endDate`.
2. `PUT /api/schedule/tasks/:id` does **not** allow baseline mutation by default.
3. `PATCH /api/schedule/tasks/:id` supports partial updates for `actualStartDate`/`actualEndDate` (and aliases).
4. `POST /api/schedule/projects/:projectId/baseline/reset` intentionally resets baseline to current `startDate`/`endDate` for all project tasks.

## Endpoint notes

- `GET /api/schedule/projects/:projectId/tasks` returns baseline and actual fields for each task.
- `GET /api/schedule/projects/:projectId/schedule` includes baseline and actual fields for Gantt usage.
