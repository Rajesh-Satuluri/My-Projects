# Additional Incoming Fields — Upstream Tables

As part of the user stories delivered in this release, the following upstream tables have been enhanced with new and additional fields. These fields are received from the source system and are consumed by the GSP demand forecast processes during the daily and weekly batch runs.

---

## In_Fact_StockTransferAgreementLine_P2

This table carries stock transfer agreement line details. The fields listed below are now received as part of the inbound feed and are available for downstream processing.

| Field Name | Description |
|---|---|
| To_Logistics_Center_Code | Destination logistics center receiving the stock transfer |
| Stock_Transfer_Number | Unique identifier for the stock transfer agreement |
| Stock_Transfer_Line_Number | Line-level identifier within the stock transfer agreement |
| Stock_Transfer_Create_Date | Date on which the stock transfer agreement was created |
| Stock_Transfer_Schedules_Change_Date | Date of the most recent schedule change for the transfer |
| Effective_In_Dt | Date from which the transfer agreement line becomes effective |
| Effective_Out_Dt | Date on which the transfer agreement line expires |
| Effective_Indicator | Flag indicating whether the line is currently active/effective |
| Item_Number | Item identifier associated with the stock transfer line |
| From_Logistics_Center_Code | Source logistics center dispatching the stock transfer |
| Item_Revision_Code | Revision code for the item on the transfer line |
| Desk_Code | Desk or planning group code associated with the transfer |
| Stock_Transfer_Agreement_Type | Type classification of the stock transfer agreement |
| Stock_Transfer_Agreement_Quantity | Agreed quantity for the stock transfer |
| Receipts_Cumulative | Cumulative receipt quantity recorded against the agreement |
| Shipments_Cumulative | Cumulative shipment quantity dispatched against the agreement |
| Value_Stream | Value stream classification for the transfer line |
| DemandFullfillmentPriority | Priority level assigned for demand fulfillment |
| Receipt_Cumulative_Quantity_Aged | **New** — Aged cumulative receipt quantity (with aging logic applied) |
| Receipt_Cumulative_Quantity_Aged_Date | **New** — Date from which the aged cumulative receipt quantity is computed |

---

## In_Fact_DemandForecastHeader

This table carries demand forecast header-level data. The fields listed below are now received as part of the inbound feed and support both forecast and replenishment quantity tracking with aging.

| Field Name | Description |
|---|---|
| Customer_Forecast_Create_TS | Timestamp when the customer forecast record was created |
| Logistics_Center_Code | Logistics center associated with the forecast |
| Customer_Code | Customer identifier for the forecast |
| Sales_Agreement_Number | Sales agreement linked to the forecast header |
| Sales_Agreement_Line_Number | Line number within the sales agreement |
| Item_Number | Item identifier for the forecast record |
| Logistics_Center_Priority | Priority ranking of the logistics center for fulfillment |
| Customer_Type | Classification of the customer (e.g., PULL, PUSH) |
| Value_Stream | Value stream the item and customer belong to |
| Closed_Date | Date the forecast record was closed |
| Forecast_Ship_Cumulative_Quantity | Cumulative forecast quantity based on ship schedule |
| Forecast_Receipt_Cumulative_Quantity | Cumulative forecast quantity based on receipt schedule |
| Replenishment_Ship_Cumulative_Quantity | Cumulative replenishment quantity based on ship schedule |
| Replenishment_Receipt_Cumulative_Quantity | Cumulative replenishment quantity based on receipt schedule |
| DemandFullfillmentPriority | Priority level assigned for demand fulfillment |
| Forecast_Receipt_Cumulative_Quantity_Aged | **New** — Aged cumulative forecast receipt quantity (with aging logic applied) |
| Forecast_Receipt_Cumulative_Quantity_Aged_Date | **New** — Date from which the aged forecast receipt cumulative is computed |
| Replenishment_Receipt_Cumulative_Quantity_Aged | **New** — Aged cumulative replenishment receipt quantity (with aging logic applied) |
| Replenishment_Receipt_Cumulative_Quantity_Aged_Date | **New** — Date from which the aged replenishment receipt cumulative is computed |

> **Note:** Fields marked as **New** are net-new additions introduced as part of this release. All other fields were present in earlier versions of the table and are documented here for completeness.
