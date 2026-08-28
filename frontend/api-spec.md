## This file will have the api specificatinos of the backend endpoints to ensure communication is done in a proper and well defined contractual way.

```
## This file will have the api specifications of the backend endpoints to ensure communication is done in a proper and well defined contractual way.

**Global Response Envelope**
Every endpoint returns this exact shape. The frontend only needs to check the `success` boolean.
*   **Success:** `{ "success": true, "data": { ... } }`
*   **Error:** `{ "success": false, "error": { "message": "Human-readable error here" } }`

---

### 1. Authentication
**Base URL:** `http://localhost:8080/api/auth`

| Method | Path | Auth Required | Request Body | Response `data` |
|---|---|---|---|---|
| **POST** | `/signup` | No | `{ "email": "...", "password": "..." }` | `{ "token": "...", "merchantId": "..." }` |
| **POST** | `/login` | No | `{ "email": "...", "password": "..." }` | `{ "token": "...", "merchantId": "..." }` |
| **POST** | `/link-code/confirm` | No | `{ "email": "...", "code": "..." }` | `{ "linked": true }` |
| **GET** | `/me` | **Yes** | — | `Merchant` object |

---

### 2. Inventory (CRM)
**Base URL:** `http://localhost:8080/api/inventory`
**Auth Required:** Yes (`Authorization: Bearer <token>`) for all routes.

| Method | Path | Request Body | Response `data` |
|---|---|---|---|
| **GET** | `/` | — | Array of `InventoryItem` objects |
| **POST** | `/` | `{ "name": "...", "quantity": 0, "price": 0, "unit": "..." }` | `InventoryItem` *(Note: Auto-adds quantity if item already exists)* |
| **PATCH** | `/:id` | Partial updates (e.g., `{ "price": 1600 }`) | Updated `InventoryItem` |
| **DELETE** | `/:id` | — | `{ "deleted": true }` |

---

### 3. Orders (CRM)
**Base URL:** `http://localhost:8080/api/orders`
**Auth Required:** Yes (`Authorization: Bearer <token>`) for all routes.

| Method | Path | Request Body | Response `data` |
|---|---|---|---|
| **GET** | `/` | — | Array of `Order` objects |
| **GET** | `/:id` | — | Single `Order` object |
| **POST** | `/` | `{ "type": "log_sale", "item": { "name": "rice bag", "quantity": 2 }, "paymentMethod": "easypaisa", "amount": 1500, "source": "dashboard" }` | Created `Order` object |

---

### 4. System
| Method | Path | Auth Required | Request Body | Response `data` |
|---|---|---|---|---|
| **GET** | `/health` | No | — | `{ "status": "healthy" }` |
```
