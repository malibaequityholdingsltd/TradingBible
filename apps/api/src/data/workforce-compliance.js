// Employer and employee compliance framework for TradingBible Holdings, Inc.
//
// This file is the source of truth for the admin workforce register, the
// employee-file checklist and the document pack. It deliberately distinguishes
// a company requirement from evidence that the requirement is complete. The API
// stores evidence references and adoption decisions separately; nothing here
// claims that counsel, a payroll provider, an insurer or a regulator has
// approved anything.

export const WORKFORCE_PROFILE = Object.freeze({
  companyName: 'TradingBible Holdings, Inc.',
  formation: 'Delaware corporation',
  launchDate: '25 December 2026',
  legalEmail: 'legal@tradingbible.app',
  hrEmail: 'people@tradingbible.app',
  securityEmail: 'security@tradingbible.app',
  scope: 'Direct employees, full-time and part-time employees, remote employees and individual contractors. Academy learners and instructors are product users, not employees.',
  boundary: 'A Delaware registration does not satisfy employment, payroll, tax, insurance or workplace obligations in the country or state where a person actually works. The applicable local rules must be confirmed before a start date.',
  workforceModel: 'Do not hire all 58 catalogue roles at once. Start with a controlled core team and expand only when revenue, funding and operational need justify the role. Distinguish appointed people from open positions; never present an open role as an existing executive.',
  priorityOpenRoles: ['Chief Operating Officer', 'Chief Financial Officer', 'Chief Technology Officer', 'Chief Revenue Officer', 'General Counsel'],
  proposedBenefitsBoundary: 'The benefit tiers below are a proposed framework, not existing entitlements. Equity, options, bonuses, health insurance, pensions and relocation support require board approval, plan documents, tax analysis and local-law review before anyone is promised them.',
});

export const EMPLOYER_ITEM_STATUSES = Object.freeze(['not_started', 'in_progress', 'complete', 'blocked', 'not_applicable']);
export const EMPLOYEE_ITEM_STATUSES = Object.freeze(['not_started', 'in_progress', 'complete', 'blocked', 'not_applicable']);
export const POLICY_STATUSES = Object.freeze(['template', 'in_review', 'adopted', 'not_applicable']);

const item = (id, title, detail, evidence, owner, extra = {}) => ({
  id,
  title,
  detail,
  evidence,
  owner,
  launchCritical: false,
  ...extra,
});

