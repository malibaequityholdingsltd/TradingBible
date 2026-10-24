#!/usr/bin/env python3
"""Build the controlled TBC document library.

The source packages are Word files.  The web app needs stable, browser-
viewable PDFs plus downloadable originals, so this script converts the
source documents into a consistent Letter-size paper layout and writes a
manifest consumed by the API.

Usage:
  python3 scripts/build-tbc-documents.py
  python3 scripts/build-tbc-documents.py --public-src DIR --internal-src DIR
"""

from __future__ import annotations

import argparse
import html
import json
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

import docx
from docx.document import Document as DocxDocument
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.table import Table
from docx.text.paragraph import Paragraph


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PUBLIC = Path("/Users/malibagt/Downloads/TradingBible_TBC_5_Signature_Fields_Corrected")
DEFAULT_INTERNAL = Path("/Users/malibagt/Downloads/TradingBible_26_Corrected_Layout")
STORAGE = ROOT / "apps/api/storage/tbc-documents"
CHROME = Path("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")

PUBLIC_META = [
    {
        "source": "01_TBC_Whitepaper_and_Utility_Roadmap.docx",
        "slug": "tbc-whitepaper",
        "number": "P-01",
        "title": "TBC Whitepaper & Utility Roadmap",
        "subtitle": "Issuer overview · functional design · delivery milestones",
        "category": "Whitepaper",
        "summary": "The proposed TBC utility model, network approach and phased development gates. No functionality is represented as live.",
        "status": "Proposal — not approved",
    },
    {
        "source": "02_TBC_Supply_Allocation_and_Vesting.docx",
        "slug": "tbc-supply-allocation-vesting",
        "number": "P-02",
        "title": "TBC Supply, Allocation & Vesting",
        "subtitle": "Economic framework · proposed distribution controls",
        "category": "Economics",
        "summary": "An illustrative 100M supply distribution and proposed 12-month cliff / 36-month vesting framework for review. Not an approved allocation.",
        "status": "Illustrative — not approved",
    },
    {
        "source": "03_Website_Purchases_Payments_Custody_Refunds.docx",
        "slug": "tbc-purchases-payments-custody-refunds",
        "number": "P-03",
        "title": "Website Purchases, Payments, Custody & Refunds",
        "subtitle": "Proposed transaction journey · control architecture",
        "category": "Purchase controls",
        "summary": "The proposed purchaser journey, payment and settlement controls, custody model and refund handling. Purchases are disabled.",
        "status": "Proposed — not live",
    },
    {
        "source": "04_Jurisdictions_and_Purchaser_Eligibility.docx",
        "slug": "tbc-jurisdictions-purchaser-eligibility",
        "number": "P-04",
        "title": "Jurisdictions & Purchaser Eligibility",
        "subtitle": "Geographic scope · purchaser classification · access controls",
        "category": "Eligibility",
        "summary": "Market-by-market access assessment for the US, Nigeria, the EEA, the UK, Canada and other markets. No market is cleared.",
        "status": "Assessment only — not cleared",
    },
    {
        "source": "05_Brokerage_and_Platform_Separation.docx",
        "slug": "tbc-brokerage-platform-separation",
        "number": "P-05",
        "title": "Brokerage & Platform Separation",
        "subtitle": "Trading software · future broker business · regulated activity boundaries",
        "category": "Regulatory boundary",
        "summary": "The boundary between TradingBible software, token issuance and any future regulated brokerage activity.",
        "status": "Boundary policy — not a licence",
    },
]

