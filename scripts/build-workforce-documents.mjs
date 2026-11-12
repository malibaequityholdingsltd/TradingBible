#!/usr/bin/env node
// Build the controlled workforce document pack.
//
// Source data:
//   apps/api/src/data/workforce-compliance.js
//   apps/api/src/data/company-jobs.js
//
// The generator writes the data-driven documents, then invokes the DOCX/PDF
// renderer. The pack is a set of controlled templates, not evidence of
// adoption, counsel review, payroll registration or regulatory approval.

import { mkdir, writeFile } from 'fs/promises';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
  BENEFIT_TIERS,
  DEPARTMENTS,
  EMPLOYEE_ITEMS,
  EMPLOYEE_SECTIONS,
  EMPLOYER_ITEMS,
  EMPLOYER_SECTIONS,
  JURISDICTIONS,
  LAUNCH_CHECKLIST,
  OFFBOARDING_ITEMS,
  ONBOARDING_ITEMS,
  POLICY_DOCUMENTS,
  RECORD_CATEGORIES,
  WORKFORCE_CADENCE,
  WORKFORCE_POLICY_NOTES,
  WORKFORCE_PROFILE,
} from '../apps/api/src/data/workforce-compliance.js';
import { companyJobs } from '../apps/api/src/data/company-jobs.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'docs', 'hr');
const VERSION = '1.0';
const ISSUED = '12 November 2026';
const HEADER = `**Controlled template · Version ${VERSION} · ${ISSUED}**

> **Controlled template — counsel review and local adoption required.** This document is a company policy or reference framework. It is not an executed agreement, a legal opinion, a regulatory approval, a payroll filing, an insurance policy or a promise of a benefit. Record adoption and approval references in the Workforce Compliance Register before treating it as operative. Local addenda control where they are more protective.`;

