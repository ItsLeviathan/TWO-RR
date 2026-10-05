# TWO RR — Coffee Shop Website & POS

A single Next.js application with two experiences that share the TWO RR brand:

- **Public website**: a scroll-driven **3D café experience** on the home page, plus about, digital menu, product options, cart, checkout, order status, gallery and visit/contact pages.
- **Staff system** (`/admin`): dashboard, touch-friendly POS, orders, products, categories, inventory, reports, gallery, users, settings and thermal-receipt printing. Owners and cashiers each see only what their role allows (see [Users & roles](#users--roles)).

Stack: Next.js 16 (App Router, Server Actions) · React 19 · TypeScript · Tailwind CSS 4 · Three.js (+ CC0 Poly Haven assets) · Drizzle ORM · PostgreSQL · Vercel Blob.

---

## Quick start (local)

```bash
npm install
cp .env.example .env.local   # then set AUTH_SECRET, OWNER_EMAIL and OWNER_PASSWORD
npm run db:setup             # creates the local database, owner account and a SAMPLE menu
npm run dev                  # http://localhost:3000  ·  staff area: http://localhost:3000/admin
```

Local development needs **no database server**. When `DATABASE_URL` is empty, the app uses an embedded Postgres (PGlite) stored in `.data/pglite/`. You sign in with the `OWNER_EMAIL` / `OWNER_PASSWORD` from `.env.local`.

> Stop `npm run dev` before running `db:*` scripts against the local database. The embedded database allows only one process at a time.

The sample menu exists so you can try everything immediately. It's ordinary data, so edit or delete it under **Admin → Products / Categories**. To start completely empty, delete `.data/pglite/` and run `npm run db:migrate && npm run db:seed` (no `--sample`).

### Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js development / production build / production server |
| `npm run db:setup` | Migrate + seed owner, settings and a sample menu (local) |
| `npm run db:migrate` | Apply SQL migrations in `drizzle/` to `DATABASE_URL` (or local PGlite) |
| `npm run db:seed` | Create settings row + owner account if missing (idempotent) |
| `npm run db:generate` | Generate a new migration after changing `src/db/schema.ts` |
| `npm run test:integrity` | Order-engine tests on a throwaway DB (pricing, duplicates, stock races, payments, role rules) |
| `npm run assets:3d` | Re-download + optimise the CC0 3D assets into `public/3d/` |
| `npm run lint` / `typecheck` | ESLint / TypeScript |

---

## Environment variables

See `.env.example`. Never commit `.env.local`.

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | **Production** | Postgres connection string. Use the **pooled** URL (Neon / Vercel Postgres / Supabase). |
| `AUTH_SECRET` | **Yes** | 32+ random characters; signs staff sessions. `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `OWNER_EMAIL`, `OWNER_PASSWORD`, `OWNER_NAME` | First deploy | First owner account, created by the seed **only if that email doesn't exist**. Change the password afterwards in Admin → My account; add cashiers in Admin → Users. |
| `BLOB_READ_WRITE_TOKEN` | For uploads | Vercel Blob token. Without it, image upload buttons are disabled and images can be added by `https://` link. |

---

## Deploying to Vercel

1. Push this project to a Git repository and import it in Vercel (framework: Next.js).
2. **Database**: in the Vercel project, open *Storage → Marketplace* and add **Neon Postgres** (or connect any Postgres). Make sure `DATABASE_URL` is set to the pooled connection string.
3. **Images**: in *Storage*, create a **Blob** store and connect it. This adds `BLOB_READ_WRITE_TOKEN`.
4. **Environment variables**: add `AUTH_SECRET`, `OWNER_EMAIL`, `OWNER_PASSWORD` (10+ characters) and optionally `OWNER_NAME`.
5. Deploy. The `vercel-build` script runs `db:migrate` → `db:seed` → `next build`, so the schema and owner account are created automatically on every deploy (idempotently).
6. Sign in at `/admin`, change the password (**My account**), add cashier accounts (**Users**), fill in **Settings** (address, hours, contact, socials, receipt details, about story) and build your menu.

Nothing permanent is stored on the Vercel filesystem: data lives in Postgres and uploaded images live in Vercel Blob.

---

## How it works

### Branding
The supplied `logo.png` is the source of truth. `public/brand/` holds web versions of the **real logo**: the opaque gray background is trimmed with a circular mask, and WebP sizes are exported. The palette was sampled from the logo: espresso `#1B1A15`, walnut `#5C3919`, antique gold `#BD904D`, parchment cream `#E9DCC3`, copper bean `#8F5726`. The type follows the logo's lettering: Cormorant Garamond (display), Cinzel (tracked capitals, like "C O F F E E") and Manrope (UI). The motifs also come from the logo: clock ticks, the walnut panel with its back-lit S-curve, gold rules with a coffee bean, and clock-hand icons. Tokens live in `src/app/globals.css`. Owners can replace the logo in Settings.

### 3D café experience (public site)
The home page is "one turn of the TWO RR clock": scrolling walks the camera through a real-time WebGL café built in `src/components/cafe3d/`. The real TWO RR logo hangs on the wall as the clock.

| Clock | Scene | Content |
| --- | --- | --- |
| 12 | The TWO RR clock on the café wall | Hero: name, tagline, Explore Menu / Discover |
| 3 | Close-up of a steaming cup with latte art | "Good Coffee." + your real menu categories |
| 6 | Coffee beans swirl around the cup | "Great Moments." + your enabled order types |
| 9 | The menu board | Featured products and prices from the database (drawn on the board too) |
| 12 | The whole café | Address/hours from Settings, Order Now |

- **One timeline** (`story.ts`) drives both the camera path and the HTML chapters. Native scrolling is never hijacked; a clock dial shows progress and jumps between chapters, and "Skip intro" goes straight to the content.
- **Chapters are real HTML** (headings, links, buttons), so they work for screen readers and search engines. Tabbing into a chapter's link scrolls the story to it.
- **Performance:** the first screen is server-rendered text plus the real logo. Three.js is a separate chunk, loaded only on pages that use it, after the page is idle; the canvas fades in once textures and shaders are ready. Rendering pauses off-screen and in hidden tabs, drops to about 30fps when only the steam is moving, and lowers resolution and shadows automatically if frames run slow. Phones get a lighter scene.
- **Fallbacks:** `prefers-reduced-motion` gets a static stacked layout (CSS-driven, correct even before JavaScript runs); no WebGL or data-saver keeps the scroll story over the static logo poster.
- **Elsewhere:** the About page opens with a shorter 3D move around the clock; menu cards tilt in 3D under the pointer and settle into place as you scroll (CSS scroll-driven animations where supported).
- To change the story, edit `CAFE_CAMERA_PATH` / `CHAPTERS` in `src/components/cafe3d/story.ts`; scene layout lives in `scene/createCafeScene.ts`.

**Photoreal assets.** The café uses real-world assets from [Poly Haven](https://polyhaven.com), all **CC0** (public domain: commercial use, no attribution required, redistribution allowed). Credits are listed in `public/3d/CREDITS.md`.
- `comfy_cafe`: an HDRI photographed inside a real café. It supplies the lighting and every reflection.
- Scanned PBR surfaces (colour + normal + AO/roughness): `brown_brick_02` wall, `herringbone_parquet` floor, `dark_wood` counter.
- Photoscanned props: croissant, carrot cake, strawberry chocolate cake, bar stools, potted plant.
- Run `npm run assets:3d` to re-download and re-optimise them (textures → WebP, models → meshopt-compressed `.glb`). About 6.4 MB in total; phones load about 3.6 MB (1k textures, no cakes or plant).
- The cup, saucer, latte art, beans, steam, espresso machine, grinder, pendants and menu board stay generated in code, so they match the TWO RR brand exactly.

**Rendering.** Desktop uses AgX filmic tone mapping, ground-truth ambient occlusion (GTAO), depth of field that focuses on what the camera looks at (shallow on the cup close-ups), bloom on the light bulbs, a vignette, and 4× MSAA. Phones render directly. If frames run slow, quality steps down automatically in this order: AO, depth of field, resolution, shadows. Add `?hq` to the URL to keep maximum quality regardless (for previewing on a strong machine).

### Money
All amounts are **integer centavos** (`₱1.00 = 100`). Typed amounts are parsed from strings (`parsePesoToCents`), so floating-point errors can't occur. Change is calculated only from valid amounts that cover the total, so the UI never shows NaN or negative change.

### Orders & data integrity
- The browser sends only product/option/add-on **IDs and quantities**. The server re-prices everything from the database (`src/server/orders.ts`). If the total differs from what the customer saw, the order is refused with a "prices changed" message.
- Every submission carries an **idempotency key** (unique in the database), so double-clicks, retries or races can never create duplicate orders.
- Stock is deducted with a conditional `UPDATE … WHERE quantity >= n` inside the order transaction, so concurrent sales can't oversell. Database `CHECK` constraints also forbid negative stock and prices. Cancelling an order returns its stock exactly once.
- Inventory tracking is per product and optional (made-to-order drinks usually don't need it).
- Order items keep a snapshot of name and price, so history survives menu edits and deletions.

### Payments — what is and isn't automated
No payment provider is integrated, and the app never claims an online payment succeeded.
- **Website orders** are recorded as *Unpaid*. The customer pays at the counter, and staff record the payment on the order page.
- **POS**: cash requires the amount received (validated, change computed). For GCash and card, staff confirm the payment on their GCash app or card terminal first and tick a confirmation; an optional reference number can be stored.
- `payments` is a separate table so a real provider (e.g. PayMongo for GCash and cards) can be added later.

### Users & roles
The owner manages accounts in **Admin → Users**: add, edit, disable, reset password, remove.

| Area | Owner | Cashier |
| --- | :---: | :---: |
| POS: create orders, take payments, print receipts | ✓ | ✓ |
| Orders: view & update status | All history | Today's + still-open orders |
| Cancel a **paid** order | ✓ | ✗ (unpaid only) |
| Products | Add / edit / delete / prices / availability | View only |
| Dashboard, Reports (financials) | ✓ | ✗ |
| Categories, Inventory, Gallery | ✓ | ✗ |
| Business & receipt settings, payment methods | ✓ | ✗ |
| Users | ✓ | ✗ |
| Own password (My account) | ✓ | ✓ |

- The rules live in one place, `src/lib/permissions.ts`. Both the navigation and the server guards (`requirePage`, `requirePermission`) read them. Hiding a link is cosmetic; every page and Server Action enforces the permission on the server.
- The role is always read from the database, never trusted from the cookie.
- Disabling a user, changing their role or resetting their password bumps their **session version**, which signs them out of every device on their next request. Changing your own password signs out your *other* devices.
- You can't change your own role or disable or remove yourself, and there is always at least one active owner.
- Users who have handled sales can be **disabled but not removed**, so order history always shows who created each sale and who recorded each payment.
- Cashiers sign in at the same `/admin/login` and land on the POS.

### Security
- Staff sessions are signed, httpOnly, SameSite cookies (`jose`); passwords are hashed with bcrypt (cost 12).
- `src/proxy.ts` redirects unauthenticated `/admin/*` requests. **Every admin page and every admin Server Action re-checks the session, account status and role permission on the server** (`requirePage` / `requirePermission`). Server Actions also get Next.js's built-in origin (CSRF) check.
- All input is validated server-side with Zod. Errors shown to users never include internal details.
- Sign-in attempts are rate-limited per server instance. For multi-region traffic, back this with a shared store (e.g. Upstash Redis).

### Receipts
`src/components/receipt/` renders a monospace receipt for **58 mm or 80 mm** paper (Settings → Receipts). Printing uses the browser print dialog. A print stylesheet hides the app, and `@page` is sized to the paper width, so a thermal printer installed as a system printer prints it directly. There is no direct (ESC/POS) hardware integration. Only business details entered in Settings are printed.

### Reports
Reports use real records only. Sales are paid, non-cancelled orders, grouped by Philippine time (Asia/Manila): today / 7 days / 30 days / this month, average order, best-selling products and categories, payment-method breakdown, and a daily chart with a table view.

---

## Project structure

```
src/
  app/
    (site)/            public pages: /, about, menu, menu/[slug], cart, checkout, order/[id], gallery, contact
    admin/login/       staff sign-in (owners and cashiers)
    admin/(panel)/     dashboard, orders, products, categories, inventory, reports, gallery, users, settings, account
    admin/(pos)/pos/   full-screen POS
    api/cart/quote/    live cart re-pricing
  components/          cafe3d (3D scroll story), branding, navigation, menu, products, cart, checkout, orders, pos, receipt, dashboard, forms, charts, gallery, ui
  db/                  Drizzle schema + connection (Postgres or local PGlite)
  lib/                 money, pricing, formatting, validation (shared client/server)
  server/              data access, order engine, reports, auth, storage, Server Actions
  proxy.ts             /admin route protection
drizzle/               SQL migrations
scripts/               migrate, seed, integrity tests
```

## Content still needed from the owner

The site never invents business facts. These show neutral placeholders until they're filled in under **Admin → Settings / Gallery / Products**:
address, opening hours, phone, email, map link, social links, the about story and mission, gallery photos, and product photos (products without a photo show a branded placeholder, never stock imagery).
