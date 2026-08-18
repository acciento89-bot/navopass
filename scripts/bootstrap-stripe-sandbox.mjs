const key = process.env.STRIPE_SECRET_KEY?.trim();
if (!key) throw new Error("STRIPE_SECRET_KEY fehlt");
if (!key.startsWith("sk_test_")) {
  throw new Error("ABBRUCH: Dieser Bootstrap akzeptiert ausschließlich sk_test_-Schlüssel. Live-Stripe wird nicht verändert.");
}

const APP_URL = (process.env.APP_URL || "https://navopass.de").replace(/\/$/, "");
const WEBHOOK_URL = `${APP_URL}/api/stripe/webhook`;
const API_BASE = "https://api.stripe.com/v1";

function appendParams(target, params) {
  for (const [name, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const item of value) target.append(name, String(item));
    } else {
      target.append(name, String(value));
    }
  }
}

async function stripeRequest(method, path, params = {}, idempotencyKey) {
  const url = new URL(`${API_BASE}${path}`);
  const headers = {
    Authorization: `Bearer ${key}`,
  };

  const options = { method, headers };
  if (method === "GET") {
    appendParams(url.searchParams, params);
  } else {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
    const body = new URLSearchParams();
    appendParams(body, params);
    options.body = body;
  }

  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.message || `${response.status} ${response.statusText}`;
    throw new Error(`Stripe API Fehler (${method} ${path}): ${message}`);
  }
  return payload;
}

const plans = [
  {
    code: "PLUS",
    name: "NavoPass Plus",
    description: "Für private Nutzer mit vielen Geräten, Fahrzeugen und Dokumenten.",
    monthly: 799,
    yearly: 7900,
  },
  {
    code: "FAMILY",
    name: "NavoPass Family",
    description: "Für Familien und Haushalte, die Dinge gemeinsam verwalten.",
    monthly: 1299,
    yearly: 12900,
  },
  {
    code: "BUSINESS",
    name: "NavoPass Business",
    description: "Für Teams und kleinere Unternehmen mit Betriebsmitteln und Wartungen.",
    monthly: 3999,
    yearly: 39900,
  },
];

async function findOrCreateProduct(plan) {
  const products = await stripeRequest("GET", "/products", { active: true, limit: 100 });
  let product = products.data?.find((item) => item.metadata?.navopass_plan === plan.code);

  if (!product) {
    product = await stripeRequest(
      "POST",
      "/products",
      {
        name: plan.name,
        description: plan.description,
        "metadata[app]": "navopass",
        "metadata[navopass_plan]": plan.code,
      },
      `navopass-sandbox-product-${plan.code.toLowerCase()}`
    );
    console.log(`Produkt erstellt: ${plan.name} -> ${product.id}`);
  } else {
    console.log(`Produkt vorhanden: ${plan.name} -> ${product.id}`);
  }

  if (product.livemode) throw new Error(`ABBRUCH: Produkt ${product.id} ist live. Sandbox-Schutz ausgelöst.`);
  return product;
}

async function findOrCreatePrice(product, plan, interval, amount) {
  const prices = await stripeRequest("GET", "/prices", { product: product.id, active: true, limit: 100 });
  const stripeInterval = interval === "monthly" ? "month" : "year";
  let price = prices.data?.find((item) =>
    item.currency === "eur" &&
    item.unit_amount === amount &&
    item.recurring?.interval === stripeInterval &&
    item.metadata?.navopass_interval === interval &&
    item.metadata?.navopass_plan === plan.code
  );

  if (!price) {
    price = await stripeRequest(
      "POST",
      "/prices",
      {
        product: product.id,
        currency: "eur",
        unit_amount: amount,
        "recurring[interval]": stripeInterval,
        "metadata[app]": "navopass",
        "metadata[navopass_plan]": plan.code,
        "metadata[navopass_interval]": interval,
      },
      `navopass-sandbox-price-${plan.code.toLowerCase()}-${interval}`
    );
    console.log(`Preis erstellt: ${plan.name} ${interval} -> ${price.id}`);
  } else {
    console.log(`Preis vorhanden: ${plan.name} ${interval} -> ${price.id}`);
  }

  if (price.livemode) throw new Error(`ABBRUCH: Preis ${price.id} ist live. Sandbox-Schutz ausgelöst.`);
  return price;
}

async function findOrCreateWebhook() {
  const endpoints = await stripeRequest("GET", "/webhook_endpoints", { limit: 100 });
  const existing = endpoints.data?.find((item) => item.url === WEBHOOK_URL && item.status !== "disabled");
  if (existing) {
    if (existing.livemode) throw new Error(`ABBRUCH: Webhook ${existing.id} ist live. Sandbox-Schutz ausgelöst.`);
    console.log(`Webhook vorhanden: ${existing.id} -> ${WEBHOOK_URL}`);
    return { endpoint: existing, secret: null };
  }

  const endpoint = await stripeRequest(
    "POST",
    "/webhook_endpoints",
    {
      url: WEBHOOK_URL,
      description: "NavoPass Sandbox Billing Webhook",
      "enabled_events[]": [
        "checkout.session.completed",
        "customer.subscription.created",
        "customer.subscription.updated",
        "customer.subscription.deleted",
      ],
      "metadata[app]": "navopass",
      "metadata[environment]": "sandbox",
    },
    "navopass-sandbox-webhook-v1"
  );

  if (endpoint.livemode) throw new Error(`ABBRUCH: Webhook ${endpoint.id} ist live. Sandbox-Schutz ausgelöst.`);
  console.log(`Webhook erstellt: ${endpoint.id} -> ${WEBHOOK_URL}`);
  return { endpoint, secret: endpoint.secret || null };
}

const output = {};
for (const plan of plans) {
  const product = await findOrCreateProduct(plan);
  const monthly = await findOrCreatePrice(product, plan, "monthly", plan.monthly);
  const yearly = await findOrCreatePrice(product, plan, "yearly", plan.yearly);
  output[`STRIPE_PRICE_${plan.code}_MONTHLY`] = monthly.id;
  output[`STRIPE_PRICE_${plan.code}_YEARLY`] = yearly.id;
}

const webhook = await findOrCreateWebhook();

console.log("\n=== NavoPass Portainer Environment ===");
for (const [name, value] of Object.entries(output)) console.log(`${name}=${value}`);
if (webhook.secret) {
  console.log(`STRIPE_WEBHOOK_SECRET=${webhook.secret}`);
} else {
  console.log("STRIPE_WEBHOOK_SECRET=<Webhook existiert bereits; Secret wird von Stripe nur beim Erstellen angezeigt>");
}
console.log(`STRIPE_WEBHOOK_ENDPOINT_ID=${webhook.endpoint.id}`);
console.log("\nSandbox-Bootstrap abgeschlossen. Keine Live-Daten wurden verändert.");