const esc = (value) => String(value ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ').trim();

function table(headers, rows) {
  return [
    `| ${headers.map(esc).join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map((row) => `| ${row.map(esc).join(' | ')} |`),
  ].join('\n');
}

function employerManual() {
  const lines = [
    '# TRADINGBIBLE HOLDINGS, INC. — EMPLOYER COMPLIANCE MANUAL',
    '',
    HEADER,
    '',
    '## 1. Purpose and status',
    '',
    'This manual is the operating control framework for the company as an employer. It covers the company, directors and managers, full-time and part-time employees, remote employees and individual contractors. It separates a requirement from the evidence that the requirement is complete. A requirement is not complete because a policy file exists; the underlying filing, signed agreement, provider record, insurance certificate or approval must exist.',
    '',
    `**Company:** ${WORKFORCE_PROFILE.companyName} (${WORKFORCE_PROFILE.formation})`,
    '',
    `**Planned public launch:** ${WORKFORCE_PROFILE.launchDate}`,
    '',
    `**Workforce scope:** ${WORKFORCE_PROFILE.scope}`,
    '',
    `**Legal boundary:** ${WORKFORCE_PROFILE.boundary}`,
    '',
    '## 2. Workforce model',
    '',
    WORKFORCE_PROFILE.workforceModel,
    '',
    `**Priority open leadership roles (not appointments):** ${WORKFORCE_PROFILE.priorityOpenRoles.join(' · ')}.`,
    '',
    'The company must maintain one employee and contractor register with legal name, work country and region, arrangement, start date, manager, status and exit date. A hiring catalogue is not an employee register. An open role is not an appointed person.',
    '',
    '## 3. Employer obligations',
    '',
    'The register is organised into five employer sections. Every item records an owner, an evidence reference, a status and a review date. The status options are: not started, in progress, complete, blocked and not applicable.',
    '',
  ];

  for (const section of EMPLOYER_SECTIONS) {
    lines.push(`### ${section.title}`, '', section.blurb, '');
    lines.push(table(
      ['Control', 'What must exist', 'Evidence', 'Owner', 'Launch-critical'],
      section.items.map((item) => [item.title, item.detail, item.evidence, item.owner, item.launchCritical ? 'Yes' : 'No']),
    ), '');
  }

  lines.push(
    '## 4. Launch-critical checklist',
    '',
    'These are the 19 controls that must be complete or explicitly blocked with a named owner before the company treats itself as ready to employ people. The checklist does not replace the full register.',
    '',
    table(
      ['#', 'Control', 'Register item'],
      LAUNCH_CHECKLIST.map((item, index) => [String(index + 1), item.title, item.employerItemId]),
    ),
    '',
    '## 5. Operating cadence',
    '',
    table(
      ['Frequency', 'Employer activity'],
      WORKFORCE_CADENCE.map((row) => [row.frequency, row.activity]),
    ),
    '',
    '## 6. Record categories',
    '',
  );

  for (const record of RECORD_CATEGORIES) {
    lines.push(`### ${record.title}`, '', ...record.items.map((item) => `- ${item}`), '');
  }

  lines.push(
    '## 7. Departments and accountability',
    '',
    'The job catalogue contains more granular hiring groups. This register uses the following operating departments for accountability and reporting. Every department needs a named manager, including where the role is filled on an interim basis.',
    '',
    table(
      ['Department', 'Responsibility'],
      DEPARTMENTS.map((department) => [department.name, department.responsibility]),
    ),
    '',
    '## 8. Proposed benefits boundary',
    '',
    WORKFORCE_PROFILE.proposedBenefitsBoundary,
    '',
    table(
      ['Tier', 'Status', 'Note'],
      BENEFIT_TIERS.map((tier) => [tier.name, tier.status, tier.note]),
    ),
    '',
    '## 9. Jurisdiction boundary',
    '',
  );

  for (const jurisdiction of JURISDICTIONS) {
    lines.push(`### ${jurisdiction.label}`, '', jurisdiction.summary, '', `**Caution:** ${jurisdiction.caution}`, '');
  }

  lines.push(
    '## 10. Policy library and adoption',
    '',
    'A policy document is not adopted because it appears in the pack. Record the approving body, adoption date and approval reference in the Workforce Compliance Register. Obtain local counsel review where the document applies outside Delaware or the United States.',
    '',
    table(
      ['Document', 'File', 'Applies to', 'Owner', 'Status'],
      POLICY_DOCUMENTS.map((doc) => [doc.title, doc.file, doc.appliesTo, doc.owner, 'Controlled template']),
    ),
    '',
    '## 11. Policy notes',
    '',
    ...WORKFORCE_POLICY_NOTES.map((note) => `- ${note}`),
    '',
    '## 12. Adoption and evidence standard',
    '',
    '1. Identify the legal entity and the actual work location for every person.',
    '2. Confirm the employment or contractor classification with local counsel.',
    '3. Complete the payroll, tax, pension, insurance and workers-compensation registrations before the first pay run.',
    '4. Obtain signed contracts and agreements before access to company systems or confidential information.',
    '5. Record the evidence reference and approver in the register.',
    '6. Review the register at least quarterly and after a material change in law, location, headcount or business model.',
    '7. Do not mark an item complete because a document exists. Complete means the underlying obligation has been satisfied and the evidence can be produced.',
    '',
    '**Approval record**',
    '',
    'Approved by: ______________________________',
    '',
    'Title: ______________________________',
    '',
    'Date: ______________________________',
    '',
    'Board / counsel reference: ______________________________',
    '',
    '> This manual does not create a legal approval. The platform records the evidence entered by an authorised operator.',
  );

  return lines.join('\n');
}

function jobDescriptionPack() {
  const priority = new Set(WORKFORCE_PROFILE.priorityOpenRoles.map((title) => title.toLowerCase()));
  const byDepartment = new Map();
  for (const job of companyJobs) {
    const key = job.department || 'Operations';
    if (!byDepartment.has(key)) byDepartment.set(key, []);
    byDepartment.get(key).push(job);
  }
  const lines = [
    '# TRADINGBIBLE HOLDINGS, INC. — JOB DESCRIPTION PACK',
    '',
    HEADER,
    '',
    '## 1. How to use this pack',
    '',
    `This pack contains ${companyJobs.length} catalogue roles across ${byDepartment.size} hiring groups. They are real operating roles in the company plan, but they are not all approved, funded, open or appointed. A role is approved only when the current hiring plan, headcount budget and written approval confirm it. An open role is not an existing executive or employee.`,
    '',
    'Before hiring, confirm the work country and state/region, employment or contractor classification, salary band, payroll route, insurance and local contract. Complete the jurisdiction checklist in the Employer Compliance Manual. Do not publish a role with a salary, benefit, equity or token promise that has not been approved.',
    '',
    `**Priority leadership roles (open plan, not appointments):** ${WORKFORCE_PROFILE.priorityOpenRoles.join(' · ')}.`,
    '',
    '## 2. Role index',
    '',
    table(
      ['Role', 'Department', 'Type', 'Location', 'Catalogue status', 'Priority'],
      companyJobs.map((job) => [
        job.title,
        job.department,
        job.employmentType,
        job.location,
        job.status,
        priority.has(job.title.toLowerCase()) ? 'Priority leadership' : 'Catalogue',
      ]),
    ),
    '',
    '## 3. Role descriptions',
    '',
  ];

  let index = 0;
  for (const [department, jobs] of byDepartment) {
    lines.push(`### ${department}`, '');
    for (const job of jobs) {
      index += 1;
      lines.push(
        `#### ${index}. ${job.title}`,
        '',
        `**Department:** ${job.department}`,
        '',
        `**Employment type:** ${job.employmentType}`,
        '',
        `**Location:** ${job.location}`,
        '',
        `**Catalogue status:** ${job.status} — this is a hiring-plan status, not an appointment or a funded headcount approval.`,
        '',
        `**Priority:** ${priority.has(job.title.toLowerCase()) ? 'Priority leadership role in the current plan' : 'Catalogue role; requires separate approval'}`,
        '',
        '**Role description**',
        '',
        job.description,
        '',
        '**Requirements**',
        '',
        job.requirements,
        '',
        '**Compensation and benefits**',
        '',
        `${job.hiring?.salary_tbc ? `Proposed platform-credit allocation reference: ${job.hiring.salary_tbc} ${job.hiring.salary_freq || 'monthly'}. ` : ''}Any fiat salary, bonus, equity, option or benefit requires a written approval and the applicable plan documents. A proposed TBC allocation is not salary, equity or an issued token.`,
        '',
        '**Before an offer**',
        '',
        '1. Confirm approved headcount, budget and salary band.',
        '2. Confirm the lawful employing entity and work location.',
        '3. Confirm employee or contractor classification.',
        '4. Confirm payroll, tax, pension, insurance and workers-compensation obligations.',
        '5. Prepare the local contract, NDA, IP assignment and policy acknowledgements.',
        '6. Confirm the manager, decision authority and first 90-day objectives.',
        '',
        '---',
        '',
      );
    }
  }

  lines.push(
    '## 4. Hiring control',
    '',
    'The company should not hire all catalogue roles at once. Start with a controlled core team and expand only when revenue, funding and operational need justify the role. Record every approved role in the workforce budget and every appointed person in the employee register. Do not present an open role, candidate or proposed adviser as an appointed executive.',
    '',
    '> This pack is a role catalogue, not an offer, a promise of employment, a compensation approval or evidence that a role is funded.',
  );
  return lines.join('\n');
}

function jurisdictionGuide() {
  const lines = [
    '# TRADINGBIBLE HOLDINGS, INC. — US AND NIGERIA JURISDICTION GUIDE',
    '',
    HEADER,
    '',
    '## 1. The controlling rule',
    '',
    'A Delaware corporation is not automatically compliant with the employment, payroll, tax, insurance or workplace law of the country or state where a person actually works. The work location controls the local obligations. A remote employee in another state or country may create registrations, withholding, insurance, leave, data-protection and termination obligations that Delaware does not address.',
    '',
    'This guide is a control framework, not a legal opinion. Confirm the current law with local counsel before an offer, a start date or a payroll run. Where local law is more protective than a company policy, local law controls.',
    '',
    '## 2. Jurisdiction summaries',
    '',
  ];

  for (const jurisdiction of JURISDICTIONS) {
    lines.push(
      `### ${jurisdiction.label}`,
      '',
      jurisdiction.summary,
      '',
      '**Employer responsibilities**',
      '',
      ...jurisdiction.employer.map((item) => `- ${item}`),
      '',
      '**Employee responsibilities**',
      '',
      ...jurisdiction.employee.map((item) => `- ${item}`),
      '',
      `**Sources to verify:** ${jurisdiction.sources.join(' · ')}.`,
      '',
      `**Caution:** ${jurisdiction.caution}`,
      '',
    );
  }

  lines.push(
    '## 3. United States — state and local control',
    '',
    'Federal law applies nationwide. The state and locality where the employee works may add or modify requirements, including:',
    '',
    '- state income-tax withholding and unemployment-insurance registration;',
    '- state disability insurance and paid-family-leave programmes;',
    '- state minimum wage, overtime, meal-and-rest-break and pay-statement rules;',
    '- state workers’ compensation coverage;',
    '- state and local paid-sick-leave rules;',
    '- state anti-discrimination, accommodation and background-check rules;',
    '- state wage-payment, final-pay and deduction rules;',
    '- state privacy, monitoring and AI-employment rules;',
    '- local business licences and workplace notices.',
    '',
    'Do not assume a Delaware registration, a federal EIN or a policy written for one state satisfies another state. Record the employee’s work state and county/locality in the workforce register. Confirm the state addendum before signature.',
    '',
    '## 4. Nigeria — local employing arrangement',
    '',
    'A US company employing a person who works in Nigeria must establish a lawful Nigerian employment and payroll arrangement. The options may include a Nigerian subsidiary, an employer-of-record arrangement or another structure confirmed by counsel. The structure affects contracts, PAYE, pension, NSITF, insurance, data protection and termination.',
    '',
    'The company should confirm:',
    '',
    '- written particulars and the local contract;',
    '- PAYE registration, deductions and remittances;',
    '- pension applicability and contributions;',
    '- NSITF registration and the Employees’ Compensation Scheme;',
    '- workplace safety and employee-compensation obligations;',
    '- leave, working-hours and termination rules;',
    '- Nigerian data-protection requirements for employee records.',
    '',
    'The commonly stated pension reference for covered employees is 10% employer and 8% employee. That is not a conclusion for every worker or arrangement. Applicability, current rates and the approved pension arrangement must be confirmed before the first payroll run.',
    '',
    '## 5. Other countries',
    '',
    'Do not use a US or Nigerian template for another country. Engage local employment counsel and a payroll provider before the offer or start date. Confirm the lawful employing entity, contract language, mandatory particulars, payroll, tax, social security, pension, insurance, working time, leave, probation, termination, works-council and data-protection rules.',
    '',
    '## 6. Cross-border hiring checklist',
    '',
    '1. Record the actual work country, state/region and city.',
    '2. Confirm the lawful employing entity or employer-of-record arrangement.',
    '3. Confirm employee or contractor classification under local law.',
    '4. Confirm payroll, tax, pension, social-insurance and insurance registrations.',
    '5. Confirm the local contract and mandatory written particulars.',
    '6. Confirm work authorisation and right-to-work verification.',
    '7. Confirm leave, working time, rest periods and public holidays.',
    '8. Confirm termination, notice, consultation and final-pay rules.',
    '9. Confirm data-protection, monitoring, background-check and AI-employment rules.',
    '10. Record the local counsel review and approval reference in the register.',
    '',
    '## 7. Employee-file evidence by jurisdiction',
    '',
    table(
      ['Jurisdiction', 'Employee-file items'],
      JURISDICTIONS.map((jurisdiction) => [
        jurisdiction.label,
        EMPLOYEE_ITEMS.filter((item) => item.jurisdiction === jurisdiction.id).map((item) => item.title).join('; ') || 'Global employee-file checklist plus local counsel requirements',
      ]),
    ),
    '',
    '> This guide does not create a legal conclusion for a specific hire. The company must obtain local advice and record the evidence before the start date.',
  );
  return lines.join('\n');
}

function employeeFileChecklist() {
  const lines = [
    '# TRADINGBIBLE HOLDINGS, INC. — EMPLOYEE FILE CHECKLIST',
    '',
    HEADER,
    '',
    '## 1. Purpose and access',
    '',
    'This checklist defines the controlled employee file. It is a record of what must exist, not a place to store identity documents, medical records, bank details or tax identifiers. Those records belong in the restricted HR file and the approved payroll system. Access must be limited to People Operations, Legal, Payroll and the employee’s manager on a need-to-know basis.',
    '',
    'A file is complete only when every applicable item is complete or has a documented, lawful reason for not being applicable. An item marked complete must have an evidence reference that can be produced. A missing item must have a named owner and a follow-up date.',
    '',
    '## 2. Global employee-file sections',
    '',
  ];

  for (const section of EMPLOYEE_SECTIONS) {
    lines.push(
      `### ${section.title}`,
      '',
      section.blurb,
      '',
      table(
        ['#', 'Item', 'What must exist', 'Evidence', 'Owner'],
        section.items.map((item, index) => [String(index + 1), item.title, item.detail, item.evidence, item.owner]),
      ),
      '',
    );
  }

  lines.push(
    '## 3. United States requirements',
    '',
    'These items apply when the employee works in the United States. The state and local requirements must be confirmed in addition to the federal items.',
    '',
    table(
      ['#', 'Item', 'What must exist', 'Evidence', 'Owner'],
      EMPLOYEE_ITEMS.filter((item) => item.jurisdiction === 'US').map((item, index) => [String(index + 1), item.title, item.detail, item.evidence, item.owner]),
    ),
    '',
    '## 4. Nigeria requirements',
    '',
    'These items apply when the employee works in Nigeria. Confirm the current law and the lawful employing arrangement with Nigerian counsel.',
    '',
    table(
      ['#', 'Item', 'What must exist', 'Evidence', 'Owner'],
      EMPLOYEE_ITEMS.filter((item) => item.jurisdiction === 'NG').map((item, index) => [String(index + 1), item.title, item.detail, item.evidence, item.owner]),
    ),
    '',
    '## 5. Onboarding checklist',
    '',
    table(
      ['#', 'Item', 'Owner', 'When'],
      ONBOARDING_ITEMS.map((item, index) => [String(index + 1), item.title, item.owner, item.when]),
    ),
    '',
    '## 6. Offboarding checklist',
    '',
    table(
      ['#', 'Item', 'Owner', 'When'],
      OFFBOARDING_ITEMS.map((item, index) => [String(index + 1), item.title, item.owner, item.when]),
    ),
    '',
    '## 7. Completion and review',
    '',
    '1. People Operations confirms the applicable jurisdiction and opens the file.',
    '2. The employee completes the required forms through the approved secure channel.',
    '3. The manager confirms the job description, reporting line and objectives.',
    '4. IT and Security confirm device, account, MFA and access provisioning.',
    '5. Payroll confirms tax, bank and payroll enrollment.',
    '6. Legal confirms the contract, NDA, IP assignment and local addendum.',
    '7. People Operations records the evidence reference and status for every item.',
    '8. The file is reviewed at the end of the first month, at probation or initial assessment, annually and on exit.',
    '',
    '## 8. Evidence and retention rules',
    '',
    '- Do not store full identity numbers, medical details, bank details or tax identifiers in this checklist or in the workforce register.',
    '- Store identity, immigration, medical and payroll records in the controlled HR file or provider system.',
    '- Restrict access to People Operations, Legal, Payroll and the manager on a need-to-know basis.',
    '- Apply the retention schedule and any litigation hold.',
    '- Do not destroy a record that is subject to an investigation, grievance, dispute or legal hold.',
    '- Record the retention decision and destruction date.',
    '',
    '**Employee name:** ______________________________',
    '',
    '**Work country / region:** ______________________________',
    '',
    '**Jurisdiction:** [US / NG / OTHER]',
    '',
    '**People Operations owner:** ______________________________',
    '',
    '**File completion date:** ______________________________',
    '',
    '**Exceptions and follow-up:** ______________________________',
    '',
    '> This checklist is an internal control. It does not create work authorisation, tax residency, payroll registration or a legal right to work.',
  );
  return lines.join('\n');
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const generated = {
    '00-EMPLOYER-COMPLIANCE-MANUAL.md': employerManual(),
    '09-JOB-DESCRIPTION-PACK.md': jobDescriptionPack(),
    '10-JURISDICTION-GUIDE-US-NIGERIA.md': jurisdictionGuide(),
    '11-EMPLOYEE-FILE-CHECKLIST.md': employeeFileChecklist(),
  };
  for (const [filename, content] of Object.entries(generated)) {
    await writeFile(join(OUT, filename), `${content}\n`, 'utf8');
    console.log(`Generated docs/hr/${filename}`);
  }
  const result = spawnSync('python3', [join(ROOT, 'scripts', 'build-workforce-documents.py')], {
    cwd: ROOT,
    stdio: 'inherit',
  });
  if (result.status !== 0) process.exit(result.status || 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
