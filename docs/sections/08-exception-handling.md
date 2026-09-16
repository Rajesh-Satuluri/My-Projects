# 8. Exception Handling Scenarios

Two exception scenarios require specific handling: forecast wrong data and weekly batch failure. Both have defined response windows and escalation paths.

## 8.1 Case 1 — Forecast Wrong Data: Validation & Correction Window

The Tuesday forecast snapshot is not considered final at the point of creation. The CAT (Customer Analytics Team) has a **three-day window** — Tuesday through Thursday — to validate the forecast and raise a correction if required. The Friday weekly batch always consumes the **latest approved snapshot**, not necessarily the original Tuesday one.

### End-to-End Timeline

| When (IST) | Owner | Action |
|------------|-------|--------|
| Monday Evening | MPNDW | Customer Forecast received in MPNDW. |
| Tuesday Morning | MPNDW → GSP | Forecast files sent from MPNDW to GSP. |
| Tuesday (IST) | GSP (Auto) | GSP takes the initial Forecast Snapshot (e.g. 25-Aug). This is the default snapshot — not yet final. |
| Tue–Thu (IST) | CAT Team | **VALIDATION WINDOW:** CAT validates the forecast. If an issue is identified, root cause analysis is performed and a corrected forecast is received and processed. |
| Wednesday (IST) | CAT Team | Root cause analysis completed. Corrected forecast received and processed. Correction in progress. |
| Thursday (IST) | CAT Team | CAT validates the corrected forecast and approves it. |
| Wed or Thu (IST) | CAT + Support | CAT informs Support Team to take a new (corrected) snapshot. New snapshot is created (e.g. 27-Aug — Corrected Snapshot). |
| Friday (IST) | GSP (Auto) | Weekly Batch runs using the **LATEST APPROVED SNAPSHOT** — the corrected 27-Aug snapshot, not the original 25-Aug. |

### Worked Example — Week of 24 Aug

| Day | Date | Activity |
|-----|------|----------|
| Monday | 24-Aug | Forecast received in MPNDW. |
| Tuesday | 25-Aug | Files received in GSP. Initial Snapshot taken (25-Aug). Issue identified during CAT validation. |
| Tue–Thu | 25–27 Aug | Issue found. Corrected forecast received and validated by CAT. |
| Thursday | 27-Aug | New corrected snapshot taken (27-Aug). This replaces 25-Aug as the reference snapshot for the week. |
| Friday | 28-Aug | Weekly Batch uses **27-Aug snapshot**. Demand Daily + Replenishment Weekly run. |
| Saturday | 29-Aug | Demand Daily Replenishment Weekly uses 27-Aug snapshot. |
| Sun–Mon | 30–31 Aug | NO BATCH. No processing runs on Sunday or Monday. |
| Tue–Thu | 01–03 Sep | Demand Daily + Replenishment Daily runs each day using **27-Aug snapshot** (previous week's approved snapshot). |

> **Key Takeaway — Case 1:**
> - Tuesday snapshot is the default, not immutable.
> - CAT has Tue–Thu (3 days) to validate and correct.
> - If a correction is needed, a new snapshot can be taken on Wednesday or Thursday.
> - The Friday batch always uses the latest approved snapshot.

---

## 8.2 Case 2 — Weekly Batch Failure: Recovery Window & Impact

When the Friday weekly batch fails, the team has a defined recovery window before outbound files are triggered. Understanding this window and acting quickly is critical to avoiding downstream delays to MPNDW and other dependent teams.

### Normal Friday Schedule (IST)

| Time (IST) | Event | Detail |
|------------|-------|--------|
| 5:00 PM | Weekly Batch | Expected completion of the weekly batch run. |
| 5:00 PM – 8:30 PM | ~3.5 hrs window | **Recovery Window** — time available before Solver Outbound fires. |
| 8:30 PM | Solver Outbound | Solver Outbound runs. If batch is not recovered by this point, solver files may be delayed. |
| 8:30 PM – 11:45 PM | ~3.25 hrs window | **Additional Window** — time available before Demand Outbound fires. |
| 11:45 PM | Demand Outbound | Demand Outbound runs. This is the last outbound. |

**Total Recovery Window:** Approximately **6.75 hours** are available between expected batch completion (5:00 PM) and the last outbound — Demand Outbound at 11:45 PM IST.

### Recovery Process — If Weekly Batch Fails

1. **Batch Fails:** The weekly batch fails and an alert is raised.
2. **Failure Investigated:** Support team and CAT investigate to identify the root cause.
3. **Issue Fixed:** A fix is applied based on root cause findings.
4. **Batch Retriggered / Recovered:** The batch is retriggered and runs again.
5. **Batch Completes Successfully:** The batch finishes and outbounds can proceed.

### Recovery Outcomes

| Scenario | Condition | Impact |
|----------|-----------|--------|
| Recovered Within Window | Batch completes before outbound fires | Outbounds run on time. No downstream impact. |
| Recovered After Window | Batch completes after outbound has already passed | Outbound files are delayed. MPNDW team may need to process files manually. |

### Worst Case Recovery Timeline

Weekly batch expected at 5:00 PM IST fails and investigation begins. Issue proves difficult to isolate, extending the recovery timeline significantly. An additional ~4–5 hours of extra time may be available before the next day's inbound starts triggering a new outbound cycle. If the batch cannot be recovered before next day inbound triggers, outbound files will be delayed and the MPNDW team may need to process these files manually.

> **Overall Principle:** Provide sufficient buffer time to ensure data quality and operational stability while minimising impact to downstream teams. Always prioritise recovery before the Demand Outbound at **11:45 PM IST**.