export const EMPLOYER_SECTIONS = Object.freeze([
  {
    id: 'corporate',
    title: 'Corporate and employment administration',
    blurb: 'The company needs a clean legal and records foundation before anyone starts work. Delaware incorporation is the starting point, not the whole answer.',
    items: [
      item('corp.formation', 'Certificate of incorporation and corporate bylaws', 'Keep the filed certificate, bylaws and any amendments in the corporate record. Confirm the registered agent and Delaware registered office at the same time.', 'Filed certificate, bylaws, registered-agent confirmation', 'General Counsel / Corporate Secretary', { launchCritical: true }),
      item('corp.ein', 'EIN and IRS business tax records', 'Confirm the EIN has been issued and retain the IRS notice. Use the legal entity name and EIN consistently on payroll, tax and bank records.', 'IRS EIN notice, tax account record', 'CFO / Finance'),
      item('corp.registered-agent', 'Registered agent and Delaware registered office', 'Confirm the registered agent is active, the registered office is correct and the annual franchise tax is calendared.', 'Registered-agent certificate, franchise-tax calendar', 'Corporate Secretary', { launchCritical: true }),
      item('corp.bank-payroll', 'Company bank account and payroll funding process', 'Separate company funds from personal funds. Document who can initiate payroll, who approves it and how a shortfall is handled before payday.', 'Bank mandate, payroll funding procedure, approval matrix', 'CFO / Finance'),
      item('corp.employee-register', 'Accurate employee and contractor register', 'Maintain one register with legal name, work country and region, arrangement, start date, manager, status and exit date. Do not use a hiring catalogue as an employee register.', 'Workforce register export, reconciliation date', 'People Operations'),
      item('corp.org-chart', 'Written organisation chart and reporting structure', 'Show departments, reporting lines and vacant positions. Mark open executive roles as vacant; do not present them as appointed.', 'Current org chart with effective date', 'CEO / People Operations'),
      item('corp.job-descriptions', 'Approved job descriptions and salary bands', 'Every role needs a written description, decision authority, location, classification and approved salary band. Bands are internal controls, not public promises.', 'Job-description pack, salary-band approval', 'People Operations / CFO', { launchCritical: true }),
      item('corp.contracts', 'Employment contracts appropriate to each jurisdiction', 'Use a local contract for each hiring country and state. Do not use one Delaware template for every location. Counsel must review the template before use.', 'Counsel-reviewed contract templates by jurisdiction', 'General Counsel / People Operations', { launchCritical: true }),
      item('corp.handbook', 'Employee handbook and workplace policies', 'Issue a handbook that covers conduct, security, leave, expenses, complaints, discipline and termination. Local addenda must override inconsistent global text.', 'Adopted handbook and local addenda', 'People Operations / General Counsel', { launchCritical: true }),
      item('corp.nda', 'Confidentiality and non-disclosure agreements', 'Every employee and contractor with access to company information signs an NDA. Do not rely on a policy acknowledgement as a substitute for a signed agreement.', 'Signed NDA in the personnel file', 'General Counsel'),
      item('corp.ip-assignment', 'Intellectual property and invention assignment agreements', 'Confirm present and past contributors assigned trademarks, source code, domain names, designs, content and inventions to the company. Resolve gaps before launch.', 'Signed IP assignments, chain-of-title review', 'General Counsel', { launchCritical: true }),
      item('corp.privacy', 'Data protection and employee privacy notices', 'Tell employees what personal data is collected, why, where it is stored, who can access it and how long it is kept. Collect identity, medical and financial data only for legitimate purposes.', 'Employee privacy notice, retention schedule, access matrix', 'Privacy / People Operations'),
      item('corp.discipline', 'Disciplinary, grievance and termination procedures', 'Publish a fair process, preserve records, and follow local notice and final-pay rules. Do not use a US at-will clause in a jurisdiction where it is ineffective.', 'Procedure, warning templates, local termination checklist', 'People Operations / General Counsel'),
      item('corp.records', 'Record-retention and secure personnel-file procedures', 'Restrict HR files to authorised people. Set retention periods by record type and jurisdiction. Do not keep identity documents in chat, email or unsecured drives.', 'Retention schedule, access list, storage location', 'People Operations / Security', { launchCritical: true }),
      item('corp.work-authorisation', 'Work authorisation and right-to-work process', 'Verify the right to work in the actual work location before the start date. Store only the required evidence and do not over-collect immigration data.', 'Verification procedure, completed check record', 'People Operations'),
      item('corp.counsel-review', 'Employment and securities counsel review', 'Have employment counsel review the handbook, contracts, policies and local addenda. Have securities counsel review any equity or option plan before it is promised.', 'Counsel engagement letter, review memo, approval reference', 'General Counsel', { launchCritical: true }),
      item('corp.onboarding', 'Personnel-file and onboarding procedure', 'Define what is collected before day one, what is signed on day one and who confirms completion. Link the procedure to the employee-file checklist.', 'Onboarding procedure, file checklist, owner', 'People Operations', { launchCritical: true }),
    ],
  },
  {
    id: 'payroll',
    title: 'Payroll, tax and compensation',
    blurb: 'Pay people correctly in their own country and currency. Platform credits are not salary, and a proposed token allocation is not compensation until it is approved and issued.',
    items: [
      item('payroll.provider', 'Payroll system for each employee country and currency', 'Select a payroll provider or employer-of-record arrangement that can withhold, file and pay in the employee’s location. Confirm the provider before the start date.', 'Provider agreement, country coverage, go-live date', 'CFO / People Operations', { launchCritical: true }),
      item('payroll.classification', 'Employee or independent-contractor classification', 'Apply the local classification test. Do not label a full-time controlled worker a contractor to avoid payroll. Document the analysis for every engagement.', 'Classification memo, contract type, local review', 'General Counsel / People Operations'),
      item('payroll.compensation', 'Salary, wages, commission and bonus policies', 'Set approval authority, timing, clawback rules and written commission terms. Do not promise discretionary bonuses or equity as if they were guaranteed.', 'Compensation policy, approved bands, plan documents', 'CFO / People Operations'),
      item('payroll.pay-frequency', 'Pay frequency and payslip process', 'Confirm the lawful pay frequency, payday, currency and payslip content for each location. Provide payslips where required.', 'Payroll calendar, payslip template, provider configuration', 'Payroll'),
      item('payroll.withholding', 'Tax withholding and employer payroll contributions', 'Withhold and remit income tax, social security, Medicare or local equivalents. Pay the employer share and file on time.', 'Registration numbers, filing calendar, remittance evidence', 'Payroll / Tax'),
      item('payroll.pension', 'Social security, pension or retirement contributions', 'Check mandatory pension, social insurance and retirement regimes. In Nigeria, confirm Pension Reform Act coverage and NSITF obligations with local counsel.', 'Pension registration, contribution schedule, local advice', 'Payroll / People Operations', { launchCritical: true }),
      item('payroll.overtime', 'Overtime, minimum-wage and working-time compliance', 'Identify exempt and non-exempt workers correctly. Record hours where required and pay overtime or provide lawful time off.', 'Classification list, timekeeping procedure, rate table', 'People Operations / Payroll'),
      item('payroll.leave', 'Leave and holiday pay calculations', 'Apply the employee’s work-location rules for annual leave, public holidays, sick leave, parental leave and final pay. Do not promise one global package without local review.', 'Leave policy, local addenda, accrual calculator', 'People Operations', { launchCritical: true }),
      item('payroll.expenses', 'Expense reimbursement rules', 'Require receipts, approval and a reasonable timeframe. Do not reimburse personal expenses without a business purpose.', 'Expense policy, approval workflow, reimbursement log', 'Finance'),
      item('payroll.final-pay', 'Final-pay and termination-payment procedures', 'Calculate unused leave, notice, commissions, deductions and statutory payments. Follow local timing rules and preserve the calculation.', 'Final-pay checklist, calculator, local counsel note', 'Payroll / People Operations'),
      item('payroll.records', 'Payroll records and tax filings', 'Keep payroll registers, payslips, filings and remittance evidence for the required period. Restrict access and back up the records.', 'Payroll register, filing archive, retention schedule', 'Payroll / Finance'),
      item('payroll.budget', 'Salary, benefits, payroll-tax and recruitment budget', 'Budget the fully loaded cost of each approved role, not just gross salary. Include employer taxes, pension, insurance, equipment and recruitment.', 'Approved workforce budget, scenario model', 'CFO'),
    ],
  },
  {
    id: 'protection',
    title: 'Workplace, health and employee protection',
    blurb: 'A remote-first company still has workplace obligations. The applicable rules depend on where the employee works and whether the company has a physical establishment there.',
    items: [
      item('protection.hs-policy', 'Workplace health and safety policy', 'Cover remote work, office work, ergonomics, emergency contact, incident reporting and the company’s duty to provide a safe working environment.', 'Adopted H&S policy, local addenda', 'People Operations / COO'),
      item('protection.risk-assessments', 'Risk assessments for office and remote work', 'Assess display-screen, ergonomic, electrical, fire, travel and lone-working risks. Review after an incident or a material change.', 'Risk-assessment register, review date', 'COO / People Operations'),
      item('protection.incident-reporting', 'Accident and incident reporting procedure', 'Give employees a clear route to report an injury, illness, security event or near miss. Record the report and the response.', 'Incident form, log, escalation path', 'People Operations / Security'),
      item('protection.emergency', 'Emergency contacts and response procedures', 'Keep current emergency contacts for each employee and a response procedure for medical, fire, security and travel emergencies. Respect privacy.', 'Emergency contact register, response plan', 'People Operations'),
      item('protection.harassment', 'Anti-harassment and anti-discrimination policy', 'Prohibit harassment, discrimination and retaliation. Provide multiple reporting routes and a fair investigation process. Local law may add protected characteristics and deadlines.', 'Adopted policy, reporting channels, investigator list', 'People Operations / General Counsel'),
      item('protection.equal-opportunity', 'Equal opportunity and fair recruitment policy', 'Use consistent, job-related criteria. Keep interview notes and reject candidates for documented, lawful reasons. Do not ask irrelevant sensitive questions.', 'Recruitment policy, interview scorecards, training record', 'People Operations'),
      item('protection.accommodation', 'Reasonable accommodation process', 'Where required, consider workplace adjustments for disability, pregnancy, religion or other protected needs. Assess each request individually and keep medical data confidential.', 'Accommodation request form, decision log', 'People Operations / General Counsel'),
      item('protection.whistleblowing', 'Employee complaint and whistleblowing channels', 'Provide a confidential route for fraud, misconduct, safety, security and compliance concerns. Prohibit retaliation and track resolution.', 'Whistleblowing policy, channel, case log', 'General Counsel / Compliance'),
      item('protection.workers-comp', 'Workers’ compensation or equivalent insurance', 'Confirm whether workers’ compensation, employer’s liability or another scheme applies in each work location. Do not assume Delaware coverage follows a remote employee.', 'Policy certificate, country/state coverage matrix', 'CFO / People Operations'),
      item('protection.insurance', 'Employer’s liability and relevant business insurance', 'Review employer’s liability, general liability, cyber, crime, professional indemnity and directors-and-officers cover. Confirm the entity and territory insured.', 'Insurance schedule, certificates, broker confirmation', 'CFO / General Counsel', { launchCritical: true }),
      item('protection.wellbeing', 'Mental wellbeing and workload-management procedures', 'Set expectations for hours, availability, escalation and time off. Train managers to spot overload and respond without diagnosing or collecting unnecessary medical data.', 'Wellbeing policy, manager guidance, support route', 'People Operations'),
    ],
  },
  {
    id: 'tech',
    title: 'Technology, information security and company property',
    blurb: 'TradingBible handles customer records, financial data, software and research. Access must be role-based, logged and removed when employment ends.',
    items: [
      item('tech.email', 'Company email accounts and identity management', 'Create a named company account for every employee. Do not use shared credentials or a personal mailbox for company business. Disable accounts on exit.', 'Identity-provider inventory, joiner/mover/leaver record', 'IT / Security', { launchCritical: true }),
      item('tech.access', 'Secure employee access to company systems', 'Grant the minimum access needed for the role. Document who approves access and review it at least quarterly.', 'Access matrix, approval log, review evidence', 'IT / Security'),
      item('tech.mfa', 'Multi-factor authentication', 'Require MFA for email, source control, cloud, admin, payroll, banking and password-manager accounts. Prefer phishing-resistant factors for administrators.', 'MFA configuration, enrolment report', 'IT / Security'),
      item('tech.rbac', 'Role-based permissions and access reviews', 'Define roles and entitlements. Review privileged access monthly and all access quarterly. Remove access on the same day as a termination.', 'Role catalogue, privileged-access review', 'IT / Security'),
      item('tech.devices', 'Company laptops or approved-device policy', 'Issue company devices or formally approve personal-device use with minimum security controls. Do not store customer data on unmanaged personal devices.', 'Device standard, issue register, approval record', 'IT / Security', { launchCritical: true }),
      item('tech.endpoint', 'Endpoint protection, encryption and patch management', 'Require disk encryption, screen lock, endpoint protection and timely patching. Verify compliance before granting access to sensitive systems.', 'Endpoint policy, compliance report', 'IT / Security'),
      item('tech.password-manager', 'Password manager and secure credential procedures', 'Use a company password manager and unique credentials. Never share passwords in chat or email. Rotate secrets after a suspected compromise.', 'Password-manager policy, vault ownership', 'IT / Security'),
      item('tech.vpn', 'VPN or approved secure remote-access arrangement', 'Use approved secure access for administrative and production systems. Do not expose databases or internal tools directly to the public internet.', 'Remote-access standard, network diagram', 'IT / Security'),
      item('tech.backup', 'Backup and disaster-recovery procedures', 'Back up critical data, test restoration and record recovery objectives. Protect backups with separate credentials and access controls.', 'Backup schedule, restore-test evidence', 'IT / Security'),
      item('tech.incident-response', 'Incident response and breach-reporting process', 'Define severity, roles, containment, notification and post-incident review. Include legal, privacy and customer-communication steps.', 'Incident-response plan, contact tree, test record', 'Security / General Counsel'),
      item('tech.acceptable-use', 'Acceptable-use and internet-use policy', 'Set rules for company systems, personal use, prohibited content, monitoring, AI tools and return of property. Do not promise privacy that the company cannot provide.', 'Adopted acceptable-use policy, acknowledgement', 'IT / Security / People Operations', { launchCritical: true }),
      item('tech.ai-data', 'Rules for AI tools, source code, customer data and confidential information', 'Prohibit entering customer data, credentials, source code or material non-public information into unapproved AI tools. Require human review of AI-generated output.', 'AI-use policy, approved-tool list, training record', 'Security / Engineering / Compliance'),
      item('tech.asset-register', 'Asset register for laptops, phones, security keys and equipment', 'Record serial numbers, assigned user, location and return status. Reconcile the register periodically.', 'Asset register, reconciliation date', 'IT / Finance'),
      item('tech.offboarding', 'Equipment return and access-revocation process', 'Disable accounts, revoke tokens, recover devices and keys, transfer data and record completion on the exit date. Do not rely on a verbal handover.', 'Offboarding checklist, revocation evidence', 'IT / Security / People Operations', { launchCritical: true }),
    ],
  },
  {
    id: 'mgmt',
    title: 'Management and performance',
    blurb: 'Every employee needs a manager, written responsibilities, measurable objectives, regular feedback and a fair process for concerns and development.',
    items: [
      item('mgmt.departments', 'Clear departments and reporting lines', 'Publish departments, remits and reporting lines. Name an accountable manager for every function, including vacant roles covered on an interim basis.', 'Org chart, department remits', 'CEO / People Operations'),
      item('mgmt.manager', 'A manager assigned to every employee', 'No employee should report to nobody. Record the manager, backup manager and escalation route in the personnel file.', 'Manager assignment in the workforce register', 'People Operations'),
      item('mgmt.onboarding', 'Probation and onboarding procedures', 'Set a structured first week, 30/60/90-day plan, probation review (where lawful) and confirmation of policy acknowledgements and training.', 'Onboarding checklist, probation template', 'People Operations / Manager', { launchCritical: true }),
      item('mgmt.objectives', 'Measurable job objectives and key performance indicators', 'Translate the job description into measurable outcomes. Review targets when priorities change; do not use impossible targets to force an exit.', 'Role scorecard, objective-setting record', 'Manager / People Operations', { launchCritical: true }),
      item('mgmt.one-to-ones', 'Regular one-to-one meetings', 'Hold documented one-to-ones at least monthly. Cover priorities, blockers, wellbeing, development and feedback. Keep notes proportionate and professional.', 'One-to-one template, meeting cadence', 'Manager'),
      item('mgmt.reviews', 'Performance reviews and promotion criteria', 'Use a consistent review cycle and written criteria for promotion, bonus and performance improvement. Separate performance from protected characteristics.', 'Review cycle, rating guide, promotion criteria', 'People Operations'),
      item('mgmt.training', 'Training and professional-development budget', 'Provide role, security, compliance and management training. Record completion and allocate a budget rather than promising unlimited development.', 'Training plan, budget, completion record', 'People Operations / CFO', { launchCritical: true }),
      item('mgmt.attendance', 'Attendance, working-hours and time-off procedures', 'Record hours where required, set availability expectations and provide a clear leave-request route. Respect local rest-period and holiday rules.', 'Time-off policy, request workflow, attendance record', 'People Operations'),
      item('mgmt.spending', 'Formal approval process for spending and commitments', 'Set thresholds, approvers and conflict-of-interest rules. Require written approval before an employee commits the company to a supplier, lease or contract.', 'Delegation of authority, approval matrix', 'CFO / COO'),
      item('mgmt.succession', 'Succession and business-continuity planning', 'Identify key-person dependencies and interim coverage for executive, security, finance and product roles. Test the plan.', 'Succession map, continuity plan, test date', 'CEO / COO'),
    ],
  },
]);