INTERNAL_META = [
    ("01_Sole_Member_Written_Consent_and_Manager_Authorization.docx", "sole-member-consent-manager-authorization", "01", "Sole Member Written Consent and Manager Authorization", "Corporate authority", "Authorizes investigation and professional engagement; does not authorize a public sale."),
    ("02_Corporate_Issuer_and_Beneficial_Ownership_Profile.docx", "corporate-issuer-beneficial-ownership-profile", "02", "Corporate Issuer and Beneficial Ownership Profile", "Corporate authority", "Issuer identity, ownership, registered office and corporate-record certification inputs."),
    ("03_Instruction_and_Engagement_Letter_to_Regulatory_Counsel.docx", "instruction-engagement-regulatory-counsel", "03", "Instruction and Engagement Letter to Regulatory Counsel", "Corporate authority", "Scope of counsel engagement and information instructions for the TBC review."),
    ("04_TBC_Whitepaper.docx", "tbc-whitepaper-instrument", "04", "TBC Whitepaper — Project, Utility and Network Framework", "Token & economics", "The controlled whitepaper instrument covering utility, network architecture and release gates."),
    ("05_Tokenomics_and_Vesting.docx", "tokenomics-vesting-instrument", "05", "Token Supply, Allocation and Vesting Instrument", "Token & economics", "Supply policy, illustrative allocation and proposed vesting controls."),
    ("06_Offering_and_Purchaser_Agreement.docx", "offering-purchaser-agreement", "06", "Token Offering and Purchaser Agreement", "Token & economics", "Draft purchaser agreement and offering terms, subject to legal and regulatory clearance."),
    ("07_Digital_Asset_Risk_Factor_Disclosure.docx", "digital-asset-risk-factor-disclosure", "07", "Digital Asset Risk Factor Disclosure", "Token & economics", "Risk factors for token utility, liquidity, custody, technology and regulatory treatment."),
    ("08_Treasury_Use_of_Proceeds_and_Financial_Controls_Policy.docx", "treasury-use-proceeds-financial-controls", "08", "Treasury, Use of Proceeds and Financial Controls Policy", "Operations & controls", "Segregation of funds, treasury authorization, reporting and proceeds controls."),
    ("09_AML_Customer_Due_Diligence_and_Sanctions_Framework.docx", "aml-cdd-sanctions-framework", "09", "AML, Customer Due Diligence and Sanctions Framework", "Compliance", "Customer due diligence, beneficial ownership, sanctions and escalation controls."),
    ("10_Privacy_and_Personal_Data_Protection_Notice.docx", "privacy-personal-data-protection-notice", "10", "Privacy and Personal Data Protection Notice", "Compliance", "Notice covering personal data collected in the proposed distribution process."),
    ("11_Jurisdiction_Access_and_Sales_Restrictions_Register.docx", "jurisdiction-access-sales-restrictions-register", "11", "Jurisdiction Access and Sales Restrictions Register", "Compliance", "Controlled register of market access decisions and sales restrictions."),
    ("12_Regulatory_Classification_and_Filing_Decision_Record.docx", "regulatory-classification-filing-decision", "12", "Regulatory Classification and Filing Decision Record", "Compliance", "Decision record for classification, filings and jurisdictional approaches."),
    ("13_Token_Bridge_and_Blockchain_Technical_Specification.docx", "token-bridge-blockchain-technical-spec", "13", "Token, Bridge and Blockchain Technical Specification", "Token & economics", "Technical design for token issuance, bridge accounting and chain migration."),
    ("14_Security_Incident_Management_and_Recovery_Policy.docx", "security-incident-management-recovery", "14", "Security Incident Management and Recovery Policy", "Operations & controls", "Incident response, escalation, recovery and evidence-preservation controls."),
    ("15_Conflicts_of_Interest_Insider_Conduct_and_Market_Integrity_Policy.docx", "conflicts-insider-conduct-market-integrity", "15", "Conflicts of Interest, Insider Conduct and Market Integrity Policy", "Compliance", "Conflicts review, insider conduct, market integrity and disclosure controls."),
    ("16_Regulatory_Correspondence_and_Submission_Letter.docx", "regulatory-correspondence-submission-letter", "16", "Regulatory Correspondence and Submission Letter", "Compliance", "Controlled correspondence and submission letter for regulatory engagement."),
    ("17_Token_Sale_Launch_Authorization_and_Control_Certificate.docx", "token-sale-launch-authorization-control", "17", "Token Sale Launch Authorization and Control Certificate", "Corporate authority", "Launch authorization gate requiring legal, technical, treasury and operational sign-off."),
    ("18_Regulatory_Exhibits_and_Evidence_Assembly_Index.docx", "regulatory-exhibits-evidence-index", "18", "Regulatory Exhibits and Evidence Assembly Index", "Corporate authority", "Index of exhibits, evidence and supporting records for the TBC file."),
    ("19_Direct_Website_Token_Distribution_Operating_Procedure.docx", "direct-website-token-distribution-procedure", "19", "Direct Website Token Distribution Operating Procedure", "Operations & controls", "Operating procedure for any permitted direct website distribution."),
    ("20_Website_TBC_Sale_Terms_and_Conditions.docx", "website-tbc-sale-terms-conditions", "20", "Website TBC Sale Terms and Conditions", "Operations & controls", "Draft sale terms, purchaser acknowledgments and website conditions."),
    ("21_Digital_Asset_Website_Disclosure_and_Marketing_Standard.docx", "digital-asset-website-disclosure-marketing", "21", "Digital Asset Website Disclosure and Marketing Standard", "Compliance", "Disclosure, marketing and communications standards for the website."),
    ("22_Customer_Complaints_Refunds_and_Dispute_Resolution_Procedure.docx", "customer-complaints-refunds-dispute-resolution", "22", "Customer Complaints, Refunds and Dispute Resolution Procedure", "Operations & controls", "Complaint handling, refund assessment and dispute-resolution procedure."),
    ("23_Payments_Custody_Wallets_and_Escrow_Governance.docx", "payments-custody-wallets-escrow-governance", "23", "Payments, Custody, Wallets and Escrow Governance", "Operations & controls", "Payment providers, custody, wallet controls, escrow and reconciliation."),
    ("24_Regulatory_Filing_Register_and_Application_Control_Sheet.docx", "regulatory-filing-register-application-control", "24", "Regulatory Filing Register and Application Control Sheet", "Compliance", "Register of filings, applications, owners and evidence status."),
    ("25_TBC_Utility_Ecosystem_Integration_and_Future_Development_Schedule.docx", "tbc-utility-ecosystem-integration-schedule", "25", "TBC Utility, Ecosystem Integration and Future Development Schedule", "Token & economics", "Utility integration schedule and dependencies for future ecosystem services."),
    ("26_Execution_Approval_and_Supporting_Evidence_Register.docx", "execution-approval-supporting-evidence-register", "26", "Execution, Approval and Supporting Evidence Register", "Corporate authority", "Approval, signature, version and evidence register for all instruments."),
]


