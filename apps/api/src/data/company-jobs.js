// Company-wide hiring plan for TradingBible LLC.
//
// These are real operating roles across the product the company actually
// runs: the trading journal/terminal, broker integrations, market data,
// analytics, the SI coach, Academy, community, growth, finance, legal,
// security, people operations, and the approval-gated TBC programme.
//
// Compensation language deliberately separates a fiat base from any proposed
// TBC allocation. No token has been issued and no allocation is promised.
const compensation = 'Compensation: competitive USD base plus a discretionary proposed TBC allocation. TBC is not issued; any allocation is subject to legal, technical and security approval.';

const role = (data) => ({
  department: 'Operations',
  employmentType: 'full-time',
  location: 'Remote · global',
  auto_accept: false,
  status: 'open',
  hiring: {
    screening: [],
    samples_required: false,
    trial_task: '',
    trial_days: 14,
    salary_tbc: 0,
    salary_freq: 'monthly',
    closes_at: null,
  },
  ...data,
  description: `${data.description}\n\n${compensation}`,
});

export const companyJobs = [
  // ── Leadership ────────────────────────────────────────────────────
  role({
    title: 'Chief Technology Officer',
    department: 'Leadership',
    description: 'Own the platform architecture, engineering operating model, reliability targets and security roadmap across the terminal, journal, broker integrations, AI coach and data platform. Partner with the founder on build-versus-buy decisions and the staged TBC technical programme.',
    requirements: 'Senior engineering leadership in fintech, trading or high-availability SaaS. Evidence of scaling a multi-team product org, running architecture reviews, incident response and secure SDLC. Strong written decision records.',
  }),
  role({
    title: 'Chief Operating Officer',
    department: 'Leadership',
    description: 'Run company operating cadence, cross-functional planning, vendor management and execution accountability. Turn product and compliance commitments into owned, dated operating plans.',
    requirements: 'Operating leadership at a scaling software or financial-services company. Strong planning, metrics and risk discipline. Comfortable with regulated-activity boundaries and board reporting.',
  }),
  role({
    title: 'Chief Information Security Officer',
    department: 'Security',
    description: 'Own the security programme for customer accounts, trading data, payments, broker connections and the proposed digital-asset programme. Lead threat modelling, vendor assurance, incident response and security evidence for enterprise customers.',
    requirements: 'CISSP/CISM or equivalent experience. Hands-on cloud, application and identity security background. Experience with fintech controls, incident command and third-party security reviews.',
  }),
  role({
    title: 'Chief of Staff',
    department: 'Leadership',
    description: 'Drive the founder operating system: priorities, decision memos, board and investor materials, cross-team follow-through and sensitive special projects. Keep legal, product and engineering gates visible and sequenced.',
    requirements: 'Excellent writing and analytical skills. Experience in strategy, consulting, venture or a fast-scaling product company. High discretion with confidential company information.',
  }),

  // ── Engineering & data ───────────────────────────────────────────
  role({
    title: 'Head of Platform Engineering',
    department: 'Engineering',
    description: 'Lead the web platform, design-system implementation, performance, accessibility and release engineering. Own the frontend architecture for the terminal and the member portal.',
    requirements: 'Deep React/TypeScript experience, design-system ownership, performance profiling and CI/CD. Prior technical leadership of a product engineering team.',
  }),
  role({
    title: 'Senior Full-Stack Engineer',
    department: 'Engineering',
    description: 'Build member-facing product surfaces across React, Node and Supabase. Ship journal, analytics, billing and account workflows with tests and clear observability.',
    requirements: '5+ years shipping production web applications. Strong React, Node, SQL and API design. Comfortable owning a feature from schema to UI.',
  }),
  role({
    title: 'Backend Engineer — Market Data & Broker APIs',
    department: 'Engineering',
    description: 'Build and operate the market-data gateway, quote normalisation, broker connection services, reconciliation jobs and rate-limited provider adapters.',
    requirements: 'Node or Go backend experience, streaming data, REST/WebSocket integrations, caching and failure handling. Broker or trading-data experience strongly preferred.',
  }),
  role({
    title: 'Mobile Engineer — React Native',
    department: 'Engineering',
    description: 'Own the phone application experience: navigation, offline states, push notifications, secure session storage and fast chart interactions. Work with design to make the mobile product feel native rather than condensed desktop.',
    requirements: 'Production React Native or native iOS/Android experience. Strong performance, accessibility and app-store release discipline.',
  }),
  role({
    title: 'DevOps / Site Reliability Engineer',
    department: 'Engineering',
    description: 'Own deployment pipelines, environment parity, observability, backups, alerting and disaster recovery. Improve uptime for the API, web app, market-data jobs and document services.',
    requirements: 'Linux, containers, reverse proxies, CI/CD and infrastructure-as-code. Experience with metrics, logs, tracing and on-call runbooks.',
  }),
  role({
    title: 'Security Engineer — Application & Cloud',
    department: 'Security',
    description: 'Perform secure code review, dependency and cloud posture work, auth/session hardening, secret management and customer-facing security questionnaires.',
    requirements: 'AppSec or cloud security experience, OWASP fluency, threat modelling and secure SDLC. Practical scripting for automation.',
  }),
  role({
    title: 'Data Engineer — Analytics & Warehouse',
    department: 'Data',
    description: 'Build the warehouse models, event pipelines and reporting datasets behind trade analytics, cohort reporting, product telemetry and billing reconciliation.',
    requirements: 'SQL, Python, dbt-style modelling and event-schema design. Experience with privacy-aware analytics and data quality checks.',
  }),
  role({
    title: 'Machine Learning Engineer — SI Coach',
    department: 'AI',
    description: 'Improve the SI trading coach: retrieval, prompt design, evaluation harnesses, safety boundaries and model-provider abstraction. Build measurable coaching quality rather than generic chat.',
    requirements: 'Applied LLM or ML engineering, evaluation-driven development, Python/Node and API integration. Trading-domain literacy is a strong plus.',
  }),
  role({
    title: 'Blockchain Engineer — TBC Programme',
    department: 'TBC Programme',
    description: 'Prototype and review the proposed TBC chain, token contracts, custody flows and migration accounting. Work only inside written approval gates; no public sale or transfer feature is authorised by this role.',
    requirements: 'Smart-contract and chain engineering experience, security review discipline, accounting reconciliation and incident planning. Cosmos/EVM exposure preferred.',
  }),
  role({
    title: 'QA Automation Engineer',
    department: 'Engineering',
    description: 'Own regression coverage for the terminal, member portal, admin console and document workflows. Build stable Playwright suites and release gates that catch real failures.',
    requirements: 'Playwright/Cypress or equivalent, API testing, fixtures and CI integration. Strong bug isolation and clear reproduction writing.',
  }),
  role({
    title: 'Integrations Engineer — Broker Connectivity',
    department: 'Engineering',
    description: 'Implement and support broker authentication, trade sync, position reconciliation and failure recovery across supported brokerage APIs.',
    requirements: 'API integration engineering, OAuth, webhook reliability and reconciliation logic. Brokerage or trading-platform experience preferred.',
  }),

  // ── Product, design, research ────────────────────────────────────
  role({
    title: 'Head of Product',
    department: 'Product',
    description: 'Own product strategy, discovery and prioritisation across the terminal, journal, analytics, Academy and subscription surfaces. Keep the roadmap honest about what is live, proposed or gated.',
    requirements: 'Senior product leadership in fintech or SaaS. Strong discovery, metrics and written strategy. Experience shipping complex operator or trading tools.',
  }),
  role({
    title: 'Product Designer — Trading UX',
    department: 'Design',
    description: 'Design high-density trading, journal and analytics workflows for web and phone. Turn complex risk and performance data into calm, legible interfaces.',
    requirements: 'Strong product design portfolio, systems thinking and interaction design. Trading, fintech or data-product experience preferred.',
  }),
  role({
    title: 'UX Researcher',
    department: 'Design',
    description: 'Run interviews, usability studies and diary research with traders, academy students and operators. Convert findings into prioritised product decisions.',
    requirements: 'Mixed-methods research experience, strong synthesis and stakeholder communication. Fintech or education research a plus.',
  }),
  role({
    title: 'Design Systems Lead',
    department: 'Design',
    description: 'Own the Atelier design language, tokens, components, accessibility and documentation across light and dark themes.',
    requirements: 'Design-system ownership, React/Tailwind fluency, accessibility and visual QA. Strong documentation habits.',
  }),
  role({
    title: 'Technical Writer — Product & API',
    department: 'Product',
    description: 'Write product guides, API documentation, release notes, onboarding material and clear risk disclosures. Keep every claim aligned with shipped functionality.',
    requirements: 'Excellent technical writing, API literacy and editing discipline. Experience documenting developer products or regulated features.',
  }),

  // ── Markets, research, risk ─────────────────────────────────────
  role({
    title: 'Head of Markets & Research',
    department: 'Markets',
    description: 'Lead market commentary, research quality, signal review and the analyst bench. Set standards for evidence, disclosure and avoiding promotional claims.',
    requirements: 'Multi-asset market experience, research leadership and strong public communication. Compliance-aware editorial judgement.',
  }),
  role({
    title: 'Market Analyst — FX & Indices',
    department: 'Markets',
    description: 'Produce daily and weekly market analysis, session briefs and educational breakdowns across major FX pairs and indices.',
    requirements: 'Demonstrated market analysis experience, charting fluency and clear writing. Verifiable research portfolio.',
  }),
  role({
    title: 'Crypto Research Analyst',
    department: 'Markets',
    description: 'Cover market structure, token design, custody and on-chain risk for research and education. Separate platform credits from the proposed TBC token in every note.',
    requirements: 'Crypto research experience, on-chain literacy and risk disclosure discipline. No promotional token shilling.',
  }),
  role({
    title: 'Quantitative Analyst — Trading Analytics',
    department: 'Data',
    description: 'Define and validate performance metrics, expectancy, drawdown, risk-adjusted return and cohort benchmarks used in reports and coaching.',
    requirements: 'Quantitative background, Python/SQL and trading-statistics literacy. Experience with backtest and live-trade reconciliation.',
  }),
  role({
    title: 'Risk & Margin Analyst',
    department: 'Risk',
    description: 'Review exposure, leverage, margin and product-risk disclosures across educational and tooling surfaces. Support incident escalation and customer communication.',
    requirements: 'Risk or trading-operations experience, strong Excel/SQL and clear policy writing. Brokerage risk background preferred.',
  }),
  role({
    title: 'Broker Partnerships Manager',
    department: 'Partnerships',
    description: 'Build and manage broker and data-provider relationships, commercial terms, integration roadmaps and ongoing service reviews.',
    requirements: 'Fintech partnerships or broker business development experience. Strong commercial and technical translation skills.',
  }),

  // ── Academy & content ───────────────────────────────────────────
  role({
    title: 'Academy Director',
    department: 'Academy',
    description: 'Own curriculum strategy, instructor quality, student outcomes and accreditation-ready operations for TradingBible Academy.',
    requirements: 'Education leadership, curriculum design and instructor management. Trading-education experience preferred.',
  }),
  role({
    title: 'Curriculum Designer — Trading Education',
    department: 'Academy',
    description: 'Design structured learning paths, assessments and practical missions for beginner through advanced traders.',
    requirements: 'Instructional design experience, assessment literacy and markets fluency. Portfolio of shipped curricula.',
  }),
  role({
    title: 'Instructional Designer — LMS',
    department: 'Academy',
    description: 'Build LMS course structures, quizzes, completion logic and accessible learning assets.',
    requirements: 'LMS administration, SCORM/xAPI awareness and strong quality assurance. Accessibility experience preferred.',
  }),
  role({
    title: 'Motion Designer / Video Editor',
    department: 'Media',
    description: 'Edit long-form education, studio interviews and short-form market explainers. Add motion graphics that make risk and process legible.',
    requirements: 'Premiere/After Effects or DaVinci fluency, strong portfolio and reliable remote delivery.',
  }),
  role({
    title: 'Content Strategist — Markets',
    department: 'Content',
    description: 'Plan the editorial calendar across research, education, product and compliance-sensitive announcements. Maintain a single source of truth for claims.',
    requirements: 'Editorial strategy, markets literacy and strong cross-team coordination. Experience with regulated content review.',
  }),
  role({
    title: 'SEO & Lifecycle Writer',
    department: 'Growth',
    description: 'Write search-led explainers, comparison pages and lifecycle emails that are accurate, useful and free of token hype.',
    requirements: 'SEO writing portfolio, analytics literacy and editorial discipline. Fintech or education experience preferred.',
  }),
  role({
    title: 'Social Media Manager',
    department: 'Growth',
    description: 'Run the public social calendar, community announcements and live-event promotion with a calm, evidence-led brand voice.',
    requirements: 'Social channel management, copywriting and crisis-aware judgement. Trading-community experience a plus.',
  }),
  role({
    title: 'Community Lead',
    department: 'Community',
    description: 'Own forum and chat culture, member events, moderator quality and escalation paths. Build belonging without tolerating financial promotion or abuse.',
    requirements: 'Community leadership, moderation systems and conflict resolution. Experience in trading or education communities.',
  }),
  role({
    title: 'Trust & Safety Lead',
    department: 'Community',
    description: 'Set policy and response for scams, impersonation, harassment, market manipulation and prohibited financial promotion across community surfaces.',
    requirements: 'Trust and safety operations, policy writing and evidence handling. Fintech or marketplace experience preferred.',
  }),

  // ── Growth, revenue, customer ───────────────────────────────────
  role({
    title: 'Head of Growth',
    department: 'Growth',
    description: 'Own acquisition, activation, conversion and retention across subscription and Academy funnels. Build a measurement system that respects attribution limits.',
    requirements: 'Growth leadership in SaaS or fintech, experimentation and lifecycle marketing. Strong analytical and team-building record.',
  }),
  role({
    title: 'Performance Marketing Manager',
    department: 'Growth',
    description: 'Run paid acquisition across search and social with strict claims review, creative testing and unit-economics discipline.',
    requirements: 'Hands-on paid media experience, analytics and compliance-aware creative. Trading or education category experience a plus.',
  }),
  role({
    title: 'Lifecycle & CRM Manager',
    department: 'Growth',
    description: 'Design onboarding, activation, upgrade, win-back and educational email journeys. Keep suppression and consent rules clean.',
    requirements: 'Lifecycle marketing, CRM automation, segmentation and deliverability. SQL literacy preferred.',
  }),
  role({
    title: 'Enterprise Sales Lead',
    department: 'Revenue',
    description: 'Sell team, school and prop-firm seats: discovery, security review, procurement, pilots and expansion.',
    requirements: 'B2B SaaS or fintech sales experience, complex deal management and strong written proposals. Trading-industry network preferred.',
  }),
  role({
    title: 'Brand & Communications Lead',
    department: 'Marketing',
    description: 'Own brand voice, public positioning, press and sensitive-issue communications. Keep marketing and legal language aligned.',
    requirements: 'Brand or communications leadership, excellent writing and crisis communications experience. Fintech background preferred.',
  }),
  role({
    title: 'Customer Success Manager',
    department: 'Customer',
    description: 'Own onboarding and success for team, school and high-value accounts. Drive adoption, retention and structured feedback into product.',
    requirements: 'Customer success or account management in SaaS, strong product fluency and clear escalation habits.',
  }),
  role({
    title: 'Support Operations Lead',
    department: 'Customer',
    description: 'Run the support queue, macros, SLAs, quality review and knowledge base. Turn recurring issues into product and documentation fixes.',
    requirements: 'Support leadership, tooling and QA experience. Strong writing and calm incident communication.',
  }),
  role({
    title: 'Onboarding Specialist',
    department: 'Customer',
    description: 'Guide new members through account setup, broker connection, journal basics and their first review session.',
    requirements: 'Customer onboarding or coaching experience, patience and strong product walkthrough skills. Trading literacy preferred.',
  }),

  // ── Finance, legal, compliance, people ──────────────────────────
  role({
    title: 'Financial Controller',
    department: 'Finance',
    description: 'Own monthly close, revenue recognition, subscription reconciliation, accounts payable, payroll support and audit readiness.',
    requirements: 'Qualified accountant or equivalent experience, SaaS/Stripe revenue fluency and strong controls discipline.',
  }),
  role({
    title: 'Legal Counsel — Fintech & Digital Assets',
    department: 'Legal',
    description: 'Manage product terms, privacy, commercial contracts, marketing review and the TBC legal workstream with external counsel. Do not opine on regulated activity without qualified local advice.',
    requirements: 'Licensed lawyer with fintech, payments or digital-asset experience. Strong drafting and cross-functional judgement.',
  }),
  role({
    title: 'Compliance Manager — AML/KYC',
    department: 'Compliance',
    description: 'Build and operate KYC/AML procedures for applicable products, sanctions screening, escalation and recordkeeping. Keep token and brokerage boundaries explicit.',
    requirements: 'Compliance operations experience in fintech or payments, AML certification and practical control design.',
  }),
  role({
    title: 'Internal Auditor',
    department: 'Finance',
    description: 'Test key controls across billing, access, vendor management, incident response and the proposed digital-asset programme. Report findings without owning operations.',
    requirements: 'Internal audit or risk assurance experience, evidence-based testing and clear reporting. CIA/CISA a plus.',
  }),
  role({
    title: 'People Operations Partner',
    department: 'People',
    description: 'Own onboarding, staff records, policy administration, payroll coordination and manager support across a remote team.',
    requirements: 'People operations experience, employment-law awareness and strong systems discipline. International contracting experience preferred.',
  }),
  role({
    title: 'Talent Acquisition Lead',
    department: 'People',
    description: 'Build the hiring engine for engineering, markets, Academy and operations: scorecards, structured interviews, candidate care and offer management.',
    requirements: 'Technical and go-to-market recruiting experience, structured interviewing and strong candidate communication.',
  }),

  // ── Operations & programme ─────────────────────────────────────
  role({
    title: 'Program Manager — Product & Compliance',
    department: 'Operations',
    description: 'Run cross-functional programmes that touch product, legal, security and finance. Keep decision logs, dependencies and approval gates current.',
    requirements: 'Programme management in regulated or high-growth environments, excellent documentation and risk escalation.',
  }),
  role({
    title: 'Business Operations Analyst',
    department: 'Operations',
    description: 'Build operating dashboards, pricing and margin analysis, vendor reviews and process-improvement cases.',
    requirements: 'Analytical experience, SQL/Sheets fluency and strong business writing. SaaS or fintech operations preferred.',
  }),
  role({
    title: 'Procurement & Vendor Manager',
    department: 'Operations',
    description: 'Own vendor selection, security and privacy review coordination, renewals and cost control across data, AI, cloud and marketing vendors.',
    requirements: 'Procurement or vendor-management experience, contract literacy and security-review coordination.',
  }),
  role({
    title: 'IT Systems Administrator',
    department: 'Security',
    description: 'Manage identity, devices, access reviews, SaaS administration and endpoint hygiene for a remote team.',
    requirements: 'Google Workspace/Microsoft 365, SSO, MDM and access-review experience. Security-first mindset.',
  }),
  role({
    title: 'Incident Response Analyst',
    department: 'Security',
    description: 'Maintain incident playbooks, run tabletop exercises, coordinate response and produce blameless post-incident reviews.',
    requirements: 'SOC or incident-response experience, cloud forensics literacy and calm documentation under pressure.',
  }),

  // ── TBC programme (approval-gated) ─────────────────────────────
  role({
    title: 'Head of Digital Assets — TBC Programme',
    department: 'TBC Programme',
    description: 'Coordinate the proposed TBC programme across legal, finance, security and engineering. No sale, transfer, staking, governance or chain launch is authorised until written approvals exist.',
    requirements: 'Digital-asset programme leadership, regulatory awareness and strong controls discipline. Experience taking a token programme through counsel and security review preferred.',
  }),
  role({
    title: 'Tokenomics & Research Analyst',
    department: 'TBC Programme',
    description: 'Model illustrative supply, vesting and utility scenarios for review. Clearly label all scenarios as proposals and never present them as approved terms.',
    requirements: 'Economic modelling, spreadsheet/Python fluency and digital-asset research. Strong disclosure discipline.',
  }),
  role({
    title: 'Smart Contract Security Reviewer',
    department: 'TBC Programme',
    description: 'Independently review proposed contracts, privileged roles, upgrade paths and bridge assumptions before any deployment.',
    requirements: 'Smart-contract security experience, audit portfolio and incident-response literacy. No deployment authority.',
  }),
  role({
    title: 'Custody Operations Specialist',
    department: 'TBC Programme',
    description: 'Design custody, key-management, reconciliation and refund procedures for any future approved digital-asset product.',
    requirements: 'Digital-asset custody or treasury operations experience, strong controls and reconciliation discipline.',
  }),
];