export const EMPLOYER_ITEMS = EMPLOYER_SECTIONS.flatMap((section) =>
  section.items.map((row) => ({ ...row, sectionId: section.id, sectionTitle: section.title })),
);

export const EMPLOYEE_SECTIONS = Object.freeze([
  {
    id: 'personal',
    title: 'Personal and employment documents',
    blurb: 'Collect only what is necessary for the role and the work location. Identity, medical, financial and immigration records belong in a restricted personnel file, not in chat or email.',
    items: [
      item('personal.id', 'Government-issued identification', 'Verify identity before the start date. Record the document type and verification date; do not email a copy to an unrestricted mailbox.', 'Verification record in the controlled HR file', 'People Operations'),
      item('personal.contact', 'Correct legal name, residential address and contact details', 'Use the legal name for payroll and tax. Keep a separate preferred name for day-to-day use.', 'Employee profile and payroll record', 'People Operations'),
      item('personal.emergency', 'Emergency contact', 'Record at least one emergency contact and confirm the employee is comfortable with the company holding it.', 'Emergency-contact record', 'People Operations'),
      item('personal.cv', 'CV or employment application', 'Keep the application, CV and interview record used for the hiring decision. Retain according to the records schedule.', 'Application record', 'People Operations'),
      item('personal.qualifications', 'Verified qualifications and professional certifications', 'Verify only where the role requires a qualification or licence. Do not ask for irrelevant educational records.', 'Verification note and certificate reference', 'People Operations'),
      item('personal.work-authorisation', 'Evidence of legal right to work in the country of employment', 'Complete the local right-to-work check before day one. Do not assume a US work authorisation covers a role performed in another country.', 'Completed right-to-work check', 'People Operations'),
      item('personal.contract', 'Signed employment contract', 'Use the local contract and any addendum. Record the version signed and the effective date.', 'Signed contract in the personnel file', 'People Operations / General Counsel'),
      item('personal.nda', 'Signed confidentiality agreement', 'The NDA must be signed before access to confidential information, customer data or source code.', 'Signed NDA', 'General Counsel'),
      item('personal.ip', 'Signed intellectual-property and invention-assignment agreement', 'Cover present and future work, inventions, code, content and designs. Follow local employee-invention rules.', 'Signed IP assignment', 'General Counsel'),
      item('personal.aup', 'Signed acceptable-use and information-security acknowledgement', 'The acknowledgement must reference the current policy version and the consequences of non-compliance.', 'Signed acknowledgement', 'IT / Security'),
      item('personal.bank', 'Bank or approved payment details', 'Collect through the payroll provider’s secure channel. Do not store full bank details in a spreadsheet or chat.', 'Payroll-provider confirmation', 'Payroll'),
      item('personal.tax', 'Tax and payroll forms required in the employee’s jurisdiction', 'Collect the local forms before the first payroll run. Keep tax identifiers restricted.', 'Payroll-provider confirmation', 'Payroll'),
      item('personal.licence', 'Role-specific licence or background check', 'Only where legally required and proportionate to the role. Follow local background-check and adverse-action rules.', 'Licence copy or check reference', 'People Operations / General Counsel'),
    ],
  },
  {
    id: 'equipment',
    title: 'Equipment and work tools',
    blurb: 'Issue the tools required for the role or formally approve personal-device use. Customer data, passwords, source code and confidential documents must not live in personal, unsecured accounts.',
    items: [
      item('equipment.laptop', 'Company-approved laptop or workstation', 'Record the asset tag, serial number and assignment date. Confirm encryption and endpoint protection before use.', 'Asset register entry', 'IT'),
      item('equipment.internet', 'Reliable internet connection', 'Confirm the employee can perform the role reliably. Reimburse approved connectivity costs only under policy.', 'Manager confirmation', 'Manager'),
      item('equipment.email', 'Company email account', 'Use a named company identity. Do not forward company mail to a personal inbox.', 'Identity-provider record', 'IT'),
      item('equipment.comms', 'Approved communication and meeting tools', 'Use company-approved tools for company business. Do not use personal messaging accounts for customer or confidential data.', 'Tool access record', 'IT'),
      item('equipment.project', 'Access to the project-management system', 'Grant role-appropriate access and confirm the employee can see the work plan, owners and deadlines.', 'Project-system membership', 'Manager / IT'),
      item('equipment.role-software', 'Access to role-specific software', 'Provision only the licences and permissions needed for the role. Review on role change or exit.', 'Licence and access record', 'IT / Manager'),
      item('equipment.password-mfa', 'Secure password manager and multi-factor authentication', 'Enrol before granting access to email, source control, cloud, payroll or admin systems.', 'Enrolment evidence', 'IT / Security'),
      item('equipment.storage', 'Approved storage for company files', 'Use company-managed storage with access controls and backup. Do not use personal drives for company records.', 'Storage access record', 'IT / Security'),
      item('equipment.headset', 'Headset, webcam and other equipment where necessary', 'Provide or approve the equipment needed for the role. Record serial numbers for return.', 'Asset register entry', 'IT'),
      item('equipment.id', 'Company identification or access credentials', 'Issue a staff ID or access credential where needed. Record the credential number and return it on exit.', 'ID-card or access record', 'People Operations / Security'),
    ],
  },
  {
    id: 'professional',
    title: 'Professional obligations',
    blurb: 'Every employee must understand the job, protect company and customer information, follow security procedures, declare conflicts and report misconduct.',
    items: [
      item('professional.job-description', 'Understand and follow the job description', 'The employee acknowledges the current job description, reporting line and decision authority.', 'Signed acknowledgement', 'Manager'),
      item('professional.standards', 'Complete assigned work to the agreed standard', 'Set quality expectations and review work against them. Do not accept unreviewed AI output in customer-facing or regulated work.', 'Objective and review record', 'Manager'),
      item('professional.deadlines', 'Meet deadlines and communicate delays early', 'Escalate material delays before they become missed commitments. Record changes to agreed dates.', 'Project record or one-to-one note', 'Manager'),
      item('professional.meetings', 'Attend required meetings and training', 'Record mandatory training and meeting participation where it affects the role or compliance obligations.', 'Training and attendance record', 'Manager / People Operations'),
      item('professional.time-records', 'Keep accurate work and time records where required', 'Use the approved timekeeping method. Do not record hours that were not worked or pressure others to do so.', 'Timekeeping record', 'Manager / Payroll'),
      item('professional.confidentiality', 'Protect company and customer information', 'Follow the NDA, access controls and data-classification rules. Report a suspected disclosure immediately.', 'Acknowledgement and incident record', 'Security / General Counsel'),
      item('professional.security', 'Follow security and data-protection procedures', 'Use MFA, approved storage and clean-desk practices. Report lost devices, phishing and suspected account compromise.', 'Security training completion', 'Security'),
      item('professional.conflicts', 'Declare conflicts of interest', 'Disclose outside business interests, family relationships, gifts and personal trading that could conflict with the role.', 'Annual conflict declaration', 'People Operations / Compliance'),
      item('professional.gifts', 'Disclose gifts, commissions or outside business interests where required', 'Follow the gifts-and-entertainment policy and record anything above the approval threshold.', 'Gift register or declaration', 'Compliance'),
      item('professional.expenses', 'Use company funds and equipment responsibly', 'Submit accurate expenses with receipts and business purpose. Do not use company funds for personal benefit.', 'Expense approvals and audit record', 'Finance'),
      item('professional.misconduct', 'Report suspected fraud, misconduct, security incidents and compliance concerns', 'Use the confidential reporting channel. Retaliation is prohibited.', 'Policy acknowledgement and reporting-channel record', 'General Counsel / Compliance'),
      item('professional.professionalism', 'Treat colleagues, customers and partners professionally', 'Follow the anti-harassment and equal-opportunity policies. Promote a workplace free of discrimination and retaliation.', 'Policy acknowledgement', 'People Operations'),
      item('professional.return', 'Return company property and access credentials when employment ends', 'Complete the offboarding checklist, return devices and keys, and confirm access revocation.', 'Offboarding record', 'IT / People Operations'),
    ],
  },
  {
    id: 'performance',
    title: 'Employee performance requirements',
    blurb: 'Each person needs a clear title, manager, authority, objectives, development plan and a route to raise concerns. Review requirements change when the role changes.',
    items: [
      item('performance.title-manager', 'Clear job title and reporting manager', 'Record the title, manager and department in the workforce register. A vacant manager position needs a named interim manager.', 'Workforce register', 'People Operations'),
      item('performance.authority', 'Written responsibilities and decision-making authority', 'State what the employee can approve, spend, publish or commit without escalation. Update on promotion or role change.', 'Job description and delegation record', 'Manager / CFO'),
      item('performance.probation', 'Probation or initial assessment period, if applicable', 'Use only where lawful. Set the review date, criteria and support. Do not use probation to avoid notice or statutory rights.', 'Probation terms and review record', 'People Operations / Manager'),
      item('performance.targets', 'Measurable performance targets', 'Agree role-specific outcomes and a review cadence. Targets must be achievable with the available tools and authority.', 'Scorecard and objective record', 'Manager'),
      item('performance.training', 'Training and development plan', 'Identify mandatory compliance, security and role training plus a development budget or plan.', 'Training plan and completion record', 'Manager / People Operations'),
      item('performance.feedback', 'Regular feedback and performance reviews', 'Hold regular one-to-ones and a documented review cycle. Give the employee a chance to respond.', 'One-to-one and review records', 'Manager'),
      item('performance.leave-expenses', 'Clear process for requesting leave, expenses and support', 'Publish the request routes, approvers and response times. Provide an accommodation and wellbeing route where required.', 'Policy and workflow record', 'People Operations'),
      item('performance.concerns', 'Route for raising concerns or reporting misconduct', 'Give the employee a confidential route to People Operations, Legal or the whistleblowing channel, including an escalation route if the concern involves their manager.', 'Policy acknowledgement and channel list', 'People Operations / General Counsel'),
    ],
  },
]);

