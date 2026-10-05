# KB Computers – Live Stock + Repair Call System

Complete guide for the KB Computers website with shared live stock, private cart, repair call tracking, and secure admin panel.

---

## Overview

| Feature                    | Storage                  | Visibility                     |
|---------------------------|--------------------------|--------------------------------|
| Product Stock             | Cloudflare D1            | Shared live for everyone       |
| Shop Visit List (Cart)    | Browser (localStorage)   | Private per user               |
| Repair Calls              | Cloudflare D1            | Stored on server               |
| Admin Panel               | Password protected       | Only admin                     |

---

## Important Links

- **Website**: https://ramsinghn93.github.io/Kb-Computers
- **Admin Panel**: https://ramsinghn93.github.io/Kb-Computers/admin.html
- **API (Worker)**: https://kb-computers-api.nramsingh93.workers.dev
- **Admin Password**: `Kb@dmin2026!`

---

## System Architecture

- **Frontend**: GitHub Pages (static HTML/JS)
- **Backend**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Cart**: Stored only in user's browser (localStorage)
- **Stock & Repairs**: Stored in Cloudflare D1 (shared)

### How Stock Sharing Works

1. User adds products to cart (private – only in their browser)
2. User clicks **“Send List on WhatsApp”**
3. Frontend calls the Worker → `/stock/reserve`
4. Worker checks stock and reduces it in D1
5. Stock is now updated for **all users**
6. WhatsApp opens with the product list
7. Cart is cleared only in that user’s browser

---

## Repair Call Status (Color Coded)

When a customer tracks their repair, they see a colored status:

| Status                  | Color     | Meaning                                      |
|-------------------------|-----------|----------------------------------------------|
| Awaiting Accessories    | Orange    | Waiting for customer to bring the device     |
| In Progress             | Blue      | Repair work has started                      |
| Ready for Pickup        | Green     | Device is ready for collection               |
| Completed               | Gray      | Repair finished and closed                   |
| Cancelled               | Red       | Cancelled (reason is shown to customer)      |

**Important:**
- Status becomes **Completed** only when work is fully finished.
- If you choose **Cancelled**, the system will ask for a **reason**.
- The cancellation reason is visible to the customer when they track the call.

---

## Admin Panel Usage

### Login
1. Open: https://ramsinghn93.github.io/Kb-Computers/admin.html
2. Enter password: `Kb@dmin2026!`

### What Admin Can Do

**Products:**
- Add new product
- Edit product (Name, Price, Icon/Emoji, Tag, Stock)
- Delete product
- Update stock anytime

**Repair Calls:**
- View all repair calls
- Change status:
  - Awaiting Accessories
  - In Progress
  - Ready for Pickup
  - Completed
  - Cancelled (requires reason)

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
├── index.html          # Main website (with colored status tracking)
├── admin.html          # Admin panel
├── index.ts            # Cloudflare Worker (backend)
├── wrangler.toml       # Worker configuration
├── schema.sql          # Database structure
└── README.md           # This file
```

---

## How to Update / Redeploy in Future

### Update Backend (Worker)

1. Open GitHub repository: **Kb-Computers**
2. Edit the file `index.ts`
3. Commit the changes
4. Cloudflare will automatically redeploy the Worker

### Update Frontend or Admin

1. Edit `index.html` or `admin.html` on GitHub
2. Commit the changes
3. GitHub Pages updates automatically

---

## Database Management (Advanced)

If you need to run SQL commands manually:

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Open **D1** → select `kb-computers-db`
3. Open **Console**

### Useful SQL Commands

```sql
-- View all products
SELECT * FROM products;

-- View all repair calls
SELECT * FROM repairs ORDER BY created DESC;

-- Manually change stock
UPDATE products SET stock = 10 WHERE id = 'p1';

-- Change repair status
UPDATE repairs SET status = 'Completed' WHERE id = 'KB-XXXXXXXXXX';

-- See cancelled repairs with reason
SELECT id, name, status, problem FROM repairs WHERE status = 'Cancelled';
```

---

## Security Features (Zero Vulnerable Design)

- Cart data never leaves the user’s browser
- Stock and repairs are stored only on Cloudflare
- Admin password is checked **only on the server**
- All user inputs are cleaned and validated on the Worker
- CORS is restricted to your domain only
- No sensitive data is stored in frontend code
- Cancellation requires a proper reason
- Status colors help customers track progress clearly

---

## Changing Admin Password

1. Open `index.ts` in GitHub
2. Find this line:

```ts
const ADMIN_PASSWORD = "Kb@dmin2026!";
```

3. Change the password
4. Commit the file
5. Wait for Cloudflare to redeploy

---

## Troubleshooting

| Problem                        | Solution                                      |
|-------------------------------|-----------------------------------------------|
| Products not loading          | Check CORS in `index.ts` (ALLOWED_ORIGINS)    |
| Admin login fails             | Make sure password matches exactly            |
| Stock not decreasing          | Check browser console for errors              |
| Status shows wrong color      | Hard refresh the page                         |
| Cancel without reason         | System will block it and ask for reason       |
| Changes not reflecting        | Hard refresh (close tab & reopen)             |
| Worker not updating           | Wait 30–60 seconds after committing on GitHub |

---

## Current Status List (Final)

These are the only valid statuses:

- `Awaiting Accessories`
- `In Progress`
- `Ready for Pickup`
- `Completed`
- `Cancelled`

---

## Quick Reference Prompt

```
KB Computers System:
- Frontend: GitHub Pages (https://ramsinghn93.github.io/Kb-Computers)
- Backend: Cloudflare Worker + D1
- Worker URL: https://kb-computers-api.nramsingh93.workers.dev
- Admin: /admin.html (Password: Kb@dmin2026!)
- Cart: localStorage (private)
- Stock & Repairs: Cloudflare D1 (shared)
- Status colors: Orange (Awaiting), Blue (In Progress), Green (Ready), Gray (Completed), Red (Cancelled)
- Cancel requires reason
- Admin can: Add/Edit/Delete products, change stock, change repair status
```

---

**Created for**: RamsinghN93  
**Last Updated**: October 2026
