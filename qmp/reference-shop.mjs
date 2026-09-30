#!/usr/bin/env node
// Reference QMP v1 shop: a dependency-free Node server implementing the
// merchant side of the Qomvia Market Protocol. Run:
//   npm run qmp:shop -- qmp/fixtures/velo.csv 4010
// Env: QOMVIA_URL (event target), QOMVIA_KEY (merchant's Qomvia key, also the
// key the shop expects on incoming calls).
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

const CSV = process.argv[2] ?? "qmp/fixtures/velo.csv";
const PORT = Number(process.argv[3] ?? 4010);
const KEY = process.env.SHOP_KEY ?? "shop-secret";
const QOMVIA_URL = process.env.QOMVIA_URL ?? ""; // e.g. http://localhost:3000/api/v1/market/orders
const QOMVIA_KEY = process.env.QOMVIA_KEY ?? KEY;

const products = readFileSync(CSV, "utf8")
  .trim()
  .split("\n")
  .slice(1)
  .map((line) => {
    const [id, title, gtin, priceCents] = line.split(",");
    return { id, title, gtin, priceCents: Number(priceCents) };
  });
const orders = new Map(); // orderId -> {sessionId, code, status, totalCents, refundedCents, paidAt}

const hmac = (body, ts, key) => createHmac("sha256", key).update(`${ts}.${body}`).digest("hex");

function verify(req, raw) {
  const auth = req.headers["authorization"] ?? "";
  const ts = req.headers["qomvia-timestamp"];
  const sig = req.headers["qomvia-signature"];
  if (auth !== `Bearer ${KEY}` || !ts || !sig?.startsWith("v1=")) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  const expected = Buffer.from(hmac(raw, ts, KEY), "hex");
  const got = Buffer.from(sig.slice(3), "hex");
  return expected.length === got.length && timingSafeEqual(expected, got);
}

const send = (res, status, body, headers = {}) => {
  const data = typeof body === "string" ? body : JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json", ...headers });
  res.end(data);
};

async function postEvent(sessionId, event) {
  if (!QOMVIA_URL) return;
  const body = JSON.stringify({ event: event.event, orderId: event.orderId, amountCents: event.amountCents, at: event.at, reason: event.reason, fulfillment: event.fulfillment });
  const ts = String(Math.floor(Date.now() / 1000));
  await fetch(`${QOMVIA_URL}/${sessionId}/events`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${QOMVIA_KEY}`,
      "qomvia-timestamp": ts,
      "qomvia-signature": `v1=${hmac(body, ts, QOMVIA_KEY)}`,
    },
    body,
  }).catch(() => {});
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  let raw = "";
  for await (const chunk of req) raw += chunk;

  if (url.pathname === "/.well-known/qomvia.json") {
    return send(res, 200, {
      qmp: "1",
      name: "Reference Velo Shop",
      feed: { url: `http://localhost:${PORT}/feed.xml`, format: "google_xml" },
      orders: `http://localhost:${PORT}/qomvia/orders`,
      currency: "CHF",
      legal: { sellerName: "Velo Zürich AG", address: "Bahnhofstrasse 1, 8000 Zürich", vatId: "CHE-123.456.789" },
      privacyPolicyUrl: `http://localhost:${PORT}/privacy`,
      shipping: { countries: ["CH", "DE", "AT"], deliveryDaysMin: 2, deliveryDaysMax: 4 },
      capabilities: ["orders.list", "events", "fulfillment"],
      events: true,
      terms: { shippingPolicyUrl: `http://localhost:${PORT}/shipping`, returnWindowDays: 30 },
    });
  }
  if (url.pathname === "/feed.xml") {
    const items = products
      .map(
        (p) => `<item><g:id>${p.id}</g:id><title>${p.title}</title><g:gtin>${p.gtin}</g:gtin>
<g:price>${(p.priceCents / 100).toFixed(2)} CHF</g:price><g:availability>in_stock</g:availability><g:condition>new</g:condition></item>`,
      )
      .join("");
    res.writeHead(200, { "content-type": "application/xml" });
    return res.end(`<?xml version="1.0"?><rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel>${items}</channel></rss>`);
  }
  if (url.pathname === "/") {
    res.writeHead(200, { "content-type": "text/html" });
    return res.end(`<h1>Reference QMP shop</h1><ul>${products.map((p) => `<li>${p.title} — ${p.gtin}</li>`).join("")}</ul>`);
  }
  if (url.pathname.startsWith("/pay/")) {
    const order = orders.get(url.pathname.slice(5));
    if (!order) return send(res, 404, { error: "unknown order" });
    if (req.method === "POST") {
      order.status = "paid";
      order.paidAt = new Date().toISOString();
      void postEvent(order.sessionId, { event: "paid", orderId: order.id, amountCents: order.totalCents, at: order.paidAt });
      return send(res, 200, { status: "paid" });
    }
    res.writeHead(200, { "content-type": "text/html" });
    return res.end(
      `<h1>Order ${order.id}</h1><p>Total: ${(order.totalCents / 100).toFixed(2)} CHF — ${order.status}</p>
<form method="post"><button type="submit">Pay now</button></form>`,
    );
  }
  if (url.pathname.startsWith("/admin/refund/") && req.method === "POST") {
    const order = orders.get(url.pathname.slice(14));
    if (!order) return send(res, 404, { error: "unknown order" });
    const body = JSON.parse(raw || "{}");
    const cents = body.amountCents ?? order.totalCents;
    order.refundedCents += cents;
    if (order.refundedCents >= order.totalCents) order.status = "refunded";
    void postEvent(order.sessionId, { event: "refunded", orderId: order.id, amountCents: cents, at: new Date().toISOString() });
    return send(res, 200, { status: "refunded" });
  }

  if (url.pathname === "/qomvia/orders" || url.pathname.startsWith("/qomvia/orders/")) {
    if (!verify(req, raw)) return send(res, 401, { error: "bad auth or signature" });
    const rest = url.pathname.slice("/qomvia/orders".length);

    if (req.method === "POST" && rest === "") {
      const input = JSON.parse(raw);
      const existing = [...orders.values()].find((order) => order.sessionId === input.sessionId);
      if (existing) return send(res, 200, existing.response); // idempotent on sessionId
      const unknown = (input.items ?? []).filter((item) => item.gtin && !products.some((p) => p.gtin === item.gtin));
      const messages = unknown.map((item) => ({ code: "unknown_gtin", message: `GTIN ${item.gtin} is not in the catalogue`, param: "items[].gtin" }));
      const id = `ord_${randomUUID().slice(0, 8)}`;
      const goods = input.items.reduce((sum, item) => sum + item.unitCents * item.qty, 0);
      const shippingCents = input.shippingCents ?? 690;
      const order = {
        id,
        sessionId: input.sessionId,
        code: input.code,
        status: "pending",
        totalCents: goods - (input.discountCents ?? 0) + shippingCents,
        refundedCents: 0,
        createdAt: new Date().toISOString(),
        response: {
          orderId: id,
          paymentUrl: `http://localhost:${PORT}/pay/${id}`,
          orderUrl: `http://localhost:${PORT}/orders/${id}`,
          totalCents: goods - (input.discountCents ?? 0) + shippingCents,
          shippingCents,
          taxCents: 0,
          expiresAt: input.expiresAt,
          ...(messages.length ? { messages } : {}),
        },
      };
      orders.set(id, order);
      return send(res, 201, order.response);
    }
    if (req.method === "GET" && rest === "") {
      const since = url.searchParams.get("since");
      const codePrefix = url.searchParams.get("code") ?? "";
      const rows = [...orders.values()]
        .filter((order) => order.code.startsWith(codePrefix) && (!since || order.createdAt >= since))
        .map((order) => ({ orderId: order.id, code: order.code, status: order.status, totalCents: order.totalCents }));
      return send(res, 200, rows);
    }
    const order = orders.get(decodeURIComponent(rest.slice(1)));
    if (!order) return send(res, 404, { error: "unknown order" });
    if (req.method === "GET") {
      return send(res, 200, {
        status: order.status,
        paidAt: order.paidAt,
        refundedCents: order.refundedCents,
        totalCents: order.totalCents,
      });
    }
    if (req.method === "DELETE") {
      orders.delete(order.id);
      return send(res, 204, "");
    }
  }
  if (url.pathname.startsWith("/orders/")) {
    const order = orders.get(url.pathname.slice(8));
    if (!order) return send(res, 404, { error: "unknown order" });
    res.writeHead(200, { "content-type": "text/html" });
    return res.end(`<h1>Order ${order.id}</h1><p>Status: ${order.status} — ${(order.totalCents / 100).toFixed(2)} CHF</p>`);
  }
  if (url.pathname.startsWith("/admin/ship/") && req.method === "POST") {
    const order = orders.get(url.pathname.slice(12));
    if (!order) return send(res, 404, { error: "unknown order" });
    void postEvent(order.sessionId, {
      event: "shipped",
      orderId: order.id,
      fulfillment: { status: "shipped", carrier: "Die Post", trackingNumber: "99.60.12345", trackingUrl: `http://localhost:${PORT}/track/${order.id}` },
      at: new Date().toISOString(),
    });
    return send(res, 200, { status: "shipped" });
  }
  return send(res, 404, { error: "not found" });
});

server.listen(PORT, () => {
  console.log(`Reference QMP shop on http://localhost:${PORT} (${products.length} products from ${CSV})`);
});
