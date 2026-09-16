# 9. Key Tables Reference

| Table Name | Tier | Role |
|------------|------|------|
| `In_Fact_DemandForecastHeader_Staged_PULL` | Staged | Holds raw Tuesday/Wednesday header snapshot |
| `In_Fact_DemandForecastDetail_Staged_PULL` | Staged | Holds raw Tuesday/Wednesday detail snapshot |
| `In_Fact_DemandForecastHeader_Active_PULL` | Active | Promoted on Friday; canonical weekly header source |
| `In_Fact_DemandForecastDetail_Active_PULL` | Active | Promoted on Friday; canonical weekly detail source |
| `In_Fact_DemandForecastHeader` | Main | Live header table queried by downstream reports and processing |
| `In_Fact_DemandForecastDetail` | Main | Live detail table queried by downstream reports and processing |
