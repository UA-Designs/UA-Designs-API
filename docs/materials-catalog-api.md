# Materials Catalog API Semantics

`POST /api/resources/materials` supports catalog entries where `quantity` is optional.

## Catalog semantics

- Materials in the catalog represent reusable item definitions.
- They are **not** authoritative stock/on-hand records.
- `quantity` can be omitted for template-style entries.

## Create payload

Required:
- `name`
- `unit`
- `unitCost`

Optional:
- `projectId`
- `category`
- `description`
- `quantity`
- `supplier`
- `status`
- `deliveryDate`

## Quantity behavior

- If `quantity` is omitted, backend stores `quantity: null` and `totalCost: null`.
- If `quantity` is provided, backend computes `totalCost = quantity * unitCost`.
- Backward compatible: existing clients that still send `quantity` continue to work.

## Date format

All API datetime values are ISO-8601 strings.
