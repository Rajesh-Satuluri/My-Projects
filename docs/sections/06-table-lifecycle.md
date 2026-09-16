# 6. Table Lifecycle

The three table tiers reflect the progressive promotion of forecast data from raw staging through to the live main tables consumed by reports and processing tasks.

| Table Tier | Populated On | Description |
|------------|-------------|-------------|
| STAGED_PULL | Tue / Wed | Receives the raw snapshot from the incoming data. Holds data until the Friday batch promotes it to Active_PULL. |
| ACTIVE_PULL | Friday / weekly | The canonical Tuesday snapshot after Friday promotion. Used as the source on all subsequent daily processing runs through the week until next Friday. |
| MAIN TABLES | Fri + daily | `In_Fact_DemandForecastHeader` and `In_Fact_DemandForecastDetail`. Rebuilt on every processing day from Active_PULL. These are the tables downstream reporting and processing queries. |

## 6.1 Data Flow Sequence

The full progression across a typical week:

```
STAGED_PULL → (Friday batch) → ACTIVE_PULL → (Friday + daily) → MAIN TABLES
```

The **STAGED_PULL** tables act as a write buffer during the week. They accumulate the Tuesday (or Wednesday fallback) snapshot and are only consumed by the Friday batch — they are never read directly by daily processing jobs.

The **ACTIVE_PULL** tables, once set on Friday, remain stable throughout the week and serve as the single source of truth for all subsequent daily inserts into the main tables.
