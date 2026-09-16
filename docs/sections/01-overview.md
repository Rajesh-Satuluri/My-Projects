# 1. Overview

This document describes the end-to-end logic that governs when and how Demand Forecast Header and Detail Snapshots are taken from the incoming data, persisted in staging tables, and subsequently promoted into the active tables used by downstream reporting and processing tasks.

Four primary areas are covered:

- **Upstream Data Flow** — how the PULL Customer Forecast moves from MPNDW into GSP each week.
- **Snapshot Decision Logic** — the rules that determine whether a snapshot should be taken on any given day, accounting for day-of-week, LC holidays, and manually marked dates in the Tenant UI.
- **Forecast Snapshot Usage** — the step-by-step data movement on Friday (weekly batch) and on other processing days (Saturday, Tuesday, Wednesday, Thursday).
- **Exception Handling** — how Forecast Wrong Data and Weekly Batch Failure scenarios are managed.

**Staging Tables:**
- `In_Fact_DemandForecastHeader_Staged_PULL`
- `In_Fact_DemandForecastDetail_Staged_PULL`