export const JURISDICTION_EMPLOYEE_ITEMS = Object.freeze([
  item('us.i9', 'US Form I-9 employment-eligibility verification', 'Complete Form I-9 within the lawful timeframe. Review original documents or use an authorised alternative; do not accept expired or unrelated documents.', 'Completed I-9 and reverification calendar', 'People Operations', { jurisdiction: 'US' }),
  item('us.w4', 'US Form W-4 and state withholding elections', 'Collect the federal and applicable state withholding forms before the first payroll run. Let the employee update elections under the provider’s process.', 'Payroll-provider record', 'Payroll', { jurisdiction: 'US' }),
  item('us.state-payroll', 'State payroll, unemployment and disability registrations', 'Register in each state where the employee works. Do not assume the Delaware registration covers a remote employee in another state.', 'State registration confirmations', 'Payroll / Tax', { jurisdiction: 'US' }),
  item('us.workers-comp', 'State workers’ compensation or equivalent coverage', 'Confirm coverage in the employee’s work state. Some states require a specific policy or posting.', 'Certificate of coverage', 'CFO / People Operations', { jurisdiction: 'US' }),
  item('us.notices', 'Required federal, state and local workplace notices', 'Provide the notices required at the work location. Remote employees may need electronic delivery plus a physical posting at an office.', 'Notice-delivery record', 'People Operations', { jurisdiction: 'US' }),
  item('ng.contract-particulars', 'Nigerian written employment particulars', 'Issue written terms covering the parties, job, remuneration, payment arrangements, hours, leave, sick pay and termination notice, with any locally required additions.', 'Signed Nigerian contract', 'People Operations / Local counsel', { jurisdiction: 'NG' }),
  item('ng.paye', 'PAYE tax deductions and remittances', 'Register with the relevant tax authority, deduct PAYE and remit on the required schedule. Keep evidence of each remittance.', 'PAYE registration and remittance record', 'Payroll / Tax', { jurisdiction: 'NG' }),
  item('ng.pension', 'Contributory pension assessment and registration', 'Confirm whether the company and employee are covered by the Pension Reform Act. Where covered, operate the required employer and employee contributions through an approved arrangement.', 'Pension registration and contribution schedule', 'Payroll / People Operations', { jurisdiction: 'NG' }),
  item('ng.nsitf', 'NSITF / Employees’ Compensation Scheme', 'Confirm registration and the applicable payroll contribution for workplace injury and occupational disease protection.', 'NSITF registration and remittance evidence', 'Payroll / People Operations', { jurisdiction: 'NG' }),
  item('ng.data-protection', 'Nigerian data-protection compliance', 'Apply the applicable data-protection rules to employee identity, payroll, medical and performance records. Limit access and set retention.', 'Privacy notice and records map', 'Privacy / People Operations', { jurisdiction: 'NG' }),
  item('ng.bank', 'Nigerian bank account for salary payment', 'Collect account details through the payroll provider’s secure channel. Confirm the account belongs to the employee.', 'Payroll-provider confirmation', 'Payroll', { jurisdiction: 'NG' }),
  item('ng.tax-id', 'Tax identification and pension details', 'Collect the employee’s tax identifier and pension details where applicable. Keep them restricted.', 'Payroll-provider record', 'Payroll', { jurisdiction: 'NG' }),
  item('ng.leave', 'Nigerian leave, working-hours and termination rules', 'Apply the local leave, rest, notice and termination rules. Do not rely on the Delaware handbook where local law is more protective.', 'Local addendum and leave record', 'People Operations / Local counsel', { jurisdiction: 'NG' }),
]);

