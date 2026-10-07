# KB Computers – Live Stock + Repair Call System

Complete guide for the KB Computers website with shared live stock, private cart, repair call tracking, and secure admin/staff panels.

---

## Overview

| Feature                    | Storage                  | Visibility                     |
|---------------------------|--------------------------|--------------------------------|
| Product Stock             | Cloudflare D1            | Shared live for everyone       |
| Shop Visit List (Cart)    | Browser (localStorage)   | Private per user               |
| Repair Calls              | Cloudflare D1            | Stored on server               |
| Admin Panel               | Server-side password     | Only admin                     |
| Staff Panel               | Server-side password     | Staff (status updates only)    |

---

## Important Links

- **Website**: https://ramsinghn93.github.io/Kb-Computers
- **Admin Panel**: https://ramsinghn93.github.io/Kb-Computers/admin.html
- **Staff Panel**: https://ramsinghn93.github.io/Kb-Computers/staff.html
- **API (Worker)**: https://kb-computers-api.nramsingh93.workers.dev

> **Security note:** Passwords are **never** stored in source code or this README.  
> They live only as Cloudflare Worker secrets.

---

## System Architecture

- **Frontend**: GitHub Pages (static HTML/JS)
- **Backend**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Cart**: Stored only in user's browser (localStorage)
- **Stock & Repairs**: Stored in Cloudflare D1 (shared)
- **Auth**: Passwords checked only on the Worker (header-based, timing-safe compare)

### How Stock Sharing Works

1. User adds products to cart (private – only in their browser)
2. User clicks **“Send List on WhatsApp”**
3. Frontend calls the Worker → `/stock/reserve`
4. Worker checks stock and reduces it in D1 (with stock >= guard)
5. Stock is now updated for **all users**
6. WhatsApp opens with the product list
7. Cart is cleared only in that user’s browser

---

## Repair Call Status (Color Coded)

| Status                  | Color     | Meaning                                      |
|-------------------------|-----------|----------------------------------------------|
| Awaiting Accessories    | Orange    | Waiting for customer to bring the device     |
| In Progress             | Blue      | Repair work has started                      |
| Ready for Pickup        | Green     | Device is ready for collection               |
| Completed               | Gray      | Repair finished and closed                   |
| Cancelled               | Red       | Cancelled (reason is shown to customer)      |

- Status becomes **Completed** only when work is fully finished.
- If you choose **Cancelled**, the system requires a **reason**.
- The cancellation reason is visible to the customer when they track the call.

---

## Security Features (Zero-Vulnerable Design)

| Protection                        | How it works                                      |
|-----------------------------------|---------------------------------------------------|
| No passwords in source / frontend | Stored only as Cloudflare secrets                 |
| Timing-safe password compare      | Prevents timing attacks                           |
| Server-only auth                  | Admin/Staff checks happen only in the Worker      |
| Input sanitization                | All text cleaned of control chars + length limited|
| Parameterized SQL                 | No string concatenation for values                |
| CORS lockdown                     | Only your GitHub Pages + localhost origins        |
| CSP on frontend                   | Restricts scripts, frames, connections            |
| Private cart                      | Never leaves the user’s browser                   |
| Stock race guard                  | `UPDATE … AND stock >= ?` + change count check   |
| Rate-friendly limits              | Max items per reserve, length caps                |
| Track requires both ID + phone    | Cannot enumerate repairs by ID alone              |

---

## First-Time / Password Setup (Required)

Passwords must be set as **Worker secrets** (never commit them):

```bash
# In the folder that contains wrangler.toml
npx wrangler secret put ADMIN_PASSWORD
# type your strong admin password when prompted

npx wrangler secret put STAFF_PASSWORD
# type your strong staff password when prompted
```

After setting secrets, redeploy the Worker (or let GitHub/CI redeploy).

To change a password later, just run the same `wrangler secret put` command again.

---

## Database Migration (Existing D1)

If your D1 database was created with the old schema (missing columns), run this once in the Cloudflare D1 Console:

```sql
ALTER TABLE repairs ADD COLUMN updated_by TEXT DEFAULT '';
ALTER TABLE repairs ADD COLUMN updated_at TEXT DEFAULT '';
```

(If the columns already exist, the statements will error harmlessly – that is fine.)

New installs: just apply the full `schema.sql`.

---

## Admin Panel Usage

1. Open: https://ramsinghn93.github.io/Kb-Computers/admin.html
2. Enter the **ADMIN_PASSWORD** you set as a secret

**Admin can:**

- Add / edit / delete products
- Update stock
- View all repair calls
- Change repair status (including Cancelled + reason)
- CSV export / import of products

---

## Staff Panel Usage

1. Open: https://ramsinghn93.github.io/Kb-Computers/staff.html
2. Enter the **STAFF_PASSWORD** you set as a secret
3. Enter your name when updating status

Staff can view repairs and update status only (cannot manage products).

---

## How Customers Use the Site

1. Browse products with **live stock**
2. Add items to **Shop Visit List** (private cart)
3. Click **Send List on WhatsApp** → stock is reduced for everyone
4. Optionally create a **Repair Call**
5. Track repair later using **Call ID + Mobile number**
6. See colored status and messages

---

## File Structure

```
Kb-Computers/
├── index.html          # Main website
├── admin.html          # Admin panel
├── staff.html          # Staff panel
├── index.ts            # Cloudflare Worker (backend)
├── wrangler.toml       # Worker configuration
├── schema.sql          # Database structure
└── KB-Computers-README.md
```

---

## How to Update / Redeploy

### Backend (Worker)

1. Edit `index.ts` on GitHub (or locally + push)
2. Cloudflare redeploys the Worker
3. Secrets stay in place (they are not overwritten by code)

### Frontend

1. Edit `index.html` / `admin.html` / `staff.html`
2. Commit → GitHub Pages updates automatically

---

## Troubleshooting

| Problem                        | Solution                                              |
|-------------------------------|-------------------------------------------------------|
| Products not loading          | Check CORS `ALLOWED_ORIGINS` in `index.ts`            |
| Admin / Staff login fails     | Confirm secrets are set: `wrangler secret list`       |
| “Unauthorized” after redeploy | Secrets are account-level; re-put if needed           |
| Stock not decreasing          | Browser console errors; check stock race message      |
| updated_by / updated_at empty | Run the ALTER TABLE migration above                   |
| Worker not updating           | Wait 30–60 seconds after commit                       |

---

## Valid Statuses

- `Awaiting Accessories`
- `In Progress`
- `Ready for Pickup`
- `Completed`
- `Cancelled`

---

**Created for**: RamsinghN93  
**Last Updated**: October 2026  
**Security focus**: secrets-only passwords, sanitized inputs, parameterized SQL, CORS + CSP
