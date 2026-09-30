# Qomvia

Public MCP server, REST API and the QMP protocol for AI agents that read and buy from the web.

## MCP server

Connect at `https://qomvia.com/api/mcp` with no key. The client examples below cover Claude Code, Cursor and Claude Desktop.

```sh
claude mcp add --transport http qomvia https://qomvia.com/api/mcp
```

```json
{"mcpServers":{"qomvia":{"url":"https://qomvia.com/api/mcp"}}}
```

```json
{"mcpServers":{"qomvia":{"command":"npx","args":["-y","mcp-remote","https://qomvia.com/api/mcp"]}}}
```

See [MCP tools and JSON-RPC examples](mcp/README.md).

## REST API

Base URL: `https://qomvia.com`.

```sh
curl -X POST https://qomvia.com/api/v1/market/search \
  -H 'content-type: application/json' \
  -d '{"q":"bike helmet","shipTo":"CH","qty":1}'
```

```sh
curl -s -X POST https://qomvia.com/api/scan \
  -H 'content-type: application/json' \
  -d '{"domain":"example.com"}'
```

| Limit | Anonymous | Agent key (`qva_…`) |
| --- | --- | --- |
| Searches | 20 / minute | 300 / minute |
| Checkouts | 10 / minute | 120 / minute |
| Fresh scans | One per domain per hour | One per domain per hour |

See [REST endpoints and OpenAPI](api/README.md).

## QMP

QMP is the Qomvia Market Protocol for merchant discovery, signed order calls and order events.
Payments happen on the merchant's checkout.
Integration starts with a product feed and can progress to a native QMP shop.

| Tier | Integration | Ranking |
| --- | --- | --- |
| Feed only | Feed, coupon CSV and redirect template | Listed |
| Adapter | Shopify, WooCommerce or Shopware create the order in the shop | Ranked above feed-only |
| QMP native | The shop answers agents directly over QMP | Ranked first at equal price |

Merchant fees: 5% per confirmed order; the first 10 are free.

See the [QMP v1 specification](qmp/SPEC.md).

## Links

- [Qomvia](https://qomvia.com)
- [MCP server](https://qomvia.com/mcp)
- [REST API docs](https://qomvia.com/api/docs)
- [QMP](https://qomvia.com/qmp)
- [QMP protocol](https://qomvia.com/market/protocol)
- [OpenAPI](https://qomvia.com/openapi.json)
- [MCP discovery](https://qomvia.com/.well-known/mcp.json)
- [llms.txt](https://qomvia.com/llms.txt)

## License

MIT. Copyright © 2026 Qomvia.
