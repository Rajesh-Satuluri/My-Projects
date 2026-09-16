# 4. Batch Schedule — To-Be Process (Five Batch Days Only)

Under the To-Be design, batches run on **five days** of the week. Sunday and Monday are rest days with no batch activity. Each batch day runs a specific combination of Demand and Replenishment batch types, and references either the current or the previous week's forecast snapshot.

| Day | Demand Batch | Replenishment Batch | Forecast Used |
|-----|-------------|---------------------|---------------|
| Friday | Weekly | Daily | Current week's forecast snapshot |
| Saturday | Daily | Weekly | Current week's forecast snapshot |
| Sunday | No Batch | No Batch | — |
| Monday | No Batch | No Batch | — |
| Tuesday | Daily | Daily | Previous week's forecast snapshot |
| Wednesday | Daily | Daily | Previous week's forecast snapshot |
| Thursday | Daily | Daily | Previous week's forecast snapshot |

> **Important:** Tuesday, Wednesday, and Thursday use the **PREVIOUS** week's snapshot — not the one just created on Tuesday. The new Tuesday snapshot takes effect from the following Friday onward.
