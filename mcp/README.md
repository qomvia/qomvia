# Qomvia MCP servers

Qomvia runs two streamable-HTTP MCP servers:

| Server | Endpoint | Authentication | Tools |
| --- | --- | --- | --- |
| Public | `https://qomvia.com/api/mcp` | None | 10: Market search and checkout, agent-readiness scores |
| Account | `https://qomvia.com/api/mcp/account` | Owner-scoped API key | 33: Site monitor, AI monitor, competitors, Product monitor |

## Public server tools

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

## Public server: JSON-RPC

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

## Public server: client configuration

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

## Account server

`https://qomvia.com/api/mcp/account` lets an agent work with your own Qomvia sites: read Site monitor reports and fixes, start rescans, run AI monitor searches across your phrases and wait for the answers, add phrases, track competitors and check product visibility.

### Authentication

Create a key in **Dashboard → Settings → API keys**. Keys start with `qvk_live_`. Each key has scopes and can be limited to particular sites. It expires after 30, 90 or 365 days, or never, and you can revoke it at any time. Send it as a header:

```
Authorization: Bearer qvk_live_…
```

Keys are never accepted in a URL or query string. Requests without a valid key get `401`. Tools for sites the key can't access answer `not_found`.

| Preset | Scopes |
| --- | --- |
| Read only | `sites:read`, `monitor:read`, `competitors:read`, `products:read` |
| Read and edit | Read only plus `monitor:write`, `competitors:write`, `products:write` |
| Full | Read and edit plus `sites:scan`, `monitor:run`, `competitors:run`, `products:run` (can spend credits) |

### Credits, polling and retries

- `estimate_ai_run` and `estimate_product_run` show the credit cost before a run starts. Runs that cost credits require `max_credits` and stop if the estimate is higher.
- Runs return a `run_id` straight away. `get_run` with `wait_seconds` (up to 25) waits for progress, so an agent can poll until answers arrive.
- Pass an `idempotency_key` (8–100 letters, digits, `_` or `-`). If the same request is retried within 24 hours, it returns the original run instead of charging again.
- Limits per key: 120 reads, 30 writes and 10 runs per minute. Plan limits, cooldowns and credit balances are the same as in the dashboard.

### Tools

#### Account

| Tool | What it does | Scope |
| --- | --- | --- |
| `whoami` | Read the account and permissions for this API key. | `sites:read` |
| `list_sites` | List the sites available to this account. | `sites:read` |

#### Site monitor

| Tool | What it does | Scope |
| --- | --- | --- |
| `get_site_report` | Read the latest Site monitor score, findings, and fixes. | `sites:read` |
| `get_fix_prompt` | Build a copy-ready prompt for a failing or partial site check. | `sites:read` |
| `start_site_scan` | Start a fresh Site monitor scan; scans are limited by cooldown. | `sites:scan` |
| `get_site_scan` | Read the latest Site monitor scan and wait briefly for completion. | `sites:read` |

#### AI monitor

| Tool | What it does | Scope |
| --- | --- | --- |
| `get_ai_monitor` | Read the AI monitor balance, tracked phrases, providers, and latest runs. | `monitor:read` |
| `list_phrases` | List tracked, research, or archived AI monitor phrases. | `monitor:read` |
| `add_phrases` | Save phrases to AI monitor research, optionally adding them to the Weekly tracker. | `monitor:write` |
| `update_phrases` | Track, pause, archive, restore, tag, or organise AI monitor phrases. | `monitor:write` |
| `estimate_ai_run` | Estimate the credits for a tracked or selected phrase run without starting it. | `monitor:read` |
| `run_ai_search` | Queue fresh AI answers for tracked or selected phrases; costs credits, so set max_credits. | `monitor:run` |
| `ask_ai` | Ask AI providers one fresh question; costs credits, so set max_credits. | `monitor:run` |
| `get_run` | Read AI run results and optionally wait for progress. | `monitor:read` |
| `list_runs` | List recent AI monitor runs for this site. | `monitor:read` |
| `get_answer` | Read a full AI answer and its citations. | `monitor:read` |

#### Competitors

| Tool | What it does | Scope |
| --- | --- | --- |
| `list_competitors` | Read tracked and listed rival domains for a site. | `competitors:read` |
| `get_competitor` | Read a rival profile, answer evidence and head-to-head summary. | `competitors:read` |
| `get_competitor_gaps` | Read questions where a rival wins, is named, or is absent. | `competitors:read` |
| `search_mentions` | Search measured answers for a rival, domain or topic. | `competitors:read` |
| `add_competitor` | Add a rival domain to the list, optionally tracking it. | `competitors:write` |
| `update_competitor` | Track, untrack, dismiss or restore a rival and edit its identity. | `competitors:write` |
| `investigate_competitor` | Start a public read-only scan for a tracked rival. | `competitors:run` |
| `run_head_to_head` | Start a head-to-head rival comparison after budget and balance checks. | `competitors:run` |

#### Product monitor

| Tool | What it does | Scope |
| --- | --- | --- |
| `list_products` | Read catalogue products, tracking state and capacity. | `products:read` |
| `get_product_visibility` | Read latest product visibility answers and run status. | `products:read` |
| `add_product` | Add and track a catalogue product. | `products:write` |
| `set_tracked_products` | Choose smart, top-by-price or explicit product tracking. | `products:write` |
| `remove_product` | Permanently remove a product and its questions. | `products:write` |
| `save_product_question` | Create or update a product question. | `products:write` |
| `remove_product_question` | Remove a saved product question. | `products:write` |
| `estimate_product_run` | Estimate credits for a product visibility run. | `products:read` |
| `run_product_check` | Start a product visibility run. | `products:run` |

### Client configuration

Claude Code:

```sh
claude mcp add --transport http qomvia https://qomvia.com/api/mcp/account --header "Authorization: Bearer $QOMVIA_API_KEY"
```

Claude Desktop and Cursor:

```json
{
  "mcpServers": {
    "qomvia": {
      "type": "http",
      "url": "https://qomvia.com/api/mcp/account",
      "headers": { "Authorization": "Bearer ${QOMVIA_API_KEY}" }
    }
  }
}
```

### Qomvia skill for Claude and ChatGPT

A downloadable Agent Skill teaches an agent the account workflow: check access, estimate credits, run, poll, and read mention rate, citation rate, rank and share of voice correctly. Download it at [qomvia.com/skills/qomvia.zip](https://qomvia.com/skills/qomvia.zip). It is listed in the [Agent Skills index](https://qomvia.com/.well-known/agent-skills/index.json).

Full documentation: [qomvia.com/mcp](https://qomvia.com/mcp) · Authentication: [qomvia.com/.well-known/auth.md](https://qomvia.com/.well-known/auth.md)
