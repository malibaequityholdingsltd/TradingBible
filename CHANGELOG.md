# Changelog

## 2026-08-15 — Academy Launch (AI-powered, $150 lifetime)

**The Academy is live end-to-end. AI is in charge of everything: it builds each student's curriculum, writes every lesson, grades every quiz, tutors one-on-one, hosts live webinars, and writes certificates.**

### What was built
- **Paywall**: $150 one-time lifetime access (waitlist removed). Real Paddle checkout with `intent: 'academy'` webhook grant.
- **Learning paths**: 3 paths (Absolute Beginner / Intermediate / Advanced). Enrolling kicks off AI curriculum generation — 4 courses × 4–6 lessons, sequenced foundations → skill → application → independence (final capstone: the student's own trading plan).
- **Lessons**: AI-written per student (400–800 words, worked examples, key points), each opening with a bridge from the previous lesson. Every lesson ends with a 4-question quiz.
- **Quizzes**: AI-graded with direct feedback on misconceptions; answer keys verified by a second AI audit pass.
- **AI Tutor**: live SSE chat inside every lesson (open-style questioning, never spoon-feeds answers).
- **Live webinars**: 4 weekly AI-hosted sessions (countdown, RSVP, live AI room that answers attendees in real time).
- **Certificates**: claimable at 100% progress; personalized AI citation; code format `TB-AC-YYYY-XXXXXX`.
- **Persistence**: curricula/lessons/progress/purchases/RSVPs stored per user; access is permanent.

### Commits
```
baeb66a feat(academy): AI-powered Academy end-to-end — lifetime access, no waitlist
507010a fix(academy): import completeOpencode in integrated-ai.js
df01e74 fix(academy): completeOpencode via prompt_async + /event SSE
b166938 fix(academy): verify quiz answer keys with an AI audit pass
b8eecfe fix(academy): fresh opencode session per content generation
0dd333d fix(academy): strip assistant meta-commentary from certificate citations
1d0124b fix(academy): await stream() in tutor/webinar SSE
5b90a18 fix(academy): tutor/webinar prompts — no process narration
7aa0e01 fix(academy): strip AI process-narration lead paragraph from tutor/webinar SSE
81f1f57 fix(academy): certificate cleanup — also drop one-paragraph narration leads
```

### Backups (VPS, root)
- **Database** (all 40 tables incl. academy): `/root/backups/tradingbible-db/YYYY-MM-DD/*.json` — daily 03:30, 14-day retention.
- **Code + secrets** (repo tar incl. `.env`): `/root/backups/tradingbible-code/tradingbible-YYYY-MM-DD.tar.gz` — daily 03:35, 7-day retention.
- Uploads live in the MASSIVE_FILES bucket (external, not on the VPS).

### Where to look
- Commits: `git log --oneline` (repo) or the GitHub repo: `github.com/malibaequityholdingsltd/TradingBible`
- API logs: `ssh root@69.62.123.117` then `pm2 logs tradingbible-api`
- Backup health: `/var/log/tradingbible-db-backup.log`, `/var/log/tradingbible-code-backup.log`
- Smoke tests: `/tmp/academy-test.mjs`, `/tmp/sse-test.mjs` on the VPS

### Not done yet (needs you)
- **Paddle billing**: `PADDLE_*` keys in `/var/www/tradingbible/apps/api/.env` are still empty. Create a **$150 one-time product/price** in Paddle, paste live keys + set `PADDLE_PRICE_ACADEMY=<price id>`. Helper script: `/tmp/academy-price.mjs` on the VPS. Until then the paywall shows a "billing not configured" note instead of checkout.
