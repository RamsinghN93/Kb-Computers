/**
 * KB Computers – Cloudflare Worker + D1
 * -------------------------------------
 * Endpoints:
 *   GET  /products              → list products with live stock
 *   POST /stock/reserve         → decrease stock when user sends WhatsApp list
 *   POST /repairs               → create repair call
 *   GET  /repairs/track         → track repair by id + phone
 *
 * Security:
 *   - Strict input cleaning
 *   - Server-side validation
 *   - CORS restricted to your domains
 *   - No secrets in the frontend
 */

export interface Env {
  DB: D1Database;
}

// ---------- CONFIG ----------
// Add your GitHub Pages domain and local testing origins here
const ALLOWED_ORIGINS = [
  "https://ramsinghn93.github.io/Kb-Computers/",         // ← change this
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "http://localhost:8787",
];

const MAX_NAME = 80;
const MAX_TEXT = 1000;
const MAX_ID = 32;

// ---------- HELPERS ----------
function corsHeaders(origin: string | null): HeadersInit {
  const allow = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function json(data: unknown, status = 200, origin: string | null = null): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(origin),
    },
  });
}

function cleanText(value: unknown, max = MAX_TEXT): string {
  return String(value ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, max);
}

function cleanPhone(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "").slice(-10);
}

function validIndianMobile(phone: string): boolean {
  return /^[6-9]\d{9}$/.test(phone);
}

function makeId(): string {
  return "KB-" + crypto.randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase();
}

// ---------- MAIN ----------
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin");
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    try {
      // ========== GET /products ==========
      if (request.method === "GET" && url.pathname === "/products") {
        const { results } = await env.DB.prepare(
          "SELECT id, name, price, icon, tag, stock FROM products ORDER BY id"
        ).all();
        return json(results ?? [], 200, origin);
      }

      // ========== POST /stock/reserve ==========
      // Body: { items: [ { id: "p1", qty: 1 }, ... ] }
      // Decreases stock only if enough is available
      if (request.method === "POST" && url.pathname === "/stock/reserve") {
        let body: any;
        try {
          body = await request.json();
        } catch {
          return json({ error: "Invalid JSON" }, 400, origin);
        }

        const items = Array.isArray(body?.items) ? body.items : [];
        if (items.length === 0) {
          return json({ error: "No items provided" }, 400, origin);
        }

        // Validate and normalise
        const cleanItems: { id: string; qty: number }[] = [];
        for (const item of items) {
          const id = cleanText(item?.id, 40);
          const qty = Math.min(99, Math.max(1, Math.floor(Number(item?.qty) || 0)));
          if (!id || qty < 1) continue;
          cleanItems.push({ id, qty });
        }

        if (cleanItems.length === 0) {
          return json({ error: "No valid items" }, 400, origin);
        }

        // Check stock availability first
        for (const item of cleanItems) {
          const row = await env.DB.prepare(
            "SELECT stock FROM products WHERE id = ?"
          ).bind(item.id).first<{ stock: number }>();

          if (!row || row.stock < item.qty) {
            return json({
              error: "Not enough stock",
              productId: item.id,
              available: row?.stock ?? 0,
              requested: item.qty,
            }, 409, origin);
          }
        }

        // Decrement stock
        for (const item of cleanItems) {
          await env.DB.prepare(
            "UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?"
          ).bind(item.qty, item.id, item.qty).run();
        }

        return json({ success: true, message: "Stock reserved" }, 200, origin);
      }

      // ========== POST /repairs ==========
      if (request.method === "POST" && url.pathname === "/repairs") {
        let body: any;
        try {
          body = await request.json();
        } catch {
          return json({ error: "Invalid JSON" }, 400, origin);
        }

        const name = cleanText(body.name, MAX_NAME);
        const phone = cleanPhone(body.phone);
        const device = cleanText(body.device, 120);
        const problem = cleanText(body.problem, MAX_TEXT);
        const priority = body.priority === "Urgent" ? "Urgent" : "Normal";

        if (name.length < 2) return json({ error: "Invalid name" }, 400, origin);
        if (!validIndianMobile(phone)) return json({ error: "Invalid mobile number" }, 400, origin);
        if (device.length < 2) return json({ error: "Invalid device" }, 400, origin);
        if (problem.length < 3) return json({ error: "Please describe the problem" }, 400, origin);

        const id = makeId();
        const created = new Date().toISOString();

        await env.DB.prepare(
          `INSERT INTO repairs (id, name, phone, device, priority, problem, status, created)
           VALUES (?, ?, ?, ?, ?, ?, 'Awaiting Accessories', ?)`
        ).bind(id, name, phone, device, priority, problem, created).run();

        return json({
          id,
          status: "Awaiting Accessories",
          created,
          message: "Repair call created. Bring the device to the shop.",
        }, 201, origin);
      }

      // ========== GET /repairs/track ==========
      if (request.method === "GET" && url.pathname === "/repairs/track") {
        const id = cleanText(url.searchParams.get("id"), MAX_ID).toUpperCase();
        const phone = cleanPhone(url.searchParams.get("phone"));

        if (!id || !validIndianMobile(phone)) {
          return json({ error: "Enter valid call number and 10-digit mobile" }, 400, origin);
        }

        const row = await env.DB.prepare(
          `SELECT id, name, device, status, created, priority
           FROM repairs WHERE id = ? AND phone = ?`
        ).bind(id, phone).first();

        if (!row) {
          return json({ error: "No matching repair call found" }, 404, origin);
        }

        return json(row, 200, origin);
      }

      return json({ error: "Not found" }, 404, origin);
    } catch (err) {
      console.error(err);
      return json({ error: "Server error" }, 500, origin);
    }
  },
};
