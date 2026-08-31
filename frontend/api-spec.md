# API Specification

This file is the single source of truth for all HTTP contracts between the VerbaTask frontend and backend. Every entry has been verified against the actual backend source code (`/backend/src/`).

## Conventions

- **Base URL:** All endpoints are served from `http://localhost:8080`.
- **Authentication:** Routes marked *Auth Required* must include the header `Authorization: Bearer <token>` where `<token>` is the JWT returned by the auth endpoints. Omitting or sending an invalid token returns `401 Unauthorized`.
- **Content-Type:** All `POST`/`PATCH` requests must send a JSON body with `Content-Type: application/json`.
- **JWT expiry:** Tokens are valid for 7 days.

## Global Response Envelope

Every endpoint returns this exact shape:

**Success:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "message": "Human-readable error here"
  }
}
```

---

### 1. System

| Method | Path | Auth Required | Response `data` |
|---|---|---|---|
| **GET** | `/health` | No | `{ "status": "healthy" }` |

**Notes:**
- Lightweight liveness check. No authentication required.

---

### 2. Authentication

**Base path:** `/api/auth`

| Method | Path | Auth Required | Request Body | Response `data` |
|---|---|---|---|---|
| **POST** | `/signup` | No | `{ "email": "...", "password": "..." }` | `{ "token": "...", "merchantId": "..." }` |
| **POST** | `/login` | No | `{ "email": "...", "password": "..." }` | `{ "token": "...", "merchantId": "..." }` |
| **POST** | `/link-code/confirm` | No | `{ "email": "...", "code": "..." }` | `{ "linked": true }` |
| **GET** | `/me` | **Yes** | -- | `Merchant` object (without `passwordHash`) |

**Notes:**
- `POST /signup` creates a merchant with a temporary `whatsappNumber` (`unlinked_<timestamp>`). The real WhatsApp number is linked via `/link-code/confirm`.
- `POST /login` and `POST /signup` both return `{ token, merchantId }`. The `token` is a JWT signed with a 7-day expiry.
- `POST /link-code/confirm` verifies a merchant's link-code by `email` + `code`. On success it binds the WhatsApp number to the email account. If the WhatsApp number was already associated with a separate merchant record, data is merged and the email account is adopted by the WhatsApp record. Returns `{ linked: true }`.
- `GET /me` returns the full `Merchant` document (minus `passwordHash`) for the authenticated merchant.

---

### 3. Inventory

**Base path:** `/api/inventory`
**Auth Required:** Yes for all routes.

| Method | Path | Request Body | Response `data` |
|---|---|---|---|
| **GET** | `/` | -- | Array of `InventoryItem` objects |
| **POST** | `/` | `{ "name": "...", "quantity": 0, "price": 0, "unit": "..." }` | `InventoryItem` |
| **PATCH** | `/:id` | Partial: any of `{ "name", "quantity", "price", "unit" }` | Updated `InventoryItem` |
| **DELETE** | `/:id` | -- | `{ "deleted": true }` |

**Notes:**
- `POST /` upserts by name (case-insensitive). If an item with the same `name` already exists for this merchant, `quantity` is **added** to the existing quantity. `price` and `unit` are updated only if provided. Returns HTTP `200` for an upsert, `201` for a new item.
- `PATCH /:id` supports partial updates. Only provided fields are changed.
- `DELETE /:id` returns `{ deleted: true }`. Returns `404` if the item does not belong to this merchant.
- `quantity` defaults to `0` if omitted. `price` and `unit` are optional.

---

### 4. Orders

**Base path:** `/api/orders`
**Auth Required:** Yes for all routes.

| Method | Path | Request Body | Response `data` |
|---|---|---|---|
| **GET** | `/` | -- | Array of `Order` objects, sorted newest-first |
| **GET** | `/:id` | -- | Single `Order` object |
| **POST** | `/` | See body below | Created `Order` object |

**`POST /` request body (dashboard path):**
```json
{
  "items": [
    {
      "inventoryItemId": "<ObjectId>",
      "name": "rice bag",
      "quantity": 2,
      "price": 750
    }
  ],
  "total": 1500,
  "paymentMethod": "cash",
  "source": "dashboard"
}
```

**Field rules:**
- `items` -- array of line items. Each must include either `inventoryItemId` (preferred, dashboard path) or `name` (WhatsApp NLP path).
- `paymentMethod` -- enum: `"easypaisa"` | `"jazzcash"` | `"bank"` | `"cash"`. **Required.**
- `source` -- enum: `"guided"` | `"voice"` | `"dashboard"`. **Required.** Always send `"dashboard"` from the frontend.
- `total` -- optional override. If omitted, the backend computes `sum(item.quantity * item.price)`.

**Business logic (transparent to the caller):**
1. For each line item, the backend resolves the inventory record, validates sufficient stock, deducts the quantity, and saves.
2. After stock deduction, active `threshold` workflows are evaluated. If any item's remaining quantity drops below a workflow's configured threshold, the configured action fires (e.g., a WhatsApp low-stock alert). This is transparent -- the order response is unchanged.
3. If `total >= Rs. 10,000`, the order is created with `status: "pending_approval"` instead of `"completed"`. A pending `Approval` record is automatically created and the merchant receives a WhatsApp message with Approve/Reject buttons.
4. Orders below Rs. 10,000 are created with `status: "completed"` immediately.

**Error responses:**
- `400` with `"ITEM_NOT_FOUND: ..."` if any inventory item cannot be resolved.
- `400` with `"INSUFFICIENT_STOCK: ..."` if stock is too low for any line item.
- `404` if `GET /:id` has no matching order for this merchant.

---

### 5. Approvals (HITL)

**Base path:** `/api/approvals`
**Auth Required:** Yes for all routes.

| Method | Path | Request Body | Response `data` |
|---|---|---|---|
| **GET** | `/` | -- | Array of **pending** `Approval` objects, newest-first |
| **PATCH** | `/:id/respond` | `{ "decision": "approved" \| "rejected" }` | Updated `Approval` object |

**Notes:**
- `GET /` always returns **only pending** approvals (`status: "pending"`). There are no query parameters for filtering by status -- the backend hardcodes the `pending` filter.
- `PATCH /:id/respond` records the merchant's decision. The referenced order's `status` is updated to match the decision. If the decision is `"rejected"`, stock that was deducted at order creation time is **automatically restored** (bulkWrite). Returns `404` if the approval does not exist or has already been actioned. Returns `400` if `decision` is not `"approved"` or `"rejected"` (error message contains `INVALID_DECISION`).
- Approvals are created automatically by `order.service.js` for orders with `total >= Rs. 10,000`. The merchant can also respond via WhatsApp reply buttons -- both paths update the same `Approval` record.

---

### 6. Workflows

**Base path:** `/api/workflows`
**Auth Required:** Yes for all routes.

| Method | Path | Request Body | Response `data` |
|---|---|---|---|
| **GET** | `/` | -- | Array of `Workflow` objects for this merchant, newest-first |
| **POST** | `/` | See body below | Created `Workflow` object |
| **PATCH** | `/:id` | Partial: any `Workflow` field (typically `{ "active": false }`) | Updated `Workflow` object |
| **DELETE** | `/:id` | -- | Deleted `Workflow` object |

**`POST /` request body:**
```json
{
  "trigger": "threshold",
  "condition": { "quantityThreshold": 5 },
  "action": { "type": "notify" },
  "rawInstruction": "Alert me when rice bag drops below 5 units"
}
```

**Field rules:**
- `trigger` -- enum: `"message"` | `"schedule"` | `"threshold"`. **Required.**
- `condition` -- `Mixed`. For `threshold` triggers: `{ "quantityThreshold": <number> }`.
- `action` -- `Mixed`. Known action types: `"notify"` (sends WhatsApp text alert), `"auto_reorder"` (logged only, full implementation pending).
- `rawInstruction` -- the plain-language instruction as typed or spoken by the merchant. Optional but recommended for display purposes.
- `active` -- defaults to `true`.

**Notes:**
- Workflows are primarily created by the WhatsApp NLP agent from typed or voice commands. The REST `POST /` endpoint exists for dashboard creation as well.
- `PATCH /:id` supports partial updates. The most common use is toggling `active`: `{ "active": false }`.
- `DELETE /:id` returns `404` (error message contains `WORKFLOW_NOT_FOUND`) if the workflow does not exist or belongs to a different merchant.
- `GET /` returns **all** workflows (active and inactive) for the merchant, sorted newest-first. There is no status filter parameter.
- Threshold workflows are evaluated automatically after every successful stock deduction. Only workflows with `trigger: "threshold"` and `active: true` are evaluated.

---

### 7. Dashboard Overview

**Base path:** `/api/dashboard`
**Auth Required:** Yes.

| Method | Path | Request Body | Response `data` |
|---|---|---|---|
| **GET** | `/overview` | -- | Dashboard aggregate object |

**Response `data` shape:**
```json
{
  "todaySales": 15000,
  "todayProfit": 15000,
  "todayOrdersCount": 4,
  "lowStockItems": [
    {
      "_id": "...",
      "merchantId": "...",
      "name": "rice bag",
      "quantity": 2,
      "price": 750,
      "unit": "bag",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "pendingApprovals": 1,
  "recentOrders": [
    { "...Order object..." }
  ],
  "activeWorkflows": 3
}
```

**Field notes:**
- `todaySales` -- sum of `total` for all orders with `status: "completed"` or `"approved"` created since midnight today (UTC).
- `todayProfit` -- currently mirrors `todaySales` (profit tracking not yet implemented).
- `todayOrdersCount` -- count of completed/approved orders today.
- `lowStockItems` -- up to 10 inventory items with `quantity < 10`, sorted by quantity ascending. Full `InventoryItem` documents.
- `pendingApprovals` -- count (not array) of `Approval` records with `status: "pending"`.
- `recentOrders` -- last 5 orders across all statuses, newest-first. Full `Order` documents.
- `activeWorkflows` -- count (not array) of `Workflow` records with `active: true`.

---

# Appendix: Mongoose Schemas

## Merchant
```
{
  whatsappNumber:     String (required, unique) -- temp "unlinked_<ts>" until WhatsApp is linked
  email:              String (required, unique)
  passwordHash:       String (required) -- bcrypt, never returned by GET /me
  businessName:       String (optional)
  location:           String (optional)
  sells:              String (optional)
  language:           "ur" | "en", default "ur"
  onboardingComplete: Boolean, default false
  createdAt, updatedAt
}
```

## InventoryItem
```
{
  merchantId: ObjectId -> Merchant (required)
  name:       String (required)
  quantity:   Number, default 0
  price:      Number (optional)
  unit:       String (optional) -- e.g. "bag", "kg", "piece"
  createdAt, updatedAt
}
```

## Order
```
{
  merchantId:   ObjectId -> Merchant (required)
  items: [{
    inventoryItemId: ObjectId -> InventoryItem
    name:            String
    quantity:        Number
    price:           Number
  }]
  total:         Number
  paymentMethod: "easypaisa" | "jazzcash" | "bank" | "cash" (required)
  source:        "guided" | "voice" | "dashboard" (required)
  status:        "pending_approval" | "approved" | "completed" | "rejected", default "completed"
  createdAt, updatedAt
}
```

**Status transitions:**
- Orders below Rs. 10,000 start as `"completed"` and stay there.
- Orders >= Rs. 10,000 start as `"pending_approval"`. On merchant approval: `"approved"`. On rejection: `"rejected"` (stock is also restored).

## Approval
```
{
  merchantId:  ObjectId -> Merchant (required)
  type:        "order" | "workflow_action" (required) -- currently always "order"
  refId:       ObjectId (required) -- points at Order (or Workflow for workflow_action type)
  summary:     String -- plain-language description, e.g. "2x rice bag, 1x daal"
  status:      "pending" | "approved" | "rejected", default "pending"
  respondedAt: Date -- set when PATCH /respond is called
  createdAt, updatedAt
}
```

## Workflow
```
{
  merchantId:     ObjectId -> Merchant (required)
  rawInstruction: String (optional) -- what the merchant typed or said
  trigger:        "message" | "schedule" | "threshold" (required)
  condition:      Mixed -- for threshold: { quantityThreshold: Number }
  action:         Mixed -- known types: { type: "notify" } | { type: "auto_reorder" }
  active:         Boolean, default true
  nextRunAt:      Date (optional) -- relevant for schedule triggers only
  createdAt, updatedAt
}
```

## LinkCode
```
{
  whatsappNumber: String (required)
  code:           String (required) -- 6-digit code
  expiresAt:      Date (required) -- 15 minutes from creation
  usedAt:         Date (optional) -- set on use
  createdAt, updatedAt
}
```

## Payment *(optional, not used by dashboard)*
```
{
  merchantId:    ObjectId -> Merchant (required)
  orderId:       ObjectId -> Order (null until matched)
  transactionId: String
  amount:        Number
  provider:      "easypaisa" | "jazzcash" | "bank"
  screenshotUrl: String
  matchStatus:   "matched" | "unmatched", default "unmatched"
  createdAt, updatedAt
}
```