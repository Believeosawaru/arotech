# Arotech — Money, moving differently.

A full-stack fintech-style **sandbox application** featuring a designed public marketing website, customer dashboard, MongoDB double-entry ledger, internal customer transfers, savings goals, Paystack TEST-mode funding, and an operations dashboard. All financial balances are simulated or test funds; this product does not issue live cards, provide deposit services, or send funds to banks.

## Tech

- **Frontend:** React 18, TypeScript strict mode, Vite, Tailwind CSS, Framer Motion, React Router, TanStack Query, Recharts.
- **Backend:** Node.js / Express, TypeScript, MongoDB Atlas / Mongoose, Argon2id, opaque server sessions in HttpOnly cookies, Zod, Helmet, CORS, rate limits.
- **Integrations:** Paystack **test mode only**. SMTP is optional for email verification and account recovery.

## Requirements

- Node.js **20+** and npm.
- **MongoDB running as a replica set** (MongoDB Atlas is easiest). Atomic ledger operations and savings transactions require a replica set — a standalone local mongod will NOT work for transfers. If using local MongoDB, start a single-node replica set and run `rs.initiate()` in `mongosh`.

## Quick start (Windows PowerShell or terminal)

```bash
npm install
cp server/.env.example server/.env
cp client/.env.example client/.env
```

On Windows PowerShell, copy with `Copy-Item server/.env.example server/.env` and `Copy-Item client/.env.example client/.env`.

Set `MONGODB_URI` and `CLIENT_ORIGIN` in `server/.env`. The default `CLIENT_ORIGIN=http://localhost:5173`. In `NODE_ENV=development` the API also accepts loopback Vite origins (`http://localhost:5173` through `:5199`, and `127.0.0.1` equivalents) when Vite automatically chooses another port, such as `5174`. **In production, only the exact configured `CLIENT_ORIGIN` is allowed.** If you see `403 Origin not permitted`, verify your browser URL matches the configured origin or one of the development-only ports, and restart the API after changing `.env`. Optional: set `ENABLE_SANDBOX_FAUCET=true` to grant test funds in the app (3 grants per customer, ₦250,000 each). The Vite dev server proxies `/api` to `http://localhost:5000`.

```bash
npm run dev
```

- Public website: `http://localhost:5173`
- Customer app: `http://localhost:5173/app`
- Admin login: `http://localhost:5173/admin/login`
- API: `http://localhost:5000/api/health`

### Populate sample accounts and transactions

Edit `server/.env`:

```dotenv
SEED_ADMIN_PASSWORD=choose-a-strong-unique-password
SEED_CUSTOMER_PASSWORD=choose-another-strong-unique-password
```

Then:

```bash
npm run seed
```

These are **test-only** local accounts (not live financial accounts):

- `admin@arotech.test` — admin / configured admin password
- `ada@arotech.test` — customer / configured customer password
- `tayo@arotech.test` — customer / configured customer password

The seed is designed to be re-run without duplicating the example transactions for Ada. **Never use these identities or passwords in a public service.** No credentials are embedded in the frontend.

## Finances and ledger model

All amounts are integers in minor units (kobo). Wallet and savings balances are represented as **credit-normal liability accounts**, while the sandbox clearing account is **debit-normal**. A posted journal contains balanced debit and credit lines. Transactions use MongoDB multi-document transactions and guarded balance mutations, with unique transfer idempotency keys. The client can only request transactions — it never controls ledger balances.

- Wallet funding: Debit clearing; credit customer wallet.
- Customer transfer: Debit sender wallet; credit recipient wallet.
- Savings allocation: Debit available wallet; credit savings account.
- Savings release: Debit savings account; credit available wallet.

**Important:** The sandbox clearing balance is a simulated counterpart account. It does not represent any real cash held or settled by Arotech. Automated tests cover pure journal balance validation only; real-world financial compliance, end-to-end concurrency, reconciliation, disaster recovery, and penetration testing require additional work before any regulated launch.

## Paystack test-mode setup

1. Get your **Paystack TEST secret key** (`sk_test_...`) and place it in `server/.env` as `PAYSTACK_SECRET_KEY`.
2. Open customer dashboard → Fund wallet → enter an amount → continue to Paystack test checkout.
3. After a provider test payment returns, the backend independently verifies the reference, status, NGN currency, and precise amount before calling the idempotent ledger funding service.
4. Optionally register webhook endpoint `https://YOUR_BACKEND/api/payments/webhook` in your Paystack test dashboard. Signatures are checked using raw request bodies and HMAC SHA512. Webhook success **also** triggers backend provider verification.

