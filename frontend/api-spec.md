# API Specification

This file contains the API specifications of the backend endpoints to ensure communication is done in a proper and well-defined contractual way. It documents the exact shape of requests and responses so the frontend and backend can be developed independently against a shared contract.

## Conventions

- **Base URL:** All endpoints are served from `http://localhost:8080/api`.
- **Authentication:** Routes marked *Auth Required* must include the header `Authorization: Bearer <token>` where `<token>` is the JWT returned by the auth endpoints. Omitting or sending an invalid token results in a `401 Unauthorized` error.
- **Content-Type:** All `POST`/`PATCH` requests must send a JSON body with the header `Content-Type: application/json`.

## Global Response Envelope

Every endpoint returns this exact shape. The frontend only needs to check the `success` boolean before reading `data` or `error`.

- **Success:**
  ```json
  {
    "success": true,
    "data": { ... }
  }
  ```

- **Error:**
  ```json
  {
    "success": false,
    "error": {
      "message": "Human-readable error here"
    }
  }
  ```

---

### 1. Authentication

**Base URL:** `http://localhost:8080/api/auth`

| Method | Path | Auth Required | Request Body | Response `data` |
|---|---|---|---|---|
| **POST** | `/signup` | No | `{ "email": "...", "password": "..." }` | `{ "token": "...", "merchantId": "..." }` |
| **POST** | `/login` | No | `{ "email": "...", "password": "..." }` | `{ "token": "...", "merchantId": "..." }` |
| **POST** | `/link-code/confirm` | No | `{ "email": "...", "code": "..." }` | `{ "linked": true }` |
| **GET** | `/me` | **Yes** | — | `Merchant` object |

**Notes:**
- `POST /signup` and `POST /login` both return the same shape — the short-lived `token` and the `merchantId` of the authenticated merchant.
- `POST /link-code/confirm` verifies a merchant's link-code using their email and the code; returns `linked: true` on success.
- `GET /me` returns the full `Merchant` profile for the currently authenticated merchant.

---

### 2. Inventory (CRM)

**Base URL:** `http://localhost:8080/api/inventory`
**Auth Required:** Yes (`Authorization: Bearer <token>`) for all routes.

| Method | Path | Request Body | Response `data` |
|---|---|---|---|
| **GET** | `/` | — | Array of `InventoryItem` objects |
| **POST** | `/` | `{ "name": "...", "quantity": 0, "price": 0, "unit": "..." }` | `InventoryItem` *(Note: auto-adds quantity if item already exists)* |
| **PATCH** | `/:id` | Partial updates (e.g., `{ "price": 1600 }`) | Updated `InventoryItem` |
| **DELETE** | `/:id` | — | `{ "deleted": true }` |

**Notes:**
- `POST /` creates a new item; if an item with the same `name` already exists, the new `quantity` is added to the existing item instead of creating a duplicate.
- `PATCH /:id` supports partial updates — only the provided fields are changed.
- `DELETE /:id` removes the item and returns `{ "deleted": true }` on success.

---

### 3. Orders (CRM)

**Base URL:** `http://localhost:8080/api/orders`
**Auth Required:** Yes (`Authorization: Bearer <token>`) for all routes.

| Method | Path | Request Body | Response `data` |
|---|---|---|---|
| **GET** | `/` | — | Array of `Order` objects |
| **GET** | `/:id` | — | Single `Order` object |
| **POST** | `/` | `{ "type": "log_sale", "item": { "name": "rice bag", "quantity": 2 }, "paymentMethod": "easypaisa", "amount": 1500, "source": "dashboard" }` | Created `Order` object |

**Notes:**
- `GET /` returns all orders for the authenticated merchant, sorted newest-first.
- `GET /:id` returns a single order; returns `404` if no order matches the given id.
- `POST /` creates a new order. The `type` field distinguishes order kinds (e.g., `log_sale`), `paymentMethod` describes how the payment was made, and `source` indicates where the order was initiated (e.g., `dashboard`).
- **High-value threshold:** If `amount` is Rs. 10,000 or above, the order is created with `status: "pending_approval"` instead of `"completed"`. A pending `Approval` record is created automatically and the merchant is notified via WhatsApp with Approve/Reject buttons. Orders below the threshold are completed immediately as before.
- After stock is deducted, **threshold workflows** are evaluated automatically — if any active threshold workflow's condition is met (e.g. stock dropped below a configured level), its action fires (e.g. a low-stock WhatsApp alert). This is transparent to the caller; the order response shape is unchanged.

---

### 4. Approvals (HITL)

**Base URL:** `http://localhost:8080/api/approvals`
**Auth Required:** Yes (`Authorization: Bearer <token>`) for all routes.

| Method | Path | Request Body | Response `data` |
|---|---|---|---|
| **GET** | `/` | — | Array of pending `Approval` objects |
| **PATCH** | `/:id/respond` | `{ "decision": "approved" \| "rejected" }` | Updated `Approval` object |

