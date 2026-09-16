# 7. Date-Based Example — Week of 25 Aug 2026

The following example traces exactly which snapshot is used by each batch run across two consecutive weeks, anchored on the 25-Aug snapshot.

## 7.1 Current Week — Snapshot Created Tue 25-Aug-2026

| Day | Date | Demand Batch | Replenishment Batch | Snapshot Used |
|-----|------|-------------|---------------------|---------------|
| Monday | 24-Aug | PULL forecast received in MPNDW | — | — |
| Tuesday | 25-Aug | GSP receives forecast; Snapshot created | — | 25-Aug snapshot created |
| Wednesday | 26-Aug | No batch | No batch | — |
| Thursday | 27-Aug | No batch | No batch | — |
| Friday | 28-Aug | DEMAND Weekly | REPLENISHMENT Daily | 25-Aug snapshot |
| Saturday | 29-Aug | DEMAND Daily | REPLENISHMENT Weekly | 25-Aug snapshot |
| Sunday | 30-Aug | NO BATCH | NO BATCH | — |
| Monday | 31-Aug | NO BATCH | NO BATCH | — |

## 7.2 Next Week — New Snapshot Tue 01-Sep-2026 (for following cycle)

| Day | Date | Demand Batch | Replenishment Batch | Snapshot Used |
|-----|------|-------------|---------------------|---------------|
| Tuesday | 01-Sep | DEMAND Daily | REPLENISHMENT Daily | 25-Aug snapshot (prev week) |
| Wednesday | 02-Sep | DEMAND Daily | REPLENISHMENT Daily | 25-Aug snapshot (prev week) |
| Thursday | 03-Sep | DEMAND Daily | REPLENISHMENT Daily | 25-Aug snapshot (prev week) |
| Friday | 04-Sep | DEMAND Weekly | REPLENISHMENT Daily | 01-Sep snapshot (new) |

- **25-Aug Snapshot** used for: Fri 28-Aug, Sat 29-Aug, Tue 01-Sep, Wed 02-Sep, Thu 03-Sep — a total of **5 batch days** across two calendar weeks.
- **01-Sep Snapshot** will be used for: Fri 04-Sep, Sat 05-Sep, Tue 08-Sep, Wed 09-Sep, Thu 10-Sep — and so on for the following cycle.

## 7.3 How the Snapshot Transitions Week to Week

Each Tuesday snapshot governs exactly **five batch days** spanning two calendar weeks. The table below shows three consecutive snapshot cycles:

| Snapshot | Batch Days Governed (Demand / Replenishment type) |
|----------|--------------------------------------------------|
| Tue 18-Aug Snapshot | Fri 21-Aug (Weekly/Daily) · Sat 22-Aug (Daily/Weekly) · Tue 25-Aug (Daily/Daily) · Wed 26-Aug (Daily/Daily) · Thu 27-Aug (Daily/Daily) |
| Tue 25-Aug Snapshot | Fri 28-Aug (Weekly/Daily) · Sat 29-Aug (Daily/Weekly) · Tue 01-Sep (Daily/Daily) · Wed 02-Sep (Daily/Daily) · Thu 03-Sep (Daily/Daily) |
| Tue 01-Sep Snapshot | Fri 04-Sep (Weekly/Daily) · Sat 05-Sep (Daily/Weekly) · Tue 08-Sep (Daily/Daily) · Wed 09-Sep (Daily/Daily) · Thu 10-Sep (Daily/Daily) · … and so on |