export const EMPLOYEE_ITEMS = [...EMPLOYEE_SECTIONS.flatMap((section) =>
  section.items.map((row) => ({ ...row, sectionId: section.id, sectionTitle: section.title })),
), ...JURISDICTION_EMPLOYEE_ITEMS.map((row) => ({
  ...row,
  sectionId: row.jurisdiction === 'US' ? 'us' : 'ng',
  sectionTitle: row.jurisdiction === 'US' ? 'United States requirements' : 'Nigeria requirements',
}))];

export const JURISDICTIONS = Object.freeze([
  {
    id: 'US',
    label: 'United States',
    flag: 'US',
    summary: 'Federal rules apply nationwide, then the state and local rules where the employee actually works. Delaware incorporation does not replace state payroll, withholding, insurance or leave registrations.',
    employer: [
      'Use the company EIN for employment-tax administration and keep the IRS notices.',
      'Complete employment-eligibility verification, including Form I-9, and retain the record.',
      'Collect Form W-4 and applicable state withholding elections.',
      'Withhold and remit federal income tax, Social Security and Medicare; pay the employer share.',
      'Handle federal unemployment tax and register for applicable state unemployment and disability programmes.',
      'Follow minimum-wage, overtime, working-time and recordkeeping rules.',
      'Provide required workplace notices and follow anti-discrimination, accommodation and anti-retaliation law.',
      'Confirm state-specific paid leave, workers’ compensation and disability requirements.',
    ],
    employee: [
      'Provide the documentation required for Form I-9 within the lawful timeframe.',
      'Submit Form W-4 and applicable state withholding forms.',
      'Provide accurate payroll, tax and work-authorisation information.',
      'Record working hours accurately where required.',
      'Follow applicable federal, state and local workplace rules.',
    ],
    sources: ['IRS employer tax guidance', 'US Department of Labor wage and hour guidance', 'EEOC employer guidance'],
    caution: 'State and local rules can be more protective than federal law. Confirm the law of the employee’s actual work location before the start date.',
  },
  {
    id: 'NG',
    label: 'Nigeria',
    flag: 'NG',
    summary: 'A US company employing someone who works in Nigeria must establish an appropriate Nigerian employment and payroll arrangement. Delaware incorporation does not remove Nigerian employment, tax, pension, social-insurance or data-protection obligations.',
    employer: [
      'Use a legally appropriate employment arrangement and issue written terms with the required particulars.',
      'Maintain employee and payroll records in accordance with Nigerian requirements.',
      'Operate PAYE deductions and remittances with the relevant tax authority.',
      'Assess whether the company and employee fall under the mandatory contributory pension regime and register where required.',
      'Assess NSITF registration and the Employees’ Compensation Scheme contribution.',
      'Meet applicable workplace safety and employee-compensation obligations.',
      'Follow Nigerian leave, working-hours and termination rules.',
      'Apply Nigerian data-protection requirements to employee records.',
    ],
    employee: [
      'Provide accurate identity, tax and payroll information.',
      'Provide tax-identification and pension details where applicable.',
      'Provide a valid bank account for salary payment.',
      'Sign the employment contract and relevant company policies.',
      'Follow security, confidentiality and data-handling requirements.',
      'Complete required work and training.',
      'Report workplace incidents and compliance concerns.',
    ],
    sources: ['Pension Reform Act and National Pension Commission guidance', 'NSITF Employees’ Compensation Scheme guidance', 'Nigerian tax and data-protection guidance', 'Local employment counsel'],
    caution: 'Pension coverage, contribution rates, NSITF contributions and written-particulars requirements depend on the current law and the employment arrangement. Confirm with Nigerian counsel before the first payroll run. The commonly stated pension contribution reference is 10% employer and 8% employee for covered employees; do not treat that as a conclusion for every worker.',
  },
  {
    id: 'OTHER',
    label: 'Other countries',
    flag: 'INT',
    summary: 'Do not use a US or Nigerian template for another country. Engage local employment counsel and a payroll provider before making an offer or setting a start date.',
    employer: [
      'Confirm the lawful employing entity or an employer-of-record arrangement.',
      'Obtain a local contract, mandatory particulars and language requirements.',
      'Confirm payroll, tax, social security, pension, insurance and workers’ compensation.',
      'Confirm working time, leave, probation, termination and works-council rules.',
      'Confirm data-protection, background-check and monitoring rules.',
    ],
    employee: [
      'Provide the identity, right-to-work, tax and payroll documents required locally.',
      'Sign the local contract and policy acknowledgements.',
      'Complete mandatory local training and health-and-safety induction.',
    ],
    sources: ['Local employment counsel', 'Local payroll provider', 'Local regulator guidance'],
    caution: 'This register does not provide a legal conclusion for any country outside the United States and Nigeria.',
  },
]);

