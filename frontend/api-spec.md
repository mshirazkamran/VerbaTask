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
- `GET /` returns all orders for the authenticated merchant.
- `GET /:id` returns a single order; returns `404` if no order matches the given id.
- `POST /` creates a new order. The `type` field distinguishes order kinds (e.g., `log_sale`), `paymentMethod` describes how the payment was made, and `source` indicates where the order was initiated (e.g., `dashboard`).

---

### 4. System

| Method | Path | Auth Required | Request Body | Response `data` |
|---|---|---|---|---|
| **GET** | `/health` | No | — | `{ "status": "healthy" }` |

**Notes:**
- `GET /health` is a lightweight health check used to confirm the backend is up and running. It requires no authentication.