No Paystack keys are included. If a key is missing, the app gives a clear error. **Live** (`sk_live_`) keys are explicitly rejected at startup.

## Production deployment (test product only)

Frontend on Render Static Site / Vercel / Netlify:

```text
Root directory: client
Build: npm install && npm run build
Publish directory: dist
VITE_API_URL: https://YOUR_BACKEND_HOST
```

If your host uses a monorepo root build, execute `npm install && npm run build -w client` from the project root, then serve `client/dist`. Include SPA catch-all rewrite to `/index.html` (Netlify `_redirects` included; Vercel `vercel.json` included).

Backend on Render Web Service / VPS:

```text
Root directory: project root
Build command: npm install && npm run build -w server
Start command: npm run start -w server
```

Required backend variables: `NODE_ENV=production`, `MONGODB_URI`, `CLIENT_ORIGIN` (exact frontend origin), `APP_MODE=test`, `COOKIE_SECURE=true`. For different frontend and backend site domains, set `COOKIE_SAMESITE=none` **and** `COOKIE_SECURE=true`, then configure HTTPS. Cross-site cookies may still be blocked by browser privacy restrictions; using a shared parent domain / reverse proxy is recommended. `ENABLE_SANDBOX_FAUCET=false` on public test environments unless deliberately authorized.

Never commit your `.env`. Never place secrets in `VITE_` variables. Configure SMTP credentials for working email verification and recovery; without SMTP, account recovery cannot email links outside of local development. Client error messages surface API outages clearly, which helps identify CORS and HTML-vs-JSON backend errors.

## Quality checks

```bash
npm run typecheck
npm run test
npm run build
```


## Mobile layout and dark-theme refinements (November 2026)

- The marketing site scales the hero financial mockups and typography for small phones and reveals a working hamburger navigation all the way up to the large-screen breakpoint. Landing sections use tighter mobile spacing.
- Customer workspace: compact phone header, high-contrast sun/moon toggle, clear five-item mobile navigation, safe-area spacing, adaptable wallet amounts, and better transaction pagination. Theme selection persists to `localStorage` as before.
- Operations workspace: a compact phone header and **labeled mobile cards** for records that remain full tables on larger screens.
- Shared modals scroll within the visible mobile viewport rather than letting their actions fall off-screen. Forms use phone-friendly text sizes.
- The high-contrast dark-mode toggle uses lime `#C3F26A` on deep green `#304E38` (~7.14:1 icon/background contrast). The bell icon is also kept visible against the dark header.

Run the added source-level regression checks with:

```bash
node --test client/tests/responsive-source.test.mjs
```

**Visual QA:** With frontend dependencies installed, use your browser's responsive device tools to inspect `/`, `/register`, `/app`, `/app/transactions`, `/app/cards`, `/admin` and `/admin/users` at 320px, 375px, 390px, 430px, 768px, and desktop widths. Test both customer themes. Source-level checks are not a replacement for running the website in a browser; a full runtime visual review and end-to-end testing were not possible in this build environment.

## Honest implementation limits

This project is a **sandbox implementation**, not a licensed financial institution. Planned/hardening tasks before any real deployment of money include independently reviewed ledger invariant and concurrency tests with replica-set MongoDB; scoped admin privileges and MFA/TOTP; robust provider settlement reconciliation; production email delivery; independent security audit, network abuse defenses, data protection/privacy review, and payment/regulatory approvals. External bank transfers, spendable cards, KYC identity document verification, and live-money transactions are intentionally disabled. In this release, the admin KYC screen manages review statuses but cannot unilaterally mark an identity verified. Admin analytics are database-derived. Digital cards are **non-spendable visual test records only**. Balance change cannot be triggered directly from admin.

## Files

```text
client/src/pages/Landing.tsx          Premium public marketing site
client/src/pages/AuthPage.tsx         Account registration, login, recovery
client/src/pages/AppPage.tsx          Customer financial workspace
client/src/pages/AdminPage.tsx        Operations workspace
server/src/services/ledger.ts         Transactional double-entry ledger
server/src/routes/payments.ts         Paystack test-mode provider integration
server/src/models/index.ts           MongoDB schema models and indexes
server/src/seed.ts                    Test accounts and test ledger history
```
#   a r o t e c h  
 