export const DEPARTMENTS = Object.freeze([
  { id: 'executive', name: 'Executive management', responsibility: 'Set strategy, approve budgets, supervise departments and report to the board. Do not present a vacant executive role as appointed.' },
  { id: 'engineering', name: 'Engineering and product', responsibility: 'Build, maintain, test and document the platform. Keep release, security and change records.' },
  { id: 'security', name: 'Cybersecurity and IT', responsibility: 'Protect infrastructure, accounts, devices and customer data. Operate access reviews, incident response and recovery.' },
  { id: 'quant', name: 'Quantitative research', responsibility: 'Develop and validate analytical methods. Document assumptions, limitations and model risk.' },
  { id: 'ai', name: 'AI and data', responsibility: 'Maintain AI systems, data quality, testing and monitoring. Keep human review for customer-facing and regulated output.' },
  { id: 'terminal', name: 'Trading terminal', responsibility: 'Maintain charting, indicators, heatmaps and order-flow features without presenting the company as a broker or exchange.' },
  { id: 'broker', name: 'Broker integration', responsibility: 'Maintain authorised, secure and appropriately scoped broker connections. Never imply a connection or permission that does not exist.' },
  { id: 'support', name: 'Customer support', responsibility: 'Resolve customer issues, maintain case records and escalate complaints. Do not give personalised investment advice without authorisation.' },
  { id: 'academy', name: 'Academy and education', responsibility: 'Manage educational material, instructors and student support. Academy learners and instructors are product users, not employees.' },
  { id: 'marketing', name: 'Marketing and media', responsibility: 'Manage brand, campaigns, content and approved advertising. Do not promise investment returns or guaranteed payouts.' },
  { id: 'sales', name: 'Sales and partnerships', responsibility: 'Manage commercial leads, proposals, contracts and partner relationships. Record conflicts and do not promise unapproved terms.' },
  { id: 'finance', name: 'Finance and accounting', responsibility: 'Maintain books, budgets, payroll, financial controls and reporting. Separate payroll duties and require approvals.' },
  { id: 'legal', name: 'Legal and compliance', responsibility: 'Review contracts, privacy, marketing claims, regulatory boundaries and complaints. Maintain the issue and approval record.' },
  { id: 'people', name: 'Human resources', responsibility: 'Recruitment, onboarding, records, performance, training and offboarding. Protect confidential employee data.' },
]);

