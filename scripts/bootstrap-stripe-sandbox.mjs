import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY?.trim();
if (!key) throw new Error("STRIPE_SECRET_KEY fehlt");
if (!key.startsWith("sk_test_")) {
  throw new Error("ABBRUCH: Dieser Bootstrap akzeptiert ausschließlich sk_test_-Schlüssel. Live-Stripe wird nicht verändert.");
}

const stripe = new Stripe(key);

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
  const products = await stripe.products.list({ active: true, limit: 100 });
  let product = products.data.find((item) => item.metadata?.navopass_plan === plan.code);

  if (!product) {
    product = await stripe.products.create({
      name: plan.name,
      description: plan.description,
      metadata: {
        app: "navopass",
        navopass_plan: plan.code,
      },
    });
    console.log(`Produkt erstellt: ${plan.name} -> ${product.id}`);
  } else {
    console.log(`Produkt vorhanden: ${plan.name} -> ${product.id}`);
  }

  if (product.livemode) throw new Error(`ABBRUCH: Produkt ${product.id} ist live. Sandbox-Schutz ausgelöst.`);
  return product;
}

async function findOrCreatePrice(product, plan, interval, amount) {
  const prices = await stripe.prices.list({ product: product.id, active: true, limit: 100 });
  const stripeInterval = interval === "monthly" ? "month" : "year";
  let price = prices.data.find((item) =>
    item.currency === "eur" &&
    item.unit_amount === amount &&
    item.recurring?.interval === stripeInterval &&
    item.metadata?.navopass_interval === interval &&
    item.metadata?.navopass_plan === plan.code
  );

  if (!price) {
    price = await stripe.prices.create({
      product: product.id,
      currency: "eur",
      unit_amount: amount,
      recurring: { interval: stripeInterval },
      metadata: {
        app: "navopass",
        navopass_plan: plan.code,
        navopass_interval: interval,
      },
    });
    console.log(`Preis erstellt: ${plan.name} ${interval} -> ${price.id}`);
  } else {
    console.log(`Preis vorhanden: ${plan.name} ${interval} -> ${price.id}`);
  }

  if (price.livemode) throw new Error(`ABBRUCH: Preis ${price.id} ist live. Sandbox-Schutz ausgelöst.`);
  return price;
}

const output = {};
for (const plan of plans) {
  const product = await findOrCreateProduct(plan);
  const monthly = await findOrCreatePrice(product, plan, "monthly", plan.monthly);
  const yearly = await findOrCreatePrice(product, plan, "yearly", plan.yearly);
  output[`STRIPE_PRICE_${plan.code}_MONTHLY`] = monthly.id;
  output[`STRIPE_PRICE_${plan.code}_YEARLY`] = yearly.id;
}

console.log("\n=== NavoPass Portainer Environment ===");
for (const [name, value] of Object.entries(output)) console.log(`${name}=${value}`);
console.log("\nSandbox-Bootstrap abgeschlossen. Keine Live-Daten wurden verändert.");