def iter_blocks(document: DocxDocument):
    for child in document.element.body.iterchildren():
        if child.tag == qn("w:p"):
            yield Paragraph(child, document)
        elif child.tag == qn("w:tbl"):
            yield Table(child, document)


def inline_runs(paragraph: Paragraph) -> str:
    pieces = []
    for run in paragraph.runs:
        value = html.escape(run.text)
        if not value:
            continue
        if run.bold:
            value = f"<strong>{value}</strong>"
        if run.italic:
            value = f"<em>{value}</em>"
        pieces.append(value)
    return "".join(pieces)


def render_table(table: Table) -> str:
    rows = []
    signature = False
    for row in table.rows:
        cells = []
        for cell in row.cells:
            text = html.escape(cell.text).replace("\n", "<br>")
            if "signature" in cell.text.lower() or "printed name" in cell.text.lower():
                signature = True
            cells.append(f"<td>{text}</td>")
        rows.append("<tr>" + "".join(cells) + "</tr>")
    cls = "signature-table" if signature else "data-table"
    return f'<table class="{cls}"><tbody>{"".join(rows)}</tbody></table>'


def render_document(source: Path) -> str:
    document = docx.Document(str(source))
    cover = []
    body = []
    seen_body = False
    for block in iter_blocks(document):
        if isinstance(block, Table):
            body.append(render_table(block))
            seen_body = True
            continue
        text = block.text.strip()
        if not text:
            continue
        style = (block.style.name or "").lower()
        centered = block.alignment == WD_ALIGN_PARAGRAPH.CENTER
        if not seen_body and (centered or style == "title") and len(cover) < 5:
            cover.append((text, style))
            continue
        seen_body = True
        if style.startswith("heading 1"):
            body.append(f"<h1>{inline_runs(block)}</h1>")
        elif style.startswith("heading 2") or style == "title":
            body.append(f"<h2>{inline_runs(block)}</h2>")
        elif "____" in text:
            body.append(f'<p class="sig-line">{inline_runs(block)}</p>')
        else:
            body.append(f"<p>{inline_runs(block)}</p>")

    cover_html = []
    for index, (text, style) in enumerate(cover):
        if index == 0:
            cover_html.append(f'<div class="org">{html.escape(text)}</div>')
        elif index == 1 and "GOVERNANCE" in text:
            cover_html.append(f'<div class="governance">{html.escape(text)}</div>')
        elif index == len(cover) - 1:
            cover_html.append(f'<div class="document-ref">{html.escape(text)}</div>')
        else:
            cover_html.append(f'<div class="title">{html.escape(text)}</div>')

    return f"""<!doctype html>
<html><head><meta charset="utf-8"><title>{html.escape(source.stem)}</title>
<style>
  @page {{ size: Letter; margin: 16mm 16mm 18mm; }}
  * {{ box-sizing: border-box; }}
  body {{ margin: 0; color: #171717; font-family: Georgia, "Times New Roman", serif; font-size: 10.5pt; line-height: 1.48; }}
  .cover {{ text-align: center; border-top: 2px solid #9a7a1e; border-bottom: 1px solid #c9b98a; padding: 16px 0 18px; margin-bottom: 22px; }}
  .org {{ font-family: Arial, sans-serif; font-size: 15pt; font-weight: 800; letter-spacing: .08em; }}
  .governance {{ margin-top: 5px; font-family: Arial, sans-serif; font-size: 8.5pt; font-weight: 700; letter-spacing: .12em; color: #6b5a24; }}
  .title {{ margin-top: 14px; font-family: Arial, sans-serif; font-size: 21pt; line-height: 1.12; font-weight: 800; }}
  .document-ref {{ margin-top: 11px; font-family: Arial, sans-serif; font-size: 8.5pt; color: #555; letter-spacing: .02em; }}
  h1 {{ margin: 18px 0 7px; font-family: Arial, sans-serif; font-size: 13pt; line-height: 1.2; page-break-after: avoid; }}
  h2 {{ margin: 16px 0 7px; font-family: Arial, sans-serif; font-size: 15pt; line-height: 1.2; page-break-after: avoid; }}
  p {{ margin: 0 0 8px; text-align: justify; orphans: 3; widows: 3; }}
  .sig-line {{ margin-top: 15px; padding: 8px 0; border-top: 1px solid #bbb; text-align: left; font-family: Arial, sans-serif; font-size: 9pt; }}
  table {{ width: 100%; border-collapse: collapse; margin: 10px 0 16px; page-break-inside: auto; }}
  tr {{ page-break-inside: avoid; page-break-after: auto; }}
  th, td {{ border: 1px solid #aaa; padding: 5px 6px; vertical-align: top; text-align: left; font-size: 8.4pt; line-height: 1.35; }}
  th {{ background: #f0ede3; font-family: Arial, sans-serif; font-weight: 700; }}
  .signature-table td {{ min-height: 52px; height: 52px; }}
  .signature-table td:first-child {{ width: 52%; }}
  strong {{ font-weight: 700; }}
  em {{ font-style: italic; }}
</style></head>
<body>
  <div class="cover">{"".join(cover_html)}</div>
  {"".join(body)}
</body></html>"""