export const BENEFIT_TIERS = Object.freeze([
  {
    id: 'standard',
    name: 'Standard',
    status: 'proposed',
    note: 'A proposed framework. It is not an existing entitlement and requires board approval and local-law review.',
    items: [
      ['Competitive salary', 'Yes, subject to the approved role band'],
      ['Statutory leave', 'Yes, as required by the work location'],
      ['Work equipment', 'Company-approved device or approved personal-device arrangement'],
      ['Training budget', 'Basic role and mandatory compliance training'],
      ['Health insurance', 'Consider; confirm local requirements and cost'],
      ['Pension/retirement', 'Where required by law'],
      ['Performance bonus', 'Role-dependent; written plan required'],
      ['Equity or stock options', 'Not automatic; requires an approved plan'],
      ['Professional memberships', 'Not included by default'],
      ['Relocation support', 'Not included by default'],
    ],
  },
  {
    id: 'professional',
    name: 'Professional',
    status: 'proposed',
    note: 'A proposed framework for selected roles. No benefit exists until it is approved in writing and the plan or policy is adopted.',
    items: [
      ['Competitive salary', 'Yes, subject to the approved role band'],
      ['Statutory leave', 'Yes, as required by the work location'],
      ['Work equipment', 'Company-issued device and approved peripherals'],
      ['Training budget', 'Enhanced role and leadership training'],
      ['Health insurance', 'Yes, subject to local plan availability and approval'],
      ['Pension/retirement', 'Where required by law'],
      ['Performance bonus', 'Target-based; written plan required'],
      ['Equity or stock options', 'Select roles only; requires an approved plan'],
      ['Professional memberships', 'Consider for approved roles'],
      ['Relocation support', 'Selected roles only'],
    ],
  },
  {
    id: 'executive',
    name: 'Executive',
    status: 'proposed',
    note: 'A proposed framework for approved executive appointments. Board approval, definitive documents and securities-law review are required before any promise.',
    items: [
      ['Competitive salary', 'Yes, subject to the approved executive band'],
      ['Statutory leave', 'Yes, as required by the work location'],
      ['Work equipment', 'Company-issued device and approved peripherals'],
      ['Training budget', 'Enhanced executive development'],
      ['Health insurance', 'Yes, subject to local plan availability and approval'],
      ['Pension/retirement', 'Where required by law'],
      ['Performance bonus', 'Target-based; written plan required'],
      ['Equity or stock options', 'Selected executives only; board and securities approval required'],
      ['Professional memberships', 'Consider for approved roles'],
      ['Relocation support', 'Selected roles only'],
    ],
  },
]);

export const LAUNCH_CHECKLIST = Object.freeze([
  { id: 'launch.ein', title: 'Confirm EIN issued and retain the notice', employerItemId: 'corp.ein' },
  { id: 'launch.registered-agent', title: 'Confirm registered agent and corporate records', employerItemId: 'corp.registered-agent' },
  { id: 'launch.ip', title: 'Resolve trademark, source-code, domain and design IP assignments', employerItemId: 'corp.ip-assignment' },
  { id: 'launch.counsel', title: 'Have employment and securities counsel review the employment documents', employerItemId: 'corp.counsel-review' },
  { id: 'launch.handbook', title: 'Create the employee handbook', employerItemId: 'corp.handbook' },
  { id: 'launch.contracts', title: 'Prepare employment contract templates for each hiring jurisdiction', employerItemId: 'corp.contracts' },
  { id: 'launch.nda', title: 'Prepare the NDA and IP assignment', employerItemId: 'corp.nda' },
  { id: 'launch.job-descriptions', title: 'Create job descriptions and salary bands', employerItemId: 'corp.job-descriptions' },
  { id: 'launch.personnel-file', title: 'Set up personnel-file and onboarding procedures', employerItemId: 'corp.onboarding' },
  { id: 'launch.payroll-provider', title: 'Select a payroll provider for each country', employerItemId: 'payroll.provider' },
  { id: 'launch.tax', title: 'Confirm tax and payroll registrations', employerItemId: 'payroll.withholding' },
  { id: 'launch.pension', title: 'Check pension and employee-compensation obligations', employerItemId: 'payroll.pension' },
  { id: 'launch.insurance', title: 'Arrange required insurance', employerItemId: 'protection.insurance' },
  { id: 'launch.leave', title: 'Set up leave, attendance and expense systems', employerItemId: 'payroll.leave' },
  { id: 'launch.email', title: 'Set up company email and access controls', employerItemId: 'tech.email' },
  { id: 'launch.devices', title: 'Prepare approved devices and security policy', employerItemId: 'tech.devices' },
  { id: 'launch.reporting', title: 'Create reporting lines and performance targets', employerItemId: 'mgmt.objectives' },
  { id: 'launch.onboarding', title: 'Prepare onboarding and training programme', employerItemId: 'mgmt.onboarding' },
  { id: 'launch.offboarding', title: 'Create offboarding and access-revocation procedure', employerItemId: 'tech.offboarding' },
]);

export const ONBOARDING_ITEMS = Object.freeze([
  { id: 'onboard.role-approval', title: 'Role, budget and hiring authority approved', owner: 'Manager / CFO', when: 'Before offer' },
  { id: 'onboard.classification', title: 'Employee or contractor classification confirmed for the work country', owner: 'People Operations / Counsel', when: 'Before offer' },
  { id: 'onboard.contract', title: 'Local employment contract and addenda prepared', owner: 'People Operations / Counsel', when: 'Before offer' },
  { id: 'onboard.docs', title: 'Identity, right-to-work and payroll documents verified', owner: 'People Operations', when: 'Before first day' },
  { id: 'onboard.agreements', title: 'NDA, IP assignment, acceptable-use and policy acknowledgements signed', owner: 'People Operations', when: 'Before first day' },
  { id: 'onboard.equipment', title: 'Device, account, email, MFA and role software provisioned', owner: 'IT / Security', when: 'Before first day' },
  { id: 'onboard.manager', title: 'Manager, buddy and escalation route assigned', owner: 'People Operations', when: 'Before first day' },
  { id: 'onboard.payroll', title: 'Payroll record, tax forms and bank details confirmed', owner: 'Payroll', when: 'Before first payroll' },
  { id: 'onboard.induction', title: 'Company induction, security training and code of conduct completed', owner: 'People Operations / Security', when: 'First day' },
  { id: 'onboard.job-description', title: 'Job description, authority and 30/60/90-day objectives acknowledged', owner: 'Manager', when: 'First week' },
  { id: 'onboard.health-safety', title: 'Health-and-safety and remote-work risk assessment completed', owner: 'People Operations', when: 'First week' },
  { id: 'onboard.conflicts', title: 'Conflict-of-interest and outside-business declaration completed', owner: 'Compliance', when: 'First week' },
  { id: 'onboard.probation', title: 'Probation or initial assessment date and criteria recorded (where lawful)', owner: 'Manager / People Operations', when: 'First week' },
  { id: 'onboard.training', title: 'Mandatory role, compliance and security training plan assigned', owner: 'People Operations', when: 'First month' },
  { id: 'onboard.one-to-one', title: 'First one-to-one and 30-day check-in completed', owner: 'Manager', when: 'First month' },
  { id: 'onboard.file', title: 'Personnel file completeness confirmed', owner: 'People Operations', when: 'First month' },
]);

