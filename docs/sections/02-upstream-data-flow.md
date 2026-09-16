# 2. Upstream Data Flow — MPNDW to GSP

The weekly forecast cycle is anchored on **Tuesday**. The PULL Customer Forecast originates in MPNDW on Monday evening and flows into GSP on Tuesday morning inbound files, at which point the Forecast Snapshot for the week is created.

| When (IST) | System | Action |
|------------|--------|--------|
| Monday Evening | MPNDW | PULL Customer Forecast received in MPNDW from upstream planning system. |
| Tuesday Morning | MPNDW → GSP | GSP receives the PULL Customer Forecast sent by MPNDW overnight. |
| Tuesday (IST) | GSP | Create Forecast Snapshot — this becomes the reference forecast for the entire current week's batch processing cycle. |

**Snapshot Scope:** The Tuesday snapshot is used for this week's Friday and Saturday batches, and for next week's Tuesday, Wednesday, and Thursday batches — spanning a full Fri–Thu processing cycle.
