# Incident Response Plan

**Controlled programme document · management approval not recorded**

## 1. Purpose

This plan gives TradingBible a documented response to a suspected or confirmed security incident. It covers credential compromise, malware or ransomware, data exposure, unauthorised production access, payment fraud, broker-token exposure, AI data leakage, lost devices and supplier incidents.

It is not legal advice. Notification duties depend on the data, jurisdiction, contracts and facts. General Counsel must assess them with the incident team.

## 2. Incident definition

A security incident is any event that threatens or compromises the confidentiality, integrity or availability of company or customer information, systems, accounts, devices, source code or financial controls. A suspected incident is treated as an incident until triage closes it.

Examples:

- suspicious administrator login, new privileged account or stolen session;
- phishing that captures credentials or executes malware;
- lost or stolen laptop, phone or hardware security key;
- unexpected database export or customer-data access;
- source-code or secret exposure;
- unauthorised production deployment or configuration change;
- payment webhook forgery, refund fraud or payout-instruction change;
- broker token exposure or unusual broker API activity;
- ransomware, destructive malware or backup deletion; and
- AI prompt injection that reaches another tenant, exposes secrets or triggers an unauthorised tool action.

## 3. Severity

| Severity | Definition | Initial response |
| --- | --- | --- |
| SEV1 | Confirmed or likely compromise of production, customer data, payment authority, source code, backups or a large number of accounts. | Incident command immediately; contain; notify CEO, security owner and counsel; preserve evidence. |
| SEV2 | Material risk to a system, a limited customer-data set, a privileged account or a critical supplier. | Incident command within one hour; contain and investigate; notify management. |
| SEV3 | Contained localised event, failed attack with no evidence of access, or a single non-privileged account. | Triage and remediate within the business day; record the decision. |
| SEV4 | Minor policy violation, suspicious email with no click, or a low-impact event. | Handle through normal operations and record if repeat behaviour or control weakness appears. |

Severity may be raised without waiting for full confirmation. Do not downgrade an incident merely to reduce reporting pressure.

## 4. Command roles

Names and contact numbers are maintained in a restricted contact tree, not in this public repository.

| Role | Responsibility |
| --- | --- |
| Incident commander | Owns the response, decisions, timeline and communication cadence. |
| Security lead | Investigates, contains, preserves evidence and coordinates technical recovery. |
| Engineering lead | Stabilises the application, deploys fixes and verifies recovery. |
| Infrastructure lead | Isolates hosts, rotates infrastructure credentials and restores services. |
| General Counsel | Assesses legal, contractual and regulatory notification and privilege. |
| Communications lead | Prepares approved internal and external statements. |
| People Operations | Supports staff, device recovery and access removal. |
| Finance lead | Protects payment authority, reconciles transactions and contacts providers. |
| Scribe | Maintains a timestamped decision and evidence log. |

Every role needs a named deputy. If the incident involves the security owner, the CEO or another designated person takes command.

## 5. Response phases

### 5.1 Detection and reporting

Anyone who suspects an incident must report it immediately through the approved security channel. Do not investigate alone, confront an attacker, delete suspicious files or post details in a public channel.

The first responder records:

- what happened, when and how it was noticed;
- systems, accounts and data possibly affected;
- actions already taken;
- screenshots or log references; and
- who has been informed.

### 5.2 Triage

The incident commander assigns severity, opens an incident record, starts a timeline and decides whether to activate the full team. Preserve volatile evidence before changing systems when practical.

Initial questions:

- Is the attacker still active?
- Are credentials, sessions or tokens exposed?
- Is customer data involved?
- Are payments, payouts or broker connections involved?
- Are backups or logging affected?
- Is the issue contained to one account, one tenant, one host or the whole platform?

### 5.3 Containment

Containment must be proportionate and reversible where possible:

- revoke compromised sessions and rotate exposed credentials;
- disable a compromised account or integration;
- isolate an affected device from the network;
- block malicious IPs or domains at the edge;
- disable a vulnerable feature or deployment path;
- suspend a payment or broker integration if fraud or unauthorised access is suspected;
- protect backups from deletion; and
- preserve logs and disk evidence before rebuilding.

Do not wipe a compromised system before capturing relevant evidence. Do not delete logs to "clean up". If a destructive action is necessary, record the reason, approver and what evidence was preserved first.

### 5.4 Investigation and evidence

Maintain a chain-of-custody record for serious incidents:

- evidence description, source, collector, time and storage location;
- hash values where practical;
- access restrictions;
- copies rather than originals where possible; and
- a decision log with timestamps.