def build_pdf(html_path: Path, pdf_path: Path) -> None:
    profile = Path(tempfile.mkdtemp(prefix="tb-doc-chrome-"))
    command = [
        str(CHROME),
        "--headless=new",
        "--no-sandbox",
        "--disable-gpu",
        "--no-pdf-header-footer",
        f"--user-data-dir={profile}",
        f"--print-to-pdf={pdf_path}",
        html_path.as_uri(),
    ]
    result = subprocess.run(command, capture_output=True, text=True, timeout=120)
    shutil.rmtree(profile, ignore_errors=True)
    if result.returncode != 0 or not pdf_path.exists() or pdf_path.stat().st_size < 5_000:
        raise RuntimeError(f"Chrome failed for {html_path.name}: {result.stderr[-1200:]}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--public-src", type=Path, default=DEFAULT_PUBLIC)
    parser.add_argument("--internal-src", type=Path, default=DEFAULT_INTERNAL)
    args = parser.parse_args()

    for required in (args.public_src, args.internal_src, CHROME):
        if not required.exists():
            raise SystemExit(f"Missing required path: {required}")

    pdf_dir = STORAGE / "pdf"
    docx_dir = STORAGE / "docx"
    for folder in (STORAGE, pdf_dir, docx_dir):
        folder.mkdir(parents=True, exist_ok=True)

    documents = []
    public_sources = {item["source"]: item for item in PUBLIC_META}
    public_files = sorted(args.public_src.glob("*.docx"))
    internal_files = sorted(args.internal_src.glob("*.docx"))
    all_sources = [(path, "public", public_sources.get(path.name)) for path in public_files]
    all_sources.extend((path, "internal", None) for path in internal_files)

    for source, visibility, explicit in all_sources:
        if visibility == "public":
            if not explicit:
                raise SystemExit(f"No public metadata for {source.name}")
            meta = explicit
            slug = meta["slug"]
            number = meta["number"]
            title = meta["title"]
            subtitle = meta["subtitle"]
            category = meta["category"]
            summary = meta["summary"]
            status = meta["status"]
        else:
            match = next((item for item in INTERNAL_META if item[0] == source.name), None)
            if not match:
                raise SystemExit(f"No internal metadata for {source.name}")
            _, slug, number, title, category, summary = match
            subtitle = "Corporate & digital asset governance · controlled instrument"
            status = "Draft — signature block open"
        html_text = render_document(source)
        html_path = pdf_dir / f"{slug}.html"
        pdf_path = pdf_dir / f"{slug}.pdf"
        docx_path = docx_dir / f"{slug}.docx"
        html_path.write_text(html_text, encoding="utf-8")
        shutil.copy2(source, docx_path)
        build_pdf(html_path, pdf_path)
        html_path.unlink(missing_ok=True)
        documents.append({
            "slug": slug,
            "number": number,
            "title": title,
            "subtitle": subtitle,
            "category": category,
            "summary": summary,
            "status": status,
            "visibility": visibility,
            "classification": "Public summary" if visibility == "public" else "Confidential — internal / counsel",
            "version": "Corrected layout · October 2026",
            "signatureFields": "Issuer representative + professional reviewer" if visibility == "public" else "Issuer / manager + reviewer / custodian (instrument-specific)",
            "signatureStatus": "Open — not executed",
            "pdf": f"pdf/{slug}.pdf",
            "docx": f"docx/{slug}.docx",
            "pdfBytes": pdf_path.stat().st_size,
            "docxBytes": docx_path.stat().st_size,
        })
        print(f"built {visibility:7} {slug}")

    manifest = {
        "title": "TradingBible TBC controlled document library",
        "issuer": "TradingBible LLC",
        "jurisdiction": "Delaware, United States",
        "updated": "October 2026",
        "source": "TBC corrected-layout and signature-field packages",
        "documents": documents,
    }
    (STORAGE / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {STORAGE / 'manifest.json'} ({len(documents)} documents)")


if __name__ == "__main__":
    main()
