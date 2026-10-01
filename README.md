<p align="center">
  <img src="assets/logo.png" alt="Qomvia logo" width="120" />
</p>

<h1 align="center">Qomvia</h1>

<p align="center">
  <strong>Get read, named and bought by AI agents.</strong><br/>
  Agent-readiness scoring, AI brand monitoring and agentic checkout — over REST, MCP and QMP.
</p>

<p align="center">
  <a href="https://qomvia.com"><img alt="Website" src="https://img.shields.io/badge/website-qomvia.com-blue"/></a>
  <a href="https://qomvia.com/api/mcp"><img alt="MCP server" src="https://img.shields.io/badge/MCP-streamable--HTTP-green"/></a>
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-lightgrey"/></a>
</p>

## What is Qomvia?

AI agents are becoming how people shop and research — but most websites were built for humans with browsers. Qomvia measures how ready your site is for that shift, tracks what the major AI models actually say about your brand, and gives agents a real way to buy from you:

- **Agent-readiness score** — 26 checks on your public HTTP responses, graded 0–100 / A–F on one published rubric. Free, no sign-up: every scanned site gets a public page like `qomvia.com/site/<slug>`.
- **AI monitor** — asks ChatGPT, Gemini and Grok the questions your buyers ask, then records whether you're named, cited — or a rival is. Weekly, per question.
- **Qomvia Market** — product search built for agents: signed offers with agent pricing, and checkout that always settles on the **merchant's own payment page**. Qomvia never touches the money.

Everything public is readable by humans *and* machines — as HTML, JSON, plain text (`/llms.txt`) or MCP.

<p align="center">
  <img src="assets/site-monitor.png" alt="Qomvia site monitor — agent-readiness score 98, grade A" width="31%" />
  <img src="assets/ai-monitor.png" alt="Qomvia AI monitor — one question tracked across ChatGPT, Claude, Gemini, Grok and Perplexity" width="31%" />
  <img src="assets/competitor-intel.png" alt="Qomvia competitor intelligence — which rivals get named instead of you" width="31%" />
</p>
<p align="center"><sub>Site monitor · AI monitor across models · Competitor intelligence</sub></p>

## Start here

| I want to… | Use | Start |
| --- | --- | --- |
| Let my agent find and buy products | Public MCP server | [Connect in 30 seconds](mcp/README.md#quick-start) |
| Check if a website is ready for agents | Public MCP server or REST | [`get_ai_readiness_score`](mcp/README.md#public-server) |
| Run my Site, AI, competitor and product monitors from Claude or ChatGPT | Account MCP server | [Sign in with Qomvia](mcp/README.md#account-server) |
| Build my own integration | REST API | [api/README.md](api/README.md) |
| Let agents order from my shop | QMP | [qmp/SPEC.md](qmp/SPEC.md) |

## MCP servers

<table>
  <tr>
    <td width="50%" valign="top">
      <img src="assets/scene-mcp-agent-buy.png" alt="An agent comparing three shops and returning a payment link through the public Qomvia MCP server" width="100%" />
      <h3>Public</h3>
      <code>https://qomvia.com/api/mcp</code>
      <p>No key. Search shops, hold signed offers, check out on the merchant's page and score any website.</p>
      <p><b>10 tools</b></p>
    </td>
    <td width="50%" valign="top">
      <img src="assets/scene-mcp-account-tools.png" alt="An agent listing sites, estimating credits, running an AI search and polling the result on the account MCP server" width="100%" />
      <h3>Account</h3>
      <code>https://qomvia.com/api/mcp/account</code>
      <p>Sign in with OAuth or an API key. Run your Site monitor, AI monitor, competitors and Product monitor.</p>
      <p><b>33 tools</b></p>
    </td>
  </tr>
</table>

```sh
claude mcp add --transport http qomvia https://qomvia.com/api/mcp
```

In ChatGPT or Claude.ai, add `https://qomvia.com/api/mcp/account` as a custom connector and sign in with Qomvia.

Runs that spend credits are estimated first and capped by `max_credits`; agents poll with `get_run`, and retries with an idempotency key are never charged twice.

**Skill:** a downloadable Agent Skill for Claude and ChatGPT: [qomvia.com/skills/qomvia.zip](https://qomvia.com/skills/qomvia.zip).

Full guide and tool reference: [mcp/README.md](mcp/README.md) · Registry descriptor: [server.json](server.json) · Discovery: [`/.well-known/mcp.json`](https://qomvia.com/.well-known/mcp.json)

## REST API

<table>
  <tr>
    <td width="50%"><img src="assets/scene-api-search.png" alt="A curl search to the Qomvia Market API returning three compared shops" width="100%" /></td>
    <td width="50%" valign="top">
      <p>The same Market and scores over plain HTTP. <code>POST /api/v1/market/search</code> finds ranked, signed offers across every listed shop; <code>POST /api/scan</code> scores any domain.</p>
      <p>No key to start.</p>
      <p><a href="api/README.md">Endpoint reference</a> · <a href="api/openapi.json">OpenAPI</a> · <a href="https://qomvia.com/api/docs">qomvia.com/api/docs</a></p>
    </td>
  </tr>
</table>

## QMP — the merchant side

The Qomvia Market Protocol is how a shop answers agent orders: publish `/.well-known/qomvia.json`, accept signed (HMAC) order calls at `/qomvia/orders`, and the buyer pays on **your** checkout. Four endpoints — create, read, list, cancel — plus a conformance runner in this repo.

| Tier | Integration | Ranking |
| --- | --- | --- |
| Feed only | Feed, coupon CSV and redirect template — no code | Listed |
| Adapter | Shopify, WooCommerce or Shopware creates the order | Ranked above feed-only |
| QMP native | Your shop answers agents directly | Ranked first at equal price |

Merchant fees: 5% per confirmed order; the first 10 are free.

Spec: [qmp/SPEC.md](qmp/SPEC.md) · Reference shop + conformance runner: [qmp/](qmp/)

## Links

- [qomvia.com](https://qomvia.com) — free score, live leaderboard
- [MCP server page](https://qomvia.com/mcp) · [QMP](https://qomvia.com/qmp) · [Methodology](https://qomvia.com/methodology)
- [OpenAPI](https://qomvia.com/openapi.json) · [Agent skills](https://qomvia.com/.well-known/agent-skills/index.json) · [llms.txt](https://qomvia.com/llms.txt)

## License

MIT. Copyright © 2026 Qomvia.
