## ArthSetu — Alternate Credit Intelligence Platform

Rebuild your local React+FastAPI base as a deployable streamlit or versale app. Your Python scoring formula is deterministic, so it ports cleanly to a server function — no ML runtime needed. Tagline: **"Score the unscored."**

### Design

- **Theme:** dark near-black background with a deep blue → teal fintech gradient, professional and premium. Defined as semantic tokens in `src/styles.css` (oklch).
- **Motion:** animated gradient hero backdrop, floating/parallax glow orbs, count-up stat numbers, scroll-reveal cards, animated credit-score gauge/dial, subtle hover lifts. Uses Motion (framer-motion) + CSS.
- Layout mirrors your screenshots: badge pill, big hero headline with gradient accent word, dual CTAs, 4 stat cards, "How ArthSetu works" 3-step grid, compliance section with feature rows, minimal footer.

### Public marketing site

- **Home** (`/`): hero, stats (Score range 300–900, factors analyzed, 0 protected attributes, 100% audit coverage), "How it works", who it's for (MSMEs, small businesses, gig workers), compliance-first section, footer.
- Clear, shareable routes each with their own SEO `head()`.

### Auth & roles

- Email/password sign up + sign in (Lovable Cloud). **Customers self-register only.**
- **Admins are controlled** — no public admin signup. Roles live in a separate `user_roles` table with a security-definer `has_role()` function (never stored on profiles). The first admin is provisioned via a secure bootstrap (a seeded admin account / promotion by an existing admin).
- Protected dashboards under `_authenticated`; customers and admins routed to their respective dashboards by role.

### Customer experience

- **Credit application** (streamlined ~15 essentials): age, occupation type, monthly net income, annual income, employment tenure, total assets (bank balance, FDs, property, vehicle, gold), total liabilities, total monthly EMIs, existing loans, credit utilization %, missed payments (12m), defaults, CIBIL (optional), digital/UPI activity score.
- On submit: score computed instantly and stored as **Pending admin review** (no email yet).
- **Customer dashboard:** application status, animated score gauge once a decision is published, decision, recommended credit limit & interest rate, default probability, and personalized recommendations.

### Scoring engine (ported from your `demo_predict`)

- Server function reproduces your exact formula: base 600, CIBIL blend, penalties for missed payments/defaults/enquiries, FOIR bands, utilization, tenure, age, net worth, digital footprint, tax years → clamped 300–900.
- Derives score band, default probability `(900−score)/600`, recommended credit limit & interest rate, top factor contributions, and recommendations — identical logic to your backend.

### Admin (bank worker) experience

- **Admin dashboard:** stats (total, approval rate, overrides, average score, score-band distribution as an animated chart) and a queue of applications.
- **Application detail:** full applicant data, AI score, factor breakdown, recommendations.
- **Override + decide:** approve / reject / override with a **mandatory reason**; can set a new score. Every action recorded in an append-only **audit log** with before/after state, admin id, and timestamp.
- Verifying/deciding an application is what publishes the result to the customer and triggers the email.

### Email reports (after admin decision only)

- When an admin approves/rejects/overrides, the customer's registered email receives a branded credit report: score, band, decision, recommended limit & rate, and top recommendations — styled to match the dark theme.
- Built on Lovable Cloud email (enabled as part of this build). Requires a one-time email-domain verification step from you before live sending; until then sends are queued.

### Data model (Lovable Cloud / Postgres, RLS enabled + grants)

- `profiles` — user profile (id → auth.users, full name, mobile, email).
- `user_roles` — (`user_id`, `role`) with `has_role()` security-definer fn.
- `applications` — applicant inputs + computed score, band, default_prob, credit_limit, interest_rate, recommendations (JSON), status (pending/approved/rejected/override_approved/override_rejected), override fields (admin_id, reason, new_score, timestamp), email_sent flag.
- `audit_logs` — append-only action trail (action, resource_id, actor, before/after, ip, timestamp).
- RLS: customers see only their own applications; admins (via `has_role`) see all; audit log insert-only.

### Technical notes

- Scoring, submission, admin queries, override, and email sends run in `createServerFn` handlers (RLS-respecting) / server routes; service-role only inside trusted server code.
- Zod validation on every input, client + server.
- Score gauge, charts, and stat counters are presentational components fed by server data.

### Build order

1. Enable Lovable Cloud; create schema, roles, RLS, grants.
2. Design tokens + animation utilities + shared UI (gauge, animated stats, glow backdrop).
3. Public marketing pages.
4. Auth (customer signup/signin) + role routing + admin bootstrap.
5. Customer application form + scoring server fn + customer dashboard.
6. Admin dashboard, application detail, override + audit.
7. Email infrastructure + decision-triggered report email.
8. QA: scoring parity, role gating, override flow, email trigger.

This delivers everything in your base, modernized on Lovable with a dark blue/teal fintech look and interactive motion.