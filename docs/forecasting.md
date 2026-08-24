# Project Forecasting

Deterministic forecasting for UA Designs PMS. Forecast numbers come from the forecasting engine. The existing AI assistant explains those numbers; it does not calculate them.

```
Existing PMS
    ↓
Project / Task / Cost / Resource Data
    ↓
Forecasting Service
    ↓
Deterministic Forecast Calculations
    ↓
Forecast Results
    ↓
┌──────────────────────┐
↓                      ↓
Dashboard         Existing AI
                       ↓
               Explanation / Advice
```

## What is DETERMINISTIC vs AI-POWERED

**DETERMINISTIC (this module):** CPI, SPI, EAC, ETC, VAC, forecast duration, forecast completion date, progress velocity, resource shortage/surplus, alerts, what-if results, data-quality flags.

**AI-POWERED (existing assistant only):** explanation, summarization, recommended actions, and answers in chat. The model must call `get_project_forecast` / `run_what_if_forecast` and must not invent CPI/SPI/EAC/ETC/VAC or forecast dates.

## Data flow

1. Load live project, task, budget, expense, cost, labor, team, and allocation records.
2. Assess data quality. Missing or invalid fields are reported; they are never fabricated.
3. Calculate cost, schedule, progress, and resource forecasts.
4. Derive alerts from those metrics and configurable thresholds.
5. Optionally persist a `forecast_snapshots` row for history/trend.
6. Dashboard APIs and the AI tool layer consume the same engine output.

## Formulas

Cost (Earned Value, when data exists):

- BAC = current approved/planned budget record, else `projects.budget`
- PV = BAC × planned % complete (elapsed time / planned duration)
- EV = BAC × weighted actual % complete (task `plannedCost`, else `duration`, else equal weight)
- AC = sum of `APPROVED`/`PAID` expenses (negative amounts excluded)
- CV = EV − AC
- CPI = EV / AC (null if AC = 0; never Infinity/NaN)
- EAC = BAC / CPI
- ETC = EAC − AC
- VAC = BAC − EAC

Cost fallback if CPI cannot be computed: `EAC = AC / actualProgress` when progress > 0; if AC = 0, `EAC = BAC`.

Schedule:

- SPI = EV / PV (fallback: actualProgress / plannedProgress)
- Forecast duration = planned duration / SPI
- Forecast completion = project start + forecast duration, using the same UTC day helper as the scheduler
- Delay days = forecast completion − baseline end date

Progress:

- Rebuild history from project start (0%), completed-task dates, saved snapshots, and current progress
- Fit a linear trend (least squares) and optional moving-average velocity
- Do not treat current % complete as the future forecast

Resource:

- Remaining hours = remaining task duration × assigned labor quantity × `FORECAST_HOURS_PER_DAY` (default 8)
- Available hours = team `hoursPerWeek` × remaining weeks, else crew count × remaining days × hours/day
- Shortage = max(0, required − available)
- If assignments and remaining durations are missing: `INSUFFICIENT_DATA`

## Status thresholds (configurable)

| Metric | ON_TRACK | AT_RISK | Critical |
| --- | --- | --- | --- |
| CPI | ≥ `FORECAST_CPI_ON_TRACK` (1.0) | ≥ `FORECAST_CPI_AT_RISK` (0.90) | `< 0.90` → `OVER_BUDGET` |
| SPI | ≥ 1.0 | ≥ 0.90 | `< 0.90` → `DELAYED` |

Environment overrides: `FORECAST_CPI_ON_TRACK`, `FORECAST_CPI_AT_RISK`, `FORECAST_SPI_ON_TRACK`, `FORECAST_SPI_AT_RISK`, `FORECAST_PROGRESS_BEHIND_PCT`, `FORECAST_DELAY_AT_RISK_DAYS`, `FORECAST_DELAY_HIGH_DAYS`, `FORECAST_HOURS_PER_DAY`, `FORECAST_WORK_DAYS_PER_WEEK`.

## Alerts

Generated only from engine metrics: `COST_OVERRUN`, `LOW_CPI`, `SCHEDULE_DELAY`, `LOW_SPI`, `PROGRESS_BEHIND_PLAN`, `RESOURCE_SHORTAGE`. Each includes type, severity, title, message, metric, value, threshold, and recommended action.

## API endpoints

All project endpoints require JWT auth. Generate/scenario require `ENGINEER_AND_ABOVE`. Users can only operate on projects that exist (same access rule as the rest of the API).

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/forecast/health` | Service health |
| GET | `/api/forecast/projects/:projectId` | Full forecast |
| GET | `/api/forecast/projects/:projectId/cost` | Cost forecast |
| GET | `/api/forecast/projects/:projectId/schedule` | Schedule forecast |
| GET | `/api/forecast/projects/:projectId/progress` | Progress forecast |
| GET | `/api/forecast/projects/:projectId/resources` | Resource forecast |
| GET | `/api/forecast/projects/:projectId/alerts` | Deterministic alerts |
| GET | `/api/forecast/projects/:projectId/history` | Saved snapshots |
| POST | `/api/forecast/projects/:projectId/generate` | Compute and save snapshot |
| POST | `/api/forecast/projects/:projectId/scenarios` | In-memory what-if |
| GET | `/api/forecast/at-risk` | Active projects with at-risk forecasts |
| GET | `/api/projects/:id/dashboard` | Existing dashboard plus `forecasting` section |

Scenario body: `{ "scenarioType": "ADD_WORKERS"|"DELAY_TASK"|"MATERIAL_COST_INCREASE"|"REDUCE_REMAINING_DURATION", ... }`. Results are labeled `SCENARIO / WHAT-IF` and do not write project records.

## Database changes

New table `forecast_snapshots` (Sequelize model `ForecastSnapshot`):

- `id`, `projectId`, `generatedBy`, `forecastDate`, `forecastType`
- `baselineValue`, `actualValue`, `forecastValue`, `variance`, `variancePercentage`
- `confidenceLevel`, `methodology`, `status`
- denormalized `costForecastValue`, `scheduleForecastDate`, `progressForecastValue`, `resourceShortageHours`
- `payload` JSON (full engine result)
- timestamps + paranoid delete

Created via `sequelize.sync` on fresh DBs and `ensureForecastTables()` on existing production DBs (same pattern as AI conversation tables). No existing tables were altered.

## AI integration

- System prompt forbids independent CPI/SPI/EAC/ETC/VAC/date math.
- Project context includes a compact engine summary labeled FACT / FORECAST / RECOMMENDATION.
- New tools: `get_project_forecast`, `get_forecast_history`, `get_at_risk_projects`, `run_what_if_forecast`.

## Data requirements

Reliable forecasts need: budget (record or project field), start/end dates, task progress/durations, approved/paid expenses, and labor assignments for resource forecasts. The API returns `dataQuality.missingData` when these are absent.

## Limitations

- There is no historical progress-snapshot table in the existing schema. Progress trends are reconstructed from completed-task dates plus saved forecast snapshots.
- There is no change-order model; remaining cost uses expenses, BOQ actuals, and budgets only.
- Resource hours assume `FORECAST_HOURS_PER_DAY` when tasks do not store labor-hour estimates.
- This repository is the API. The React frontend lives separately; this module adds forecast JSON to the existing project dashboard API and a backend HTML page at `/forecast`.
- Existing `/api/cost/analysis/forecast/:projectId` burn-rate endpoint is unchanged.
