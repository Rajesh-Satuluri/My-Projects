# 3. Snapshot Decision Logic

Each run begins by downloading the Forecast Snapshot UI from the tenant. The system then evaluates a sequence of conditions to decide whether a snapshot should be taken and, if so, which date label to assign to it.

## 3.1 Entry Point — Is a Day Marked?

The first branch checks whether any day of the week has been explicitly marked in the forecast snapshot UI.

- **YES — A Day is marked:** The system proceeds directly to take a snapshot. No further day-of-week checks are required.
- **NO — No day is marked:** The system falls through to the day-of-week evaluation logic in sections 3.2 and 3.3.

## 3.2 Tuesday Check

When no day is marked, the system first asks whether today is **Tuesday**. Tuesday is the primary weekly snapshot day.

**YES — Today is Tuesday:**
The system checks whether yesterday (Monday) was a public holiday at any Logistics Centre (LC).

- **YES — Yesterday was a holiday:** The system does **NOT** take a snapshot. This prevents a misaligned snapshot caused by the holiday disruption.
- **NO — Yesterday was not a holiday:** The system takes the Tuesday snapshot and writes it to the staging tables.

> **Why skip on a post-holiday Tuesday?**
> If Monday was a holiday, the data pipeline that feeds the forecast may not have run fully, or the customer forecast may not have been fully received in the upstream systems, making the Tuesday snapshot unreliable. The Wednesday fallback (section 3.3) is used instead.

## 3.3 Wednesday Fallback Check

If today is not Tuesday, the system checks whether today is **Wednesday**. Wednesday acts as a fallback snapshot day specifically to recover missed Tuesday snapshots.

**YES — Today is Wednesday:**
The system evaluates a compound condition — Was Monday a holiday **AND** was the Tuesday snapshot **NOT** taken?

- **YES — Both conditions are true:** The system takes a Wednesday snapshot, compensating for the missed Tuesday run.
- **NO — Either condition is false** (Tuesday ran normally, or Monday was not a holiday): No snapshot is taken on Wednesday.

**NO — Today is neither Tuesday nor Wednesday:** No snapshot is taken. The process ends.

## 3.4 Snapshot Outcome Summary

| Day | Condition | Sub-condition | Outcome |
|-----|-----------|---------------|---------|
| Any day | Day is marked | — | Take snapshot |
| Tuesday | No day marked | Monday NOT a holiday | Take Tuesday snapshot |
| Tuesday | No day marked | Monday WAS a holiday | Do NOT take snapshot |
| Wednesday | No day marked | Monday holiday + Tuesday missed | Take Wednesday snapshot |
| Wednesday | No day marked | Tuesday ran normally | No snapshot taken |
| Other days | No day marked | — | No snapshot taken |

> At end of the year, we are receiving a list of holiday dates from CAT, batch planning calendar file and uploading `PlanningCalendarLC` (US and UK) inbound file. Where we have wd and holiday.
