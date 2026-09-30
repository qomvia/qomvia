# QMP v1: the Qomvia Market Protocol

QMP connects shopping agents to merchant shops over HTTPS JSON.
Shops publish discovery data and receive signed order requests.
Merchants take payment on their own checkout and send order events back.

## 1. Discovery

Publish the shop document at `/.well-known/qomvia.json`.

```json
{
  "qmp": "1",
  "name": "Velo Zürich",
  "feed": { "url": "https://shop.example/feed.xml", "format": "google_xml" },
  "orders": "https://shop.example/qomvia/orders",
  "currency": "CHF",
  "legal": { "sellerName": "Velo Zürich AG", "vatId": "CHE-123.456.789" },
  "privacyPolicyUrl": "https://shop.example/privacy",
  "shipping": { "countries": ["CH", "DE", "AT"], "deliveryDaysMin": 2, "deliveryDaysMax": 4 },
  "capabilities": ["orders.list", "events", "fulfillment"],
  "events": true,
  "terms": { "shippingPolicyUrl": "https://shop.example/shipping", "returnWindowDays": 30 }
}
```

| Optional field | Meaning |
| --- | --- |
| `name` | Shop name. |
| `legal` | Seller name and VAT ID. |
| `privacyPolicyUrl` | Link to the privacy policy. |
| `capabilities` | Supported capabilities such as `orders.list`, `events` and `fulfillment`. |
| `events` | Whether the shop pushes events to Qomvia. |

## 2. Signing

Every call in both directions carries a Bearer key and an HMAC-SHA256 signature over the timestamp and raw request body.

```text
signature = HMAC-SHA256(key, "<timestamp>.<raw request body>")

Qomvia-Timestamp: unix seconds, skew ≤ 300 s
Qomvia-Signature: v1=<hex lowercase signature>
Authorization: Bearer <merchant key>
```

The shop signs events back with its Qomvia key.

## 3. Order endpoints

`{orders}` is the URL from the discovery document.

| Method | Endpoint | Behavior |
| --- | --- | --- |
| POST | `{orders}` | Create an order for an agent session; a repeated `sessionId` returns the existing order. |
| GET | `{orders}/{id}` | Read status, `totalCents`, `refundedCents`, `paidAt` and optional `fulfillment {status, carrier?, trackingNumber?, trackingUrl?}`. |
| GET | `{orders}?code=QV-&since=` | List orders by code prefix and timestamp. |
| DELETE | `{orders}/{id}` | Cancel an unpaid order; returns 204, or 404 when unknown or already paid. |

Create request:

```json
{
  "sessionId": "ses_9f2e",
  "code": "QV-4K9M2XPL",
  "items": [
    {
      "gtin": "7612345678901",
      "sku": "HELMET-1",
      "variantId": "451002",
      "title": "Velohelm Pro",
      "qty": 1,
      "unitCents": 8540,
      "listCents": 8990,
      "url": "https://shop.example/p/velohelm-pro"
    }
  ],
  "discountCents": 450,
  "currency": "CHF",
  "shippingCents": 690,
  "buyer": { "email": "buyer@agent.example", "name": "Buy Er" },
  "shipTo": { "name": "Buy Er", "line1": "Weg 1", "zip": "8000", "city": "Zürich", "country": "CH" },
  "expiresAt": "2026-09-28T12:30:00Z",
  "note": "Qomvia Market order · code QV-4K9M2XPL"
}
```

Successful create returns **201**:

```json
{
  "orderId": "ord_1842",
  "paymentUrl": "https://shop.example/pay/ord_1842",
  "orderUrl": "https://shop.example/orders/ord_1842",
  "totalCents": 9230,
  "shippingCents": 690,
  "taxCents": 0,
  "expiresAt": "2026-09-28T12:30:00Z",
  "messages": []
}
```

| Optional response field | Meaning |
| --- | --- |
| `orderUrl` | Order status page. |
| `messages` | Optional array of `{code, message, param?}` notes, such as stock notes. |

## 4. Events back to Qomvia

When payment settles, an order is refunded or cancelled, or fulfillment changes, the shop posts a signed event to Qomvia at `/api/v1/market/orders/{sessionId}/events`.

```json
{
  "event": "paid",
  "orderId": "ord_1842",
  "amountCents": 9230,
  "reason": "item returned",
  "fulfillment": {
    "status": "shipped",
    "carrier": "Die Post",
    "trackingNumber": "99.60.12345"
  },
  "at": "2026-09-28T12:35:10Z"
}
```

| Optional event field | Meaning |
| --- | --- |
| `reason` | Reason for a refunded or cancelled event. |
| `fulfillment` | Shipping or delivery status, with optional carrier and tracking number. |

Event types: `paid`, `refunded`, `cancelled`, `shipped`, `delivered`.

### Errors

| Status | Meaning |
| --- | --- |
| 401 | Missing or wrong Bearer key. |
| 403 | Timestamp is outside the 300-second window or the signature does not match. |
| 404 | Unknown order ID. |
| 409 | Conflict, such as deleting a paid order. |
| 422 | Request body fails validation, such as an unsupported item or wrong shape. |

## Rules

- **Signed both ways:** Qomvia signs order calls with the merchant key; the shop signs events with its Qomvia key.
- **Idempotent create:** `sessionId` is the deduplication key; retries return the existing order.
- **Merchant of record:** the buyer pays the merchant at `paymentUrl`; Qomvia never handles goods payments.
- **Feed-only fallback:** a feed, coupon CSV and redirect template can list a shop without an order endpoint.

## Integration tiers

| Tier | Integration | Ranking |
| --- | --- | --- |
| Feed only | A feed, coupon CSV and redirect template; no code. | Listed |
| Adapter | Shopify, WooCommerce or Shopware create the order in the shop. | Ranked above feed-only |
| QMP native | The shop answers agents directly over QMP. | Ranked first at equal price |

Fee: 5% per confirmed order; the first 10 are free.

## 5. Conformance

The reference shop and conformance checks exercise discovery and a create → get → list → delete order cycle.

```sh
npm run qmp:shop -- qmp/fixtures/velo.csv 4010
node qmp/conformance.mjs http://localhost:4010 shop-secret
```
