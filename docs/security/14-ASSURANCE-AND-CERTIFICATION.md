# Assurance and Certification Claims

**Controlled governance document · approval not recorded**

## 1. Rule

Do not claim that TradingBible is certified, compliant, audited or penetration-tested unless the independent evidence exists, the scope is understood and the exact claim has been reviewed.

A badge, a vendor questionnaire, a self-assessment or a policy file is not a certificate. A penetration test is not a certification. A SOC 2 report is not a guarantee that the service is secure.

## 2. Current status

As of 12 November 2026, the security register records:

- no ISO/IEC 27001 certificate;
- no SOC 2 Type I or Type II attestation;
- no PCI DSS assessment for TradingBible's own systems;
- no completed independent penetration test;
- no completed security acceptance sign-off;
- no tested production backup restoration;
- no verified production RLS audit;
- no confirmed Cloudflare/WAF edge;
- no confirmed private administrative access; and
- no appointed security owner.

These are open gaps. The company may describe the controls it has implemented, but it must not describe itself as certified or compliant.

## 3. Claim matrix

| Claim | Minimum evidence before use |
| --- | --- |
| “We use encryption in transit.” | TLS configuration and a dated scan for the public endpoint and database connections. |
| “Broker credentials are encrypted.” | Vault implementation, key-management evidence and a test that tokens are never returned to the browser. |
| “We use row-level security.” | Production RLS audit, policy tests and tenant-isolation evidence. |
| “We have MFA.” | Provider configuration and enrolment report for the relevant account population; distinguish customer MFA from workforce enforcement. |
| “We are ISO/IEC 27001 certified.” | A current certificate, certification body, scope, issue/expiry dates and surveillance-audit status. |
| “We are SOC 2 compliant.” | A current SOC 2 report, trust-services criteria, period, auditor, scope and exceptions. “Compliant” may still be too broad; use the report's exact wording. |
| “We are PCI DSS compliant.” | The applicable assessment or attestation for the exact entity and scope. A payment provider's compliance is not TradingBible's compliance. |
| “We have been penetration tested.” | A written scope, tester, date, report and retest evidence. State whether critical/high findings were resolved. |
| “Our backups are tested.” | A dated restore test with achieved RPO/RTO and integrity/access checks. |
| “We have 24/7 monitoring.” | A staffed or managed service with tested alert delivery and response times. |

## 4. ISO/IEC 27001 path

An ISO 27001 certification requires an information-security management system, risk assessment, control selection, documented operation, internal audit, management review and an accredited certification body. It is not a one-off document pack.

A practical sequence:

1. appoint a security owner and define the ISMS scope;
2. inventory assets, data and suppliers;
3. perform a risk assessment and treatment plan;
4. adopt policies and operate the controls with evidence;
5. run internal audits and management review;
6. remediate gaps;
7. engage an accredited certification body; and
8. maintain surveillance audits.

Do not buy a certificate template and call the company certified.

## 5. SOC 2 path

SOC 2 is an attestation report prepared by an independent CPA firm against the Trust Services Criteria. It is not a public certificate. A Type I report covers design at a point in time; a Type II report covers operating effectiveness over a period.

Before commissioning a SOC 2:

- define the system boundary and trust-services criteria;
- confirm the customer and contractual need;
- operate the controls for the observation period;
- collect evidence continuously;
- select a qualified auditor; and
- review the report's exceptions before publishing a claim.

## 6. PCI DSS path

TradingBible should minimise card data and use a PCI-compliant provider's hosted components. A merchant may still have obligations under the applicable SAQ. The exact scope depends on how card data flows and which components are used.

Do not claim PCI DSS compliance because a payment provider is compliant. Engage a qualified assessor or complete the applicable self-assessment with counsel and the provider.

## 7. Penetration-test procurement

The engagement should define:

- scope: public app, APIs, authentication, admin, tenant isolation, uploads, broker flows, AI, payment webhooks and infrastructure;
- rules of engagement and permitted techniques;
- test accounts and data handling;
- emergency stop contact;
- evidence handling and confidentiality;
- reporting format and severity definitions;
- retest scope; and
- whether the tester can attest to remediation.

Do not run an intrusive test against production without authorization. Fix critical and high findings before expanding access to real customer data.

## 8. Public security page

The public security page may describe controls in plain language, but must:

- distinguish implemented controls from proposed controls;
- avoid “bank-grade”, “military-grade”, “unhackable” and similar claims;
- avoid implying a certification that does not exist;
- describe the limits of any control;
- provide a security contact and responsible-disclosure route; and
- be reviewed by the security owner and counsel before publication.

## 9. Customer assurance responses

When a customer or enterprise buyer sends a security questionnaire:

- answer factually and consistently;
- do not attach a confidential report without a non-disclosure agreement and authorization;
- distinguish “configured”, “tested” and “independently attested”;
- record the request and response;
- involve counsel for regulated or contractual commitments; and
- do not promise a future certification date without board approval.

## 10. Board reporting

Report the exact status, not a marketing summary:

- controls verified vs implemented vs not started;
- critical gaps and owners;
- open risks and overdue treatment;
- incidents and lessons;
- test results and exceptions;
- certification or audit status; and
- decisions and budget requested.

A dashboard that shows green because a vendor was purchased is not assurance.
