# MEMORY.md — long-term memory

## TradingBible

- **Company:** TradingBible Holdings. Inc. (Delaware filed name; file no. 10821679; formed 28 October 2026). The comma form **TradingBible Holdings, Inc.** is the intended commercial name only while a certificate of correction is pending. Use the filed name in legal and financial contexts.
- **Stage:** Private company, pre-IPO. No public offering, no approved SAFE/equity/token terms, no publicly traded TB shares. TB is a proposed ticker only; TBC is a proposed token and is not issued.
- **Launch:** Planned public launch **25 December 2026**. Free + Premium at **$19.99/month** or **$199/year**; Academy is separate.
- **Production:** https://tradingbible.app — Nginx + PM2 API on a single VPS. Production is not a git checkout; deploy by rsync, not `deploy/deploy.sh`. Pre-deploy archive: `/root/tradingbible-deploy-backups/pre-deploy-20261115T042953Z.tar.gz`.
- **Current state (15 November 2026 UTC):** API source, SPA and generated document storage deployed; `tradingbible-api` online; `/api/health` returns 200; public signup is paused; 71 open roles; CMS overrides empty; production investor overview uses the filed name and corrected corporate milestone.
- **Verified:** lint, 49 web tests, production build, Academy/release/security guards, full local public audit and 64-run production public audit. No missing required disclosures, no body horizontal overflow, no contrast failures, no CLS above 0.1, no real page errors, no banned public claims, no Secretary name in the public bundle. Public pages contain no founder or `TradingBible LLC` text. All 101 local `.docx` and 72 `.pdf` controlled documents were text-scanned with no `DRAFT`/`draft`/`drafted` labels, banned company/title claims or standalone founder references; the 14 public TBC/TB downloads are clean.
- **Blocked:** transactional email/SMTP and auth hook, EIN and corporate records, counsel/securities work, Supabase RLS/PITR and admin MFA proof, Stripe live acceptance, broker/KYC/payout coverage, webinar/AI fallback delivery, tax/privacy controls. See `docs/blocked-items.md` for the full honest inventory.

## Working rules

- Never fabricate approvals, balances, terms, PANs, AUM, ownership, counsel review, audit completion, EIN, lease execution, penetration-test results, security certifications, testimonials, user counts, or platform parity.
- Use only statutory titles: Malik Nlem — President, Treasurer and Director; the Secretary is recorded in the controlled record and her name is not published without consent; Victor Okechukwu — Director. No CEO, CFO, COO or VP is appointed.
- Do not commit or push unless the user explicitly asks. Deployment approval does not imply push approval.
- Public copy must state private/pre-IPO/no offering/no approved SAFE/equity/token terms, remain readable in dark/light, support reduced motion, and avoid layout shift.
- Keep the chart-first React + `lightweight-charts` terminal, drawing persistence and pointer/rAF architecture intact.
