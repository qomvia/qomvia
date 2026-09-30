# Qomvia REST API

Base URL: `https://qomvia.com`. Market endpoints work without a key; an optional `Authorization: Bearer qva_…` agent key raises market limits.

The complete schema is in [openapi.json](openapi.json).

## Market endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/v1/market/search` | Find ranked, signed offers from listed shops. |
| GET | `/api/v1/market/offers/{id}` | Read an offer, prices, terms and expiry. |
| POST | `/api/v1/market/offers/{id}/extend` | Extend an offer once by 30 minutes. |
| POST | `/api/v1/market/checkout_sessions` | Open a checkout session on an offer. |
| GET | `/api/v1/market/checkout_sessions/{id}` | Read a session and its order state. |
| POST | `/api/v1/market/checkout_sessions/{id}/complete` | Return the merchant-hosted payment URL. |
| POST | `/api/v1/market/checkout_sessions/{id}/cancel` | Cancel an open session. |

## Scores

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/scan` | Scan a website read-only; cached for one hour per domain. |
| GET | `/api/score/{slug}` | Read the latest published score and check statuses. |
| GET | `/api/badge/{slug}` | Read seal markup or `{ "earned": false }`. |
| GET | `/llms.txt` | Read the machine-readable service description. |

## Examples

Search the market:

```sh
curl -X POST https://qomvia.com/api/v1/market/search \
  -H 'content-type: application/json' \
  -d '{"q":"bike helmet","shipTo":"CH","qty":1}'
```

Scan a domain:

```sh
curl -s -X POST https://qomvia.com/api/scan \
  -H 'content-type: application/json' \
  -d '{"domain":"example.com"}'
```

## Limits

| Request | Anonymous | Agent key (`qva_…`) |
| --- | --- | --- |
| Market searches | 20 per minute | 300 per minute |
| Market checkouts | 10 per minute | 120 per minute |
| Fresh scans | One per domain per hour | One per domain per hour |

Goods payments always happen on the merchant's checkout.