export const OFFBOARDING_ITEMS = Object.freeze([
  { id: 'offboard.decision', title: 'Lawful termination or resignation basis and effective date documented', owner: 'People Operations / Counsel', when: 'Before notice' },
  { id: 'offboard.notice', title: 'Local notice, consultation and termination procedure followed', owner: 'People Operations / Counsel', when: 'Before notice' },
  { id: 'offboard.final-pay', title: 'Final pay, leave, commission and statutory deductions calculated', owner: 'Payroll', when: 'Exit date' },
  { id: 'offboard.benefits', title: 'Benefits, pension and insurance discontinuation or transfer confirmed', owner: 'People Operations', when: 'Exit date' },
  { id: 'offboard.access', title: 'Email, SSO, source control, cloud, admin and payment access revoked', owner: 'IT / Security', when: 'Exit date' },
  { id: 'offboard.tokens', title: 'API keys, tokens, certificates and shared secrets rotated or revoked', owner: 'Security', when: 'Exit date' },
  { id: 'offboard.devices', title: 'Laptop, phone, security keys, ID card and equipment returned', owner: 'IT / People Operations', when: 'Exit date' },
  { id: 'offboard.data', title: 'Company data transferred and personal copies removed under supervision', owner: 'Manager / Security', when: 'Exit date' },
  { id: 'offboard.knowledge', title: 'Handover, documentation and open commitments transferred', owner: 'Manager', when: 'Exit date' },
  { id: 'offboard.records', title: 'Personnel, payroll and termination records preserved under the retention schedule', owner: 'People Operations', when: 'After exit' },
  { id: 'offboard.references', title: 'Reference and confirmation-of-employment policy explained', owner: 'People Operations', when: 'After exit' },
  { id: 'offboard.review', title: 'Exit interview and access-revocation audit completed', owner: 'People Operations / Security', when: 'After exit' },
]);

export const WORKFORCE_CADENCE = Object.freeze([
  { frequency: 'Before hiring', activity: 'Approve the role, budget, contract, classification, work location and hiring authority. Confirm the payroll and insurance route.' },
  { frequency: 'Before first day', activity: 'Verify documents, sign agreements, prepare equipment and access, and confirm the manager and first-week plan.' },
  { frequency: 'First day', activity: 'Complete induction, security setup, policy acknowledgements, health-and-safety induction and payroll confirmation.' },
  { frequency: 'Every working day', activity: 'Manage work, support the employee, address urgent issues and record material decisions.' },
  { frequency: 'Every payday', activity: 'Calculate and pay wages, issue required payslips and process lawful deductions.' },
  { frequency: 'Monthly', activity: 'Reconcile payroll, taxes, pension and contributions; review attendance, expenses and access permissions; hold one-to-ones.' },
  { frequency: 'Quarterly', activity: 'Review performance, training, workforce risks, access and the budget.' },
  { frequency: 'Annually', activity: 'Review salaries, contracts, benefits, policies, insurance and compliance; refresh the handbook and local addenda.' },
  { frequency: 'At termination', activity: 'Calculate final entitlements, collect property, revoke access and preserve records.' },
]);

export const RECORD_CATEGORIES = Object.freeze([
  {
    id: 'employer',
    title: 'Employer and corporate records',
    items: ['Corporate registration and EIN records', 'Payroll registrations and tax filings', 'Insurance policies', 'Employment policies and handbook', 'Organisation chart and approved job descriptions', 'Workplace safety and risk records'],
  },
  {
    id: 'employee',
    title: 'Individual employee file',
    items: ['Application and CV', 'Identity and work-authorisation records', 'Signed employment contract', 'NDA and IP assignment', 'Tax and payroll forms', 'Emergency contact', 'Training acknowledgements', 'Performance reviews', 'Leave and attendance records', 'Disciplinary or grievance records where applicable'],
  },
  {
    id: 'payroll',
    title: 'Payroll and benefits records',
    items: ['Salary register', 'Payslips', 'Tax deductions and remittances', 'Pension contributions', 'Insurance and benefit enrolments', 'Approved expenses', 'Final-pay calculations'],
  },
]);

export const POLICY_DOCUMENTS = Object.freeze([
  { id: 'handbook', title: 'Employee Handbook', file: '01-EMPLOYEE-HANDBOOK.md', version: '1.0 · 12 November 2026', appliesTo: 'All employees and contractors', owner: 'People Operations / General Counsel' },
  { id: 'us-contract', title: 'US Employment Contract Template', file: '02-EMPLOYMENT-CONTRACT-US.md', version: '1.0 · 12 November 2026', appliesTo: 'US employees; state addendum required', owner: 'General Counsel' },
  { id: 'ng-contract', title: 'Nigeria Employment Contract Template', file: '03-EMPLOYMENT-CONTRACT-NIGERIA.md', version: '1.0 · 12 November 2026', appliesTo: 'Nigeria employees; local counsel review required', owner: 'General Counsel' },
  { id: 'nda-ip', title: 'Confidentiality and IP Assignment Pack', file: '04-NDA-IP-ASSIGNMENT.md', version: '1.0 · 12 November 2026', appliesTo: 'All employees and contractors', owner: 'General Counsel' },
  { id: 'security', title: 'Acceptable Use and Information Security Policy', file: '05-ACCEPTABLE-USE-AND-SECURITY.md', version: '1.0 · 12 November 2026', appliesTo: 'All employees and contractors', owner: 'Security / General Counsel' },
  { id: 'onboarding', title: 'Onboarding Pack', file: '06-ONBOARDING-PACK.md', version: '1.0 · 12 November 2026', appliesTo: 'All new employees', owner: 'People Operations' },
  { id: 'offboarding', title: 'Offboarding and Access-Revocation Pack', file: '07-OFFBOARDING-PACK.md', version: '1.0 · 12 November 2026', appliesTo: 'All employees and contractors', owner: 'People Operations / Security' },
  { id: 'payroll-benefits', title: 'Payroll and Benefits Framework', file: '08-PAYROLL-AND-BENEFITS-FRAMEWORK.md', version: '1.0 · 12 November 2026', appliesTo: 'All employees; local addenda required', owner: 'CFO / People Operations' },
  { id: 'job-descriptions', title: 'Job Description Pack', file: '09-JOB-DESCRIPTION-PACK.md', version: '1.0 · 12 November 2026', appliesTo: 'Approved roles only', owner: 'People Operations' },
  { id: 'jurisdictions', title: 'US and Nigeria Jurisdiction Guide', file: '10-JURISDICTION-GUIDE-US-NIGERIA.md', version: '1.0 · 12 November 2026', appliesTo: 'US and Nigeria hires', owner: 'General Counsel / People Operations' },
  { id: 'employer-manual', title: 'Employer Compliance Manual', file: '00-EMPLOYER-COMPLIANCE-MANUAL.md', version: '1.0 · 12 November 2026', appliesTo: 'Company-wide', owner: 'COO / General Counsel' },
  { id: 'employee-file', title: 'Employee File Checklist', file: '11-EMPLOYEE-FILE-CHECKLIST.md', version: '1.0 · 12 November 2026', appliesTo: 'All employees', owner: 'People Operations' },
]);

export const WORKFORCE_POLICY_NOTES = Object.freeze([
  'A policy is not adopted because a file exists. Record the approving body, date and reference before treating it as operative.',
  'Local law may require a works council, employee representative, translated document, statutory notice or specific language. Confirm before use.',
  'Do not promise equity, options, bonuses, health insurance or relocation support until the board, plan documents, tax analysis and local law support the promise.',
  'Never ask an employee to provide irrelevant medical, family, political, religious or financial information.',
  'Store identity, medical, immigration, payroll and background-check records in the controlled HR file with need-to-know access.',
  'The platform does not replace employment counsel, a payroll provider, an insurer or a local accountant.',
]);

export const WORKFORCE_DOCUMENTS_DIR = 'docs/hr';
