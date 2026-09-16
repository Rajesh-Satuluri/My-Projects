# 5. Using the Forecast Snapshot

Once a snapshot has been captured into the staging tables, it is consumed in two distinct processing patterns: the Friday weekly batch and the standard daily processing run. Both patterns ultimately keep the main Demand Forecast Header and Detail tables in sync with the active Tuesday forecast snapshot (or whenever the snapshot was taken).

## 5.1 Friday — Weekly Batch

The Friday batch is a four-step process that refreshes the Active_PULL tables from the staging tables accumulated during the week.

**Step 1 — Take Backup**
Before any data movement, a full backup is taken of the two main tables to protect against data loss during the batch:
- `In_Fact_DemandForecastHeader`
- `In_Fact_DemandForecastDetail`

**Step 2A — Move Header Snapshot**
The staged header data is promoted into the active pull table:
```
In_Fact_DemandForecastHeader_Staged_PULL → In_Fact_DemandForecastHeader_Active_PULL
```

**Step 2B — Move Detail Snapshot**
In parallel with Step 2A, the staged detail data is promoted into the active pull table:
```
In_Fact_DemandForecastDetail_Staged_PULL → In_Fact_DemandForecastDetail_Active_PULL
```

**Step 3 — Delete Pull Customer Data**
The existing PULL customer data is deleted from the main tables to prepare for the fresh insert:
- Delete from `In_Fact_DemandForecastHeader` where customer type is PULL
- Delete from `In_Fact_DemandForecastDetail` where customer type is PULL

**Step 4 — Insert Active Forecast Data**
The Active_PULL tables (populated in Steps 2A/2B from the Tuesday snapshot) are inserted into the main tables:
```
In_Fact_DemandForecastHeader_Active_PULL → In_Fact_DemandForecastHeader
In_Fact_DemandForecastDetail_Active_PULL → In_Fact_DemandForecastDetail
```

**Result after Friday batch:** The main tables contain the active Tuesday forecast snapshot data, ready for the weekend and the following week's reporting and batch processing.

---

## 5.2 Other Processing Days — Saturday, Tuesday, Wednesday, Thursday

On all days other than Friday, a simplified two-step process keeps the main tables current with the active Tuesday snapshot.

**Step 1 — Take Backup and Delete Pull Customer Data**
Before any data movement, a full backup is taken of the two main tables:
- `In_Fact_DemandForecastHeader`
- `In_Fact_DemandForecastDetail`

Existing PULL customer forecast data is then deleted from the main tables:
- `In_Fact_DemandForecastHeader`
- `In_Fact_DemandForecastDetail`

**Step 2A — Insert Header**
The active header data is inserted directly into the main table:
```
In_Fact_DemandForecastHeader_Active_PULL → In_Fact_DemandForecastHeader
```

**Step 2B — Insert Detail**
The active detail data is inserted directly into the main table:
```
In_Fact_DemandForecastDetail_Active_PULL → In_Fact_DemandForecastDetail
```

**Result after daily processing:** `In_Fact_DemandForecastHeader` and `In_Fact_DemandForecastDetail` contain the active Tuesday forecast snapshot. The Active_PULL tables remain unchanged and continue to hold the canonical Tuesday snapshot for re-use until next Friday, when the active tables will be refreshed.