**Notes:**
- `GET /` returns all **pending** approvals for the authenticated merchant, sorted newest-first. Only approvals with `status: "pending"` are returned.
- `PATCH /:id/respond` records the merchant's decision and propagates it to the referenced order (the order's `status` is updated to match the decision). Returns `404` if the approval does not exist or has already been responded to. Returns `400` if `decision` is not `"approved"` or `"rejected"`.
- Approvals are created automatically by the backend when an order meets the high-value threshold (Rs. 10,000+). The merchant can also respond via WhatsApp reply buttons — both paths update the same record.

---

### 5. System

| Method | Path | Auth Required | Request Body | Response `data` |
|---|---|---|---|---|
| **GET** | `/health` | No | — | `{ "status": "healthy" }` |

**Notes:**
- `GET /health` is a lightweight health check used to confirm the backend is up and running. It requires no authentication.


# Appendix
## A. Schemas (Mongoose)
Merchant
{
  whatsappNumber: { type: String, required: true, unique: true },
  email:          { type: String, required: true, unique: true },
  passwordHash:   { type: String, required: true },
  businessName:   String,
  location:       String,
  sells:          String,
  language:       { type: String, enum: ['ur', 'en'], default: 'ur' },
  onboardingComplete: { type: Boolean, default: false },
  createdAt, updatedAt // timestamps: true
}
LinkCode
{
  whatsappNumber: { type: String, required: true },
  code:           { type: String, required: true },
  expiresAt:      { type: Date, required: true },
  usedAt:         Date,
  createdAt, updatedAt
}
InventoryItem
{
  merchantId: { type: ObjectId, ref: 'Merchant', required: true },
  name:       { type: String, required: true },
  quantity:   { type: Number, default: 0 },
  price:      Number,
  unit:       String, // e.g. "bag", "kg", "piece"
  createdAt, updatedAt
}
Order
The single record produced by both the guided-button flow and the voice flow — see the command contract in section 6.

{
  merchantId:   { type: ObjectId, ref: 'Merchant', required: true },
  items: [{
    inventoryItemId: ObjectId,
    name: String,
    quantity: Number,
    price: Number,
  }],
  total:         Number,
  paymentMethod: { type: String, enum: ['easypaisa', 'jazzcash', 'bank', 'cash'], required: true },
  source:        { type: String, enum: ['guided', 'voice', 'dashboard'], required: true },
  status:        { type: String, enum: ['pending_approval', 'approved', 'completed', 'rejected'], default: 'completed' },
  createdAt, updatedAt
}
status starts as pending_approval when `amount >= 10,000` (the high-value threshold). The approvals module creates a pending Approval record and sends the merchant WhatsApp buttons. Orders below the threshold are completed immediately — most routine sales never touch the approvals module at all.

Payment (optional — only used if a screenshot gets forwarded)
{
  merchantId:    { type: ObjectId, ref: 'Merchant', required: true },
  orderId:       { type: ObjectId, ref: 'Order' }, // null until matched
  transactionId: String,
  amount:        Number,
  provider:      { type: String, enum: ['easypaisa', 'jazzcash', 'bank'] },
  screenshotUrl: String,
  matchStatus:   { type: String, enum: ['matched', 'unmatched'], default: 'unmatched' },
  createdAt, updatedAt
}
Workflow
Workflows are created via WhatsApp commands (typed or voice) through the Qwen NLP agent — not directly via REST from the dashboard. Threshold workflows are evaluated automatically by order.service.js after every stock deduction: if the updated item's quantity drops below the workflow's `condition.quantityThreshold`, the configured action fires (e.g. a low-stock WhatsApp notification).
{
  merchantId:     { type: ObjectId, ref: 'Merchant', required: true },
  rawInstruction: String, // what the merchant actually typed/said
  trigger:        { type: String, enum: ['message', 'schedule', 'threshold'], required: true },
  condition:      Schema.Types.Mixed, // e.g. { item: 'rice bag', operator: '<', value: 5 }
  action:         Schema.Types.Mixed, // e.g. { type: 'notify_merchant' }
  active:         { type: Boolean, default: true },
  nextRunAt:      Date, // only relevant for schedule triggers
  createdAt, updatedAt
}
Approval (HITL)
Generic so it can cover both a large order and a risky workflow action without two separate systems.
Approvals are created automatically by order.service.js when an order's amount >= Rs. 10,000. The merchant can respond via the dashboard API (PATCH /api/approvals/:id/respond) or via WhatsApp reply buttons — both paths update the same record and propagate the decision to the referenced Order.

{
  merchantId: { type: ObjectId, ref: 'Merchant', required: true },
  type:       { type: String, enum: ['order', 'workflow_action'], required: true },
  refId:      { type: ObjectId, required: true }, // points at the Order or the Workflow
  summary:    String, // plain-language text sent to the merchant, e.g. "Approve Rs. 15,000 order for 40 units of Item X?"
  status:     { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  respondedAt: Date,
  createdAt, updatedAt
}