#!/usr/bin/env node
// QMP conformance check: create → get → list → delete against a live shop.
//   node qmp/conformance.mjs <shopUrl> <key>
import { createHmac } from "node:crypto";

const [shopUrl, key] = process.argv.slice(2);
if (!shopUrl || !key) {
  console.error("usage: node qmp/conformance.mjs <shopUrl> <key>");
  process.exit(2);
}
const base = shopUrl.replace(/\/$/, "");
let failures = 0;

async function call(method, path, body) {
  const raw = body == null ? "" : JSON.stringify(body);
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = createHmac("sha256", key).update(`${ts}.${raw}`).digest("hex");
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${key}`,
      "qomvia-timestamp": ts,
      "qomvia-signature": `v1=${sig}`,
    },
    body: method === "GET" || method === "DELETE" ? undefined : raw,
  });
  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: response.status, json, text };
}

function report(name, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

const discovery = await fetch(`${base}/.well-known/qomvia.json`);
const doc = await discovery.json().catch(() => null);
report("discovery document", discovery.status === 200 && doc?.qmp === "1" && typeof doc?.orders === "string", `HTTP ${discovery.status}`);

// Optional v1 additive fields — validated only when present.
if (doc?.name != null) report("discovery name", typeof doc.name === "string" && doc.name.length > 0, doc.name);
if (doc?.legal != null) report("discovery legal", typeof doc.legal.sellerName === "string", doc.legal?.sellerName);
if (doc?.privacyPolicyUrl != null) report("discovery privacyPolicyUrl", /^https?:\/\//.test(doc.privacyPolicyUrl), doc.privacyPolicyUrl);
if (doc?.shipping != null) {
  report("discovery shipping", Array.isArray(doc.shipping.countries) && doc.shipping.countries.every((c) => /^[A-Z]{2}$/.test(c)),
    (doc.shipping.countries ?? []).join(","));
}
const CAPS = ["orders.list", "events", "fulfillment"];
const caps = Array.isArray(doc?.capabilities) ? doc.capabilities.filter((c) => CAPS.includes(c)) : [];
console.log(`Declared capabilities: ${caps.join(", ") || "none"}`);
if (doc?.events != null) report("discovery events flag", typeof doc.events === "boolean", String(doc.events));

const ordersUrl = doc?.orders ?? `${base}/qomvia/orders`;
const ordersPath = ordersUrl.startsWith("http") ? new URL(ordersUrl).pathname : ordersUrl;

const sessionId = `conf_${Date.now()}`;
const created = await call("POST", ordersPath, {
  sessionId,
  code: `QV-CONF${String(Date.now()).slice(-4)}`,
  items: [{ gtin: "7612345678901", sku: "CONF-1", title: "Conformance item", productUrl: `${base}/p/conf-1`, qty: 1, unitCents: 8990, listCents: 9990 }],
  currency: "CHF",
  shippingCents: 690,
  discountCents: 450,
  buyer: { email: "agent@example.com", name: "Conformance" },
  shipTo: { name: "Conf Ormance", line1: "Testweg 1", zip: "8000", city: "Zürich", country: "CH" },
  expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
});
report("create order", created.status === 201 || created.status === 200, `HTTP ${created.status}`);
const orderId = created.json?.orderId;
const paymentUrl = created.json?.paymentUrl;
report("create returns orderId + paymentUrl", Boolean(orderId && paymentUrl), `orderId=${orderId}`);
if (created.json?.orderUrl != null) report("create returns orderUrl", /^https?:\/\//.test(created.json.orderUrl), created.json.orderUrl);
if (created.json?.messages != null) {
  report("create messages well-formed", Array.isArray(created.json.messages) && created.json.messages.every((m) => m.code && m.message),
    `${created.json.messages.length} message(s)`);
}

const again = await call("POST", ordersPath, JSON.parse(JSON.stringify({
  sessionId,
  code: created.json?.orderId ? `QV-CONF${String(Date.now()).slice(-4)}` : "QV-X",
  items: [{ gtin: "7612345678901", qty: 1, unitCents: 8990 }],
  discountCents: 450,
  expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
})));
report("idempotent on sessionId", again.json?.orderId === orderId, `orderId=${again.json?.orderId}`);

const got = await call("GET", `${ordersPath}/${encodeURIComponent(orderId)}`);
report("get order → pending", got.status === 200 && got.json?.status === "pending", `status=${got.json?.status}`);

const list = await call("GET", `${ordersPath}?code=QV-&since=${encodeURIComponent(new Date(Date.now() - 60_000).toISOString())}`);
const listed = Array.isArray(list.json) && list.json.some((row) => row.orderId === orderId);
report("list coded orders", list.status === 200 && listed, `rows=${Array.isArray(list.json) ? list.json.length : "n/a"}`);

const del = await call("DELETE", `${ordersPath}/${encodeURIComponent(orderId)}`);
report("delete order", del.status === 204 || del.status === 200, `HTTP ${del.status}`);

const gone = await call("GET", `${ordersPath}/${encodeURIComponent(orderId)}`);
report("order gone after delete", gone.status === 404, `HTTP ${gone.status}`);

console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
