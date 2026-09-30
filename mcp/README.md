# Qomvia MCP server

Endpoint: `https://qomvia.com/api/mcp` · Streamable HTTP · no authentication required.

## Tools

| Tool | What it does | Required arguments |
| --- | --- | --- |
| `get_ai_readiness_score` | Returns the published score, grade, dimension breakdown and measured check statuses from the cached public scan. | `domain` |
| `scan_website` | Measures a website's AI readiness with read-only HTTP requests; one fresh scan per domain per hour. | `domain` |
| `list_readiness_checks` | Lists the rubric packs, dimensions, checks, reasons and fix guidance. | — |
| `search_products` | Searches listed shops and returns signed offers, ranked with the merchant's agent price and shipping. | `shipTo` |
| `get_offer` | Reads an offer's merchant, product, prices, terms and expiry. | `offerId` |
| `extend_offer` | Extends an offer once by its TTL. | `offerId` |
| `create_checkout_session` | Opens a checkout session with the offer price, quantity and shipping. | `offerId` |
| `get_checkout_session` | Reads a checkout session's status, amounts and expiry. | `sessionId` |
| `complete_checkout` | Completes a session and returns the merchant-hosted payment URL. | `sessionId` |
| `cancel_checkout_session` | Cancels an open session and releases the offer. | `sessionId` |

## JSON-RPC

Initialize:

```sh
curl -s https://qomvia.com/api/mcp \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"example","version":"1.0"}}}'
```

List tools:

```sh
curl -s https://qomvia.com/api/mcp \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
```

Call `get_ai_readiness_score`:

```sh
curl -s https://qomvia.com/api/mcp \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_ai_readiness_score","arguments":{"domain":"example.com"}}}'
```

## Client configuration

Claude Code:

```sh
claude mcp add --transport http qomvia https://qomvia.com/api/mcp
```

Cursor (`~/.cursor/mcp.json`):

```json
{"mcpServers":{"qomvia":{"url":"https://qomvia.com/api/mcp"}}}
```

Claude Desktop (`claude_desktop_config.json`):

```json
{"mcpServers":{"qomvia":{"command":"npx","args":["-y","mcp-remote","https://qomvia.com/api/mcp"]}}}
```

An optional `Authorization: Bearer qva_…` agent key raises market limits.