Use qualified forensic support for SEV1 events involving customer data, ransomware, insider activity or litigation. Preserve relevant cloud, identity, database, WAF, source-control and payment logs.

### 5.5 Eradication

Remove the root cause: malicious accounts, persistence, vulnerable code, exposed secrets, unsafe configuration or compromised supplier access. Verify that the attacker cannot simply re-enter through a second path.

### 5.6 Recovery

Restore from a verified clean backup or rebuild from trusted infrastructure. Confirm:

- the application starts and health checks pass;
- authentication and authorisation work;
- customer data integrity is verified;
- payment webhooks and reconciliation are correct;
- broker integrations are scoped and monitored;
- monitoring and backups are operating; and
- the restored environment does not reintroduce the vulnerability.

Recovery is staged. Do not restore all traffic before the security owner confirms the minimum controls.

### 5.7 Communication

The incident commander and Communications lead use approved statements. Do not speculate, blame a customer, disclose another customer's data or promise that no data was affected before verification.

Internal communication should cover what is known, what is not known, what people must do and when the next update will be issued. Customer communication must be reviewed by counsel where legal or contractual duties may apply.

### 5.8 Notification assessment

General Counsel assesses notification to customers, regulators, payment providers, brokers, insurers, law enforcement and other counterparties. Consider:

- the type of data and number of people affected;
- the jurisdiction of the company, the customer and the incident;
- contractual notice periods;
- securities, financial-services or privacy duties;
- law-enforcement or forensic sensitivity; and
- the risk of further harm from premature disclosure.

Record the decision, decision-maker, date and legal basis. Do not assume that a US state deadline, a GDPR-style deadline or a Nigerian requirement is the only applicable rule.

### 5.9 Post-incident review

Within a defined period after containment, the team records:

- a factual timeline;
- root cause and contributing factors;
- what worked and what failed;
- customer and legal impact;
- control and risk-register updates;
- corrective actions with owners and dates; and
- whether an exercise or policy change is required.

The review is blameless where possible, but accountability for repeated control failures remains.

## 6. Ransomware-specific rules

1. Do not pay a ransom without board, legal, insurance and law-enforcement assessment. Payment does not guarantee recovery and may create legal exposure.
2. Isolate affected systems and protect backups first.
3. Preserve evidence; do not wipe encrypted systems before forensic review.
4. Restore from a verified offline or immutable backup, not from a backup stored on the compromised network.
5. Rotate credentials and rebuild affected hosts; do not trust a cleaned endpoint without verification.
6. Assess data-theft extortion separately from encryption.
7. Notify insurers and counsel early if a policy or legal duty may apply.

## 7. Credential and secret exposure

If a secret may have been exposed:

- revoke or rotate it immediately;
- identify every system that accepted it;
- review logs for use from unexpected locations or times;
- rotate dependent secrets and sessions;
- check source-control history, build artefacts and public caches;
- update the secret inventory; and
- record the exposure, rotation and investigation.

Do not wait to confirm misuse before rotating a high-impact credential.

## 8. Lost or stolen device

- Remote-lock and remote-wipe the device if supported.
- Revoke sessions, tokens and hardware-key access.
- Change passwords for accounts used on the device if compromise is possible.
- Report to the police and insurer where appropriate.
- Record the asset, serial number, last-known location and recovery actions.
- Do not assume full-disk encryption makes a lost device harmless; assess session theft and physical access.

## 9. Exercise programme

Run at least one exercise every six months. A useful cycle alternates:

- tabletop scenario with the executive and legal team;
- technical simulation of credential compromise or ransomware;
- backup restoration test;
- phishing report and response test; and
- supplier incident escalation test.

Each exercise records objectives, participants, scenario, timeline, decisions, gaps and corrective actions. Do not count reading the plan as an exercise.

## 10. Incident record minimum

The admin security register records:

- incident title, severity, status and detection time;
- systems and data categories affected;
- containment and resolution times;
- whether customer data was affected;
- notification assessment;
- evidence reference (not the evidence itself);
- lessons and corrective actions; and
- owner and reviewer.

Closing an incident in the register requires a resolution time, evidence reference and recorded lessons.

## 11. Immediate first-hour card

1. Stop and report. Do not investigate alone.
2. Record what you know and preserve evidence.
3. Revoke exposed sessions and credentials.
4. Isolate affected devices and integrations.
5. Protect backups and logs.
6. Assign an incident commander and severity.
7. Notify the CEO, security owner and General Counsel for SEV1/SEV2.
8. Start the timeline and decision log.
9. Do not make public statements without approval.
