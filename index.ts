/**
 * KB Computers – Cloudflare Worker + D1
 * Admin + Staff roles
 */

export interface Env {
  DB: D1Database;
}

const ALLOWED_ORIGINS = [
  "https://ramsinghn93.github.io",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
];

const ADMIN_PASSWORD = "Kb@dmin2026!1";
const STAFF_PASSWORD = "KbStaff123rjpm1";

const MAX_NAME = 80;
const MAX_TEXT = 1000;
const MAX_ID = 32;

function corsHeaders(origin: string | null): HeadersInit {
  const allow = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Admin-Password, X-Staff-Password",
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

function isAdmin(request: Request): boolean {
  return (request.headers.get("X-Admin-Password") || "") === ADMIN_PASSWORD;
}

function isStaff(request: Request): boolean {
  return (request.headers.get("X-Staff-Password") || "") === STAFF_PASSWORD;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin");
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    try {
      if (request.method === "GET" && url.pathname === "/products") {
        const { results } = await env.DB.prepare(
          "SELECT id, name, price, icon, tag, stock FROM products ORDER BY id"
        ).all();
        return json(results ?? [], 200, origin);
      }

      if (request.method === "POST" && url.pathname === "/stock/reserve") {
        let body: any;
        try { body = await request.json(); } catch {
          return json({ error: "Invalid JSON" }, 400, origin);
        }
        const items = Array.isArray(body?.items) ? body.items : [];
        if (items.length === 0) return json({ error: "No items provided" }, 400, origin);
        const cleanItems: { id: string; qty: number }[] = [];
        for (const item of items) {
          const id = cleanText(item?.id, 40);
          const qty = Math.min(99, Math.max(1, Math.floor(Number(item?.qty) || 0)));
          if (!id || qty < 1) continue;
          cleanItems.push({ id, qty });
        }
        if (cleanItems.length === 0) return json({ error: "No valid items" }, 400, origin);
        for (const item of cleanItems) {
          const row = await env.DB.prepare("SELECT stock FROM products WHERE id = ?")
            .bind(item.id).first<{ stock: number }>();
          if (!row || row.stock < item.qty) {
            return json({ error: "Not enough stock", productId: item.id, available: row?.stock ?? 0, requested: item.qty }, 409, origin);
          }
        }
        for (const item of cleanItems) {
          await env.DB.prepare("UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?")
            .bind(item.qty, item.id, item.qty).run();
        }
        return json({ success: true, message: "Stock reserved" }, 200, origin);
      }

      if (request.method === "POST" && url.pathname === "/repairs") {
        let body: any;
        try { body = await request.json(); } catch {
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
        return json({ id, status: "Awaiting Accessories", created, message: "Repair call created. Bring the device to the shop." }, 201, origin);
      }

      if (request.method === "GET" && url.pathname === "/repairs/track") {
        const id = cleanText(url.searchParams.get("id"), MAX_ID).toUpperCase();
        const phone = cleanPhone(url.searchParams.get("phone"));
        if (!id || !validIndianMobile(phone)) {
          return json({ error: "Enter valid call number and 10-digit mobile" }, 400, origin);
        }
        const row = await env.DB.prepare(
          `SELECT id, name, device, status, created, priority, problem FROM repairs WHERE id = ? AND phone = ?`
        ).bind(id, phone).first();
        if (!row) return json({ error: "No matching repair call found" }, 404, origin);
        return json(row, 200, origin);
      }

      if (request.method === "GET" && url.pathname === "/admin/repairs") {
        if (!isAdmin(request)) return json({ error: "Unauthorized" }, 401, origin);
        const { results } = await env.DB.prepare("SELECT * FROM repairs ORDER BY created DESC").all();
        return json(results ?? [], 200, origin);
      }

      if (request.method === "POST" && (url.pathname === "/admin/status" || url.pathname === "/staff/status")) {
        const isStaffReq = url.pathname === "/staff/status";
        if (isStaffReq && !isStaff(request)) return json({ error: "Unauthorized" }, 401, origin);
        if (!isStaffReq && !isAdmin(request)) return json({ error: "Unauthorized" }, 401, origin);

        let body: any;
        try { body = await request.json(); } catch {
          return json({ error: "Invalid JSON" }, 400, origin);
        }
        const id = cleanText(body.id, MAX_ID).toUpperCase();
        const status = cleanText(body.status, 50);
        const reason = cleanText(body.reason, 300);
        const staffName = cleanText(body.staffName, 60);
        const allowed = ["Awaiting Accessories", "In Progress", "Ready for Pickup", "Completed", "Cancelled"];
        if (!id || !allowed.includes(status)) return json({ error: "Invalid id or status" }, 400, origin);
        if (status === "Cancelled" && reason.length < 3) return json({ error: "Please enter a reason for cancellation" }, 400, origin);
        if (isStaffReq && staffName.length < 2) return json({ error: "Please enter your name" }, 400, origin);

        const updatedBy = isStaffReq ? staffName : (staffName || "Admin");
        const updatedAt = new Date().toISOString();

        try {
          if (status === "Cancelled" && reason) {
            await env.DB.prepare(
              `UPDATE repairs SET status = ?, problem = problem || ' | Cancelled: ' || ?, updated_by = ?, updated_at = ? WHERE id = ?`
            ).bind(status, reason, updatedBy, updatedAt, id).run();
          } else {
            await env.DB.prepare(
              `UPDATE repairs SET status = ?, updated_by = ?, updated_at = ? WHERE id = ?`
            ).bind(status, updatedBy, updatedAt, id).run();
          }
        } catch (e) {
          if (status === "Cancelled" && reason) {
            await env.DB.prepare(
              `UPDATE repairs SET status = ?, problem = problem || ' | Cancelled: ' || ? || ' (by ' || ? || ')' WHERE id = ?`
            ).bind(status, reason, updatedBy, id).run();
          } else {
            await env.DB.prepare(
              `UPDATE repairs SET status = ?, problem = problem || ' | Updated by: ' || ? WHERE id = ?`
            ).bind(status, updatedBy, id).run();
          }
        }
        return json({ success: true, message: "Status updated", updatedBy }, 200, origin);
      }

      if (request.method === "GET" && url.pathname === "/staff/repairs") {
        if (!isStaff(request)) return json({ error: "Unauthorized" }, 401, origin);
        const { results } = await env.DB.prepare(
          "SELECT id, name, phone, device, priority, problem, status, created, updated_by, updated_at FROM repairs ORDER BY created DESC"
        ).all();
        return json(results ?? [], 200, origin);
      }

      if (request.method === "GET" && url.pathname === "/admin/products") {
        if (!isAdmin(request)) return json({ error: "Unauthorized" }, 401, origin);
        const { results } = await env.DB.prepare(
          "SELECT id, name, price, icon, tag, stock FROM products ORDER BY id"
        ).all();
        return json(results ?? [], 200, origin);
      }

      if (request.method === "POST" && url.pathname === "/admin/product") {
        if (!isAdmin(request)) return json({ error: "Unauthorized" }, 401, origin);
        let body: any;
        try { body = await request.json(); } catch {
          return json({ error: "Invalid JSON" }, 400, origin);
        }
        const id = cleanText(body.id, 40);
        const name = cleanText(body.name, 100);
        const price = Math.max(0, Math.min(999999, Math.floor(Number(body.price) || 0)));
        const icon = cleanText(body.icon, 20);
        const tag = cleanText(body.tag, 30);
        const stock = Math.max(0, Math.min(9999, Math.floor(Number(body.stock) || 0)));
        if (!id || id.length < 2) return json({ error: "Invalid product id" }, 400, origin);
        if (name.length < 2) return json({ error: "Invalid product name" }, 400, origin);
        const existing = await env.DB.prepare("SELECT id FROM products WHERE id = ?").bind(id).first();
        if (existing) {
          await env.DB.prepare(`UPDATE products SET name = ?, price = ?, icon = ?, tag = ?, stock = ? WHERE id = ?`)
            .bind(name, price, icon, tag, stock, id).run();
          return json({ success: true, message: "Product updated", id }, 200, origin);
        } else {
          await env.DB.prepare(`INSERT INTO products (id, name, price, icon, tag, stock) VALUES (?, ?, ?, ?, ?, ?)`)
            .bind(id, name, price, icon, tag, stock).run();
          return json({ success: true, message: "Product added", id }, 201, origin);
        }
      }

      if (request.method === "POST" && url.pathname === "/admin/product/delete") {
        if (!isAdmin(request)) return json({ error: "Unauthorized" }, 401, origin);
        let body: any;
        try { body = await request.json(); } catch {
          return json({ error: "Invalid JSON" }, 400, origin);
        }
        const id = cleanText(body.id, 40);
        if (!id) return json({ error: "Invalid product id" }, 400, origin);
        const result = await env.DB.prepare("DELETE FROM products WHERE id = ?").bind(id).run();
        if (result.meta.changes === 0) return json({ error: "Product not found" }, 404, origin);
        return json({ success: true, message: "Product deleted" }, 200, origin);
      }

      return json({ error: "Not found" }, 404, origin);
    } catch (err) {
      console.error(err);
      return json({ error: "Server error" }, 500, origin);
    }
  },
};
