# Device and Endpoint Policy

**Controlled programme document · management approval not recorded**

## 1. Purpose

Every company laptop or phone is a potential entry point into TradingBible systems. This policy sets the minimum controls for devices that access company email, source code, production, Supabase, customer data, finance, payroll or AI tools.

## 2. Device standard

Company devices must have:

- full-disk encryption enabled and verified;
- screen lock with a short idle timeout and password or biometric unlock;
- automatic operating-system and browser security updates;
- endpoint detection and response (EDR) or an approved equivalent;
- anti-malware protection where the platform supports it;
- a host firewall;
- application control or an approved allow-list where practical;
- secure boot where supported;
- remote lock and remote wipe capability;
- company-managed disk backup or approved cloud storage; and
- a named user and asset record.

A device that cannot meet the standard must not access production, customer data or administrative systems.

## 3. Approved devices and personal devices

Company-owned devices are the default. Personal devices may be used only when:

- the role is approved for bring-your-own-device (BYOD);
- the device meets the same encryption, patching, screen-lock and EDR requirements;
- company data is isolated in a managed profile or container where possible;
- the employee acknowledges that company data may be removed on exit; and
- privacy, monitoring and reimbursement expectations are documented.

Do not store customer data, source code, broker credentials or confidential documents on an unmanaged personal device.

## 4. Endpoint protection

One properly configured EDR platform is better than three overlapping products. The chosen platform should provide:

- malware and behavioural detection;
- isolation of an affected device;
- alerting to the security owner;
- device compliance visibility;
- remote response where supported; and
- a tested uninstall/tamper protection control.

Do not let users disable EDR, the host firewall or disk encryption. Do not treat a green dashboard as proof that every device is enrolled; reconcile the asset register against the console.

## 5. Patching

| Severity | Target |
| --- | --- |
| Critical internet-facing vulnerability | Immediate emergency change; isolate if patching is not possible |
| Critical endpoint or identity vulnerability | Within 72 hours |
| High vulnerability | Within 14 days |
| Medium vulnerability | Within 30 days |
| Low vulnerability | Next scheduled cycle |

A patch exception requires a documented reason, compensating control, owner and expiry date. Automatic updates are a baseline, not a substitute for testing business-critical changes.

## 6. Acceptable use

Employees must not:

- install unapproved software or browser extensions;
- disable security controls to meet a deadline;
- use personal email or personal messaging for company business;
- store company data in personal cloud storage;
- share passwords or authentication codes;
- approve an unexpected MFA prompt;
- connect an unknown USB device;
- upload customer data, source code or confidential material to an unapproved AI service; or
- use a company device for illegal, harassing or high-risk activity.

Employees must:

- lock the screen when leaving a device;
- report a lost or stolen device immediately;
- report suspicious emails, prompts, links and attachments;
- use the company password manager;
- keep the device powered on and connected periodically for patching and management; and
- return devices and security keys on exit.

## 7. Removable media and USB

Removable media is restricted. Use company-approved encrypted storage only. Do not connect an unknown USB device or a device found in public. Where practical, enforce USB device control through the endpoint platform.

## 8. Email and browser security

- Use a company-managed browser profile where possible.
- Keep the browser and extensions updated.
- Install only approved extensions.
- Do not bypass certificate warnings.
- Treat unexpected attachments, login pages and payment-instruction changes as suspicious.
- Verify a change to bank details or payout instructions through a separate known channel.

## 9. Monitoring and privacy

Company devices may be monitored for security, compliance and support. The company should explain what is collected and why, and avoid collecting personal content without a lawful and proportionate reason. Monitoring must not be used to discriminate or to conduct unnecessary surveillance.

## 10. Lost or stolen device

Immediately:

1. report to the security owner and People Operations;
2. remote-lock and remote-wipe if possible;
3. revoke sessions, tokens and hardware-key access;
4. change passwords for accounts used on the device if compromise is possible;
5. report to the police and insurer where appropriate; and
6. record the asset, serial number, last-known location and actions.

Do not assume encryption makes a lost device harmless. Session theft, cached data and physical access still matter.

## 11. Device return and offboarding

On exit:

- recover the laptop, phone, chargers, security keys and removable media;
- disable the device account and revoke management enrolment;
- confirm company data is removed where the device is personal;
- record the asset condition and return date; and
- transfer any company data to an approved location before wiping.

## 12. Asset register

Keep a restricted asset register with:

- asset tag and serial number;
- device type and model;
- assigned user and department;
- encryption and EDR status;
- operating-system support status;
- issue and return dates; and
- loss, theft or replacement history.

Reconcile the register against the endpoint console and payroll/HR records periodically.

## 13. Exceptions and evidence

Exceptions require security approval, a compensating control and an expiry date. Evidence for the register includes the device standard, asset register, EDR enrolment report, encryption compliance report, patch compliance report, lost-device test and offboarding return record.
