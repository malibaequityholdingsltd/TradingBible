#!/usr/bin/env python3
"""Build the confidential TradingBible fundraising document packet.

Source of truth: docs/fundraising/*.md
Outputs:
  apps/api/storage/fundraising-documents/docx/*.docx
  apps/api/storage/fundraising-documents/docx-protected/*.docx
  apps/api/storage/fundraising-documents/pdf/*.pdf
  apps/api/storage/fundraising-documents/manifest.json

Every document is a draft. The generated PDF is used only for DocuSign
anchoring and counsel review; the DOCX is the editable working copy. Nothing
in this packet is an offer, solicitation, filing, qualification, approval or
executed instrument.
"""

from __future__ import annotations

import base64
import html
import json
import re
import shutil
import subprocess
import tempfile
from datetime import date
from pathlib import Path
from typing import Any

import docx
from PIL import Image
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "fundraising"
STORAGE = ROOT / "apps/api/storage/fundraising-documents"
CHROME = Path("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
LOGO = ROOT / "apps/web/public/logos/tradingbible-logo.png"
LOGO_SMALL = STORAGE / "_assets" / "tradingbible-logo-256.png"

COMPANY = {
    "name": "TradingBible Holdings, Inc.",
    "brand": "TradingBible",
    "website": "https://tradingbible.app",
    "legal_email": "legal@tradingbible.app",
    "support_email": "support@tradingbible.app",
    "jurisdiction": "Delaware, United States",
    "prepared": "10 November 2026",
    "version": "1.0",
}

GOLD = RGBColor(0x9A, 0x7A, 0x1E)
INK = RGBColor(0x1A, 0x1A, 0x1A)
MUTED = RGBColor(0x5B, 0x55, 0x45)
PALE = "F3EFE3"

# ---------------------------------------------------------------------------
# Signer definitions
# ---------------------------------------------------------------------------

def signer(
    signer_id: str,
    party: str,
    capacity: str,
    *,
    required: bool = True,
    prefix: str | None = None,
    custom_fields: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    prefix = prefix or signer_id.upper()
    return {
        "id": signer_id,
        "party": party,
        "capacity": capacity,
        "required": required,
        "label": f"{party} — {capacity}",
        "anchor": f"{prefix} EXECUTION — {{number}}",
        "tabOffsetsPx": {"signature": 15, "printedName": 46, "title": 76, "date": 106},
        "fieldAnchors": {
            "signature": {"anchor": f"{prefix.title()} signature ({{number}}): __________________", "xOffset": "0", "yOffset": "0", "width": "190", "height": "24"},
            "printedName": {"anchor": f"{prefix.title()} printed name ({{number}}): ______________", "xOffset": "0", "yOffset": "0", "width": "190", "height": "18"},
            "title": {"anchor": f"{prefix.title()} capacity ({{number}}): __________________", "xOffset": "0", "yOffset": "0", "width": "210", "height": "18"},
            "date": {"anchor": f"{prefix.title()} date ({{number}}): ______________________", "xOffset": "0", "yOffset": "0", "width": "130", "height": "18"},
        },
        "customFields": custom_fields or [],
    }


def text_field(label: str, *, width: str = "260", required: bool = True, value: str = "") -> dict[str, Any]:
    return {
        "type": "text",
        "label": label,
        "anchor": f"{label}: ____________________",
        "width": width,
        "height": "18",
        "required": required,
        "value": value,
    }


def checkbox_field(label: str, *, required: bool = True) -> dict[str, Any]:
    return {
        "type": "checkbox",
        "label": label,
        # The rendered completion line uses two spaces after the box. The
        # anchor must match the PDF text exactly and must be unique to the
        # investor's own completion block.
        "anchor": f"☐  {label}",
        "width": "18",
        "height": "18",
        "required": required,
    }


COMPANY_SIGNER = signer("company", "Malik Nlem", "Chief Executive Officer", prefix="Company")
COUNSEL_SIGNER = signer("counsel", "Outside Counsel", "Counsel", required=False, prefix="Counsel")
INVESTOR_SIGNER = signer("investor", "Investor", "Investor", prefix="Investor")
DIRECTOR_SIGNER = signer("director", "Director", "Director", prefix="Director", required=False)
SECRETARY_SIGNER = signer("secretary", "Secretary", "Secretary", prefix="Secretary", required=False)
INSIDER_SIGNER = signer("insider", "Insider", "Founder / Officer / Director", prefix="Insider", required=False)

ACCREDITED_FIELDS = [
    text_field("Investor legal name", width="300"),
    text_field("Investor email", width="260"),
    text_field("Investor entity type", width="220"),
    text_field("Investor jurisdiction", width="220"),
    checkbox_field("Accredited investor certification"),
    checkbox_field("Bad actor questionnaire completed"),
    checkbox_field("Source of funds reviewed"),
    checkbox_field("Risk disclosure acknowledged"),
]

REG_S_FIELDS = [
    text_field("Investor legal name", width="300"),
    text_field("Investor email", width="260"),
    text_field("Tax residence", width="220"),
    text_field("Passport or entity jurisdiction", width="240"),
    checkbox_field("Non-U.S. person certification"),
    checkbox_field("Offshore transaction certification"),
    checkbox_field("Resale restriction acknowledged"),
    checkbox_field("Sanctions and AML certification"),
]

SAFE_FIELDS = [
    text_field("Investor legal name", width="300"),
    text_field("Investor email", width="260"),
    text_field("Purchase amount (US$)", width="180"),
    text_field("Investor jurisdiction", width="220"),
    checkbox_field("Accredited or offshore eligibility confirmed"),
    checkbox_field("Risk disclosure acknowledged"),
    checkbox_field("Electronic signature consent"),
]

RISK_FIELDS = [
    text_field("Investor legal name", width="300"),
    checkbox_field("Risk disclosure acknowledged"),
    checkbox_field("No advice acknowledged"),
    checkbox_field("Illiquidity acknowledged"),
]

REG_CF_FIELDS = [
    text_field("Investor legal name", width="300"),
    text_field("Investor email", width="260"),
    text_field("Annual income (US$)", width="180"),
    text_field("Net worth excluding primary residence (US$)", width="240"),
    checkbox_field("Investment limit acknowledged"),
    checkbox_field("Portal eligibility confirmed"),
    checkbox_field("Risk disclosure acknowledged"),
]

# ---------------------------------------------------------------------------
# Document metadata
# ---------------------------------------------------------------------------

DOCUMENTS: list[dict[str, Any]] = [
    {
        "slug": "fr-00-fundraising-structure-readiness-memorandum",
        "number": "FR-00",
        "title": "Fundraising Structure and Readiness Memorandum",
        "subtitle": "Private placement and Regulation CF decision framework",
        "category": "Strategy & governance",
        "track": "Framework",
        "summary": "Internal decision memorandum comparing a Rule 506(b)/Regulation S private placement with a Regulation CF offering, the corporate actions each requires, and the communications and filing gates that must remain closed until counsel clears them.",
        "signers": [COMPANY_SIGNER, COUNSEL_SIGNER],
    },
    {
        "slug": "fr-01-board-resolution-private-placement",
        "number": "FR-01",
        "title": "Board Resolution — Private Placement Authorization",
        "subtitle": "Rule 506(b) and Regulation S offering authority",
        "category": "Corporate authority",
        "track": "Private placement",
        "summary": "Draft board resolution authorizing a private placement of post-money SAFE instruments to accredited U.S. investors and eligible non-U.S. investors, subject to a board-approved cap, minimum, cap table and counsel review. It is not effective until adopted.",
        "signers": [COMPANY_SIGNER, DIRECTOR_SIGNER, SECRETARY_SIGNER],
    },
    {
        "slug": "fr-02-board-resolution-regulation-cf-preparation",
        "number": "FR-02",
        "title": "Board Resolution — Regulation CF Preparation",
        "subtitle": "Portal engagement and Form C preparation authority",
        "category": "Corporate authority",
        "track": "Regulation CF",
        "summary": "Draft board resolution authorizing preparation for a possible Regulation CF offering through a FINRA-registered funding portal, while expressly prohibiting any offer, sale, solicitation or receipt of funds before SEC qualification.",
        "signers": [COMPANY_SIGNER, DIRECTOR_SIGNER, SECRETARY_SIGNER],
    },
    {
        "slug": "fr-03-officers-certificate-offering-terms-cap-table",
        "number": "FR-03",
        "title": "Officer’s Certificate — Offering Terms and Capitalization",
        "subtitle": "Verified terms, cap table and disclosure schedule",
        "category": "Corporate authority",
        "track": "Private placement",
        "summary": "Draft officer’s certificate to be completed and signed only after the board approves the round, the cap table is reconciled and counsel confirms the offering terms. Schedules remain blank until verified.",
        "signers": [COMPANY_SIGNER, SECRETARY_SIGNER],
    },
    {
        "slug": "fr-04-insider-participation-related-party-policy",
        "number": "FR-04",
        "title": "Insider Participation and Related-Party Acknowledgment",
        "subtitle": "Same-terms policy for founders, officers and directors",
        "category": "Corporate authority",
        "track": "Private placement",
        "summary": "Draft policy and acknowledgment governing insider participation in the round, conflict disclosure, board approval and the prohibition on side letters or preferential information.",
        "signers": [COMPANY_SIGNER, INSIDER_SIGNER],
    },
    {
        "slug": "fr-10-confidential-private-placement-summary",
        "number": "FR-10",
        "title": "Confidential Private Placement Summary and Notice",
        "subtitle": "Accredited U.S. investors and eligible non-U.S. investors",
        "category": "Private placement",
        "track": "Private placement",
        "summary": "A confidential, one-to-one investor summary that describes the company, proposed SAFE terms, process and risks without general solicitation. It is not a private placement memorandum or an offer capable of acceptance.",
        "signers": [COMPANY_SIGNER, INVESTOR_SIGNER],
        "investorFields": RISK_FIELDS,
    },
    {
        "slug": "fr-11-post-money-safe",
        "number": "FR-11",
        "title": "Post-Money SAFE — Valuation Cap, No Discount",
        "subtitle": "Simple agreement for future equity",
        "category": "Private placement",
        "track": "Private placement",
        "summary": "Company-specific draft post-money SAFE with a valuation cap, no discount, pro rata rights and standard conversion, liquidity and dissolution mechanics. Terms remain blank until board approval.",
        "signers": [COMPANY_SIGNER, INVESTOR_SIGNER],
        "investorFields": SAFE_FIELDS,
    },
    {
        "slug": "fr-12-accredited-investor-bad-actor-questionnaire",
        "number": "FR-12",
        "title": "Accredited Investor and Bad Actor Questionnaire",
        "subtitle": "Investor eligibility, verification and Rule 506(d) certification",
        "category": "Private placement",
        "track": "Private placement",
        "summary": "Investor questionnaire covering accredited-investor categories, verification method, source of funds, sanctions and the Rule 506(d) bad-actor questions. It is designed for DocuSign completion fields.",
        "signers": [INVESTOR_SIGNER],
        "investorFields": ACCREDITED_FIELDS,
    },
    {
        "slug": "fr-13-regulation-s-offshore-investor-certificate",
        "number": "FR-13",
        "title": "Regulation S Offshore Investor Certificate",
        "subtitle": "Non-U.S. person and offshore transaction representations",
        "category": "Private placement",
        "track": "Private placement",
        "summary": "Certificate for eligible non-U.S. investors covering non-U.S. person status, offshore transaction, no directed selling efforts, resale restrictions, sanctions and tax-form instructions. It does not replace the current IRS Form W-8.",
        "signers": [INVESTOR_SIGNER],
        "investorFields": REG_S_FIELDS,
    },
    {
        "slug": "fr-14-subscription-funding-closing-instructions",
        "number": "FR-14",
        "title": "Subscription, Funding and Closing Instructions",
        "subtitle": "Investor checklist and secure funding controls",
        "category": "Private placement",
        "track": "Private placement",
        "summary": "Step-by-step subscription and closing instructions, including DocuSign execution, independent verification of funding instructions, closing conditions, issuance mechanics and record retention.",
        "signers": [COMPANY_SIGNER, INVESTOR_SIGNER],
        "investorFields": RISK_FIELDS,
    },
    {
        "slug": "fr-15-safe-register-cap-table-schedule",
        "number": "FR-15",
        "title": "SAFE Register and Capitalization Schedule",
        "subtitle": "Post-closing control record",
        "category": "Private placement",
        "track": "Private placement",
        "summary": "Internal register and cap-table schedule for SAFE issuances, conversions, pro rata rights, amendments and reconciliation. It is a control record, not evidence that any SAFE has been issued.",
        "signers": [COMPANY_SIGNER, COUNSEL_SIGNER],
    },
    {
        "slug": "fr-16-form-d-blue-sky-filing-worksheet",
        "number": "FR-16",
        "title": "Form D and Blue Sky Filing Worksheet",
        "subtitle": "Filing calendar and state notice tracker",
        "category": "Private placement",
        "track": "Private placement",
        "summary": "Worksheet for the Form D filing and state notice process, including the 15-calendar-day deadline after the first sale, issuer and offering data, signature authority and evidence retention. It is not an EDGAR filing.",
        "signers": [COMPANY_SIGNER, COUNSEL_SIGNER],
    },
    {
        "slug": "fr-17-private-placement-risk-disclosure",
        "number": "FR-17",
        "title": "Private Placement Risk Disclosure and Acknowledgment",
        "subtitle": "Investor risk factors and acknowledgment",
        "category": "Private placement",
        "track": "Private placement",
        "summary": "Company-specific risk disclosure covering early-stage uncertainty, illiquidity, dilution, SAFE mechanics, management concentration, regulatory gates, technology and data dependencies, AI limitations and tax risks.",
        "signers": [INVESTOR_SIGNER],
        "investorFields": RISK_FIELDS,
    },
    {
        "slug": "fr-20-regulation-cf-readiness-portal-memorandum",
        "number": "FR-20",
        "title": "Regulation CF Readiness and Portal Engagement Memorandum",
        "subtitle": "Intermediary selection, budget and qualification gates",
        "category": "Regulation CF",
        "track": "Regulation CF",
        "summary": "Internal memorandum on Regulation CF readiness, FINRA-registered portal selection, disclosure preparation, investor limits, escrow, ongoing reporting and the prohibition on offers before SEC qualification.",
        "signers": [COMPANY_SIGNER, COUNSEL_SIGNER],
    },
    {
        "slug": "fr-21-form-c-preparation-workbook",
        "number": "FR-21",
        "title": "Form C Preparation Workbook",
        "subtitle": "Field-by-field disclosure and evidence schedule",
        "category": "Regulation CF",
        "track": "Regulation CF",
        "summary": "Preparation workbook for the information required in a Form C offering statement. It is not an official SEC form and must not be filed or treated as a complete disclosure document.",
        "signers": [COMPANY_SIGNER, COUNSEL_SIGNER],
    },
    {
        "slug": "fr-22-offering-statement-narrative-risk-factors",
        "number": "FR-22",
        "title": "Offering Statement Narrative and Risk Factors",
        "subtitle": "Regulation CF disclosure drafting template",
        "category": "Regulation CF",
        "track": "Regulation CF",
        "summary": "Draft narrative and risk-factor template for a possible Regulation CF offering, with explicit placeholders for verified financials, ownership, management and use-of-proceeds information. No SEC qualification is implied.",
        "signers": [COMPANY_SIGNER, COUNSEL_SIGNER],
    },
    {
        "slug": "fr-23-regulation-cf-investor-limit-acknowledgment",
        "number": "FR-23",
        "title": "Regulation CF Investor Limit Acknowledgment",
        "subtitle": "Eligibility and investment-limit certification",
        "category": "Regulation CF",
        "track": "Regulation CF",
        "summary": "Investor acknowledgment of the Regulation CF investment limits, portal eligibility determination, cancellation rights and the requirement to use verified income and net-worth figures.",
        "signers": [INVESTOR_SIGNER],
        "investorFields": REG_CF_FIELDS,
    },
    {
        "slug": "fr-24-regulation-cf-communications-policy",
        "number": "FR-24",
        "title": "Regulation CF Communications and Campaign Policy",
        "subtitle": "Pre-qualification, live-campaign and closing rules",
        "category": "Regulation CF",
        "track": "Regulation CF",
        "summary": "Policy for issuer communications before qualification, during a live campaign and after closing, including portal-approved materials, records, social media, corrections and complaints.",
        "signers": [COMPANY_SIGNER, COUNSEL_SIGNER],
    },
    {
        "slug": "fr-25-regulation-cf-ongoing-reporting-calendar",
        "number": "FR-25",
        "title": "Regulation CF Ongoing Reporting Calendar",
        "subtitle": "Annual reports, current reports and termination",
        "category": "Regulation CF",
        "track": "Regulation CF",
        "summary": "Control calendar for Regulation CF annual reports, current-event reports, termination, bad-actor re-certification and recordkeeping. Deadlines and obligations must be confirmed with counsel and the portal.",
        "signers": [COMPANY_SIGNER, COUNSEL_SIGNER],
    },
    {
        "slug": "fr-30-docusign-execution-records-policy",
        "number": "FR-30",
        "title": "DocuSign Execution and Records Retention Policy",
        "subtitle": "Signer authority, envelope controls and evidence",
        "category": "Execution controls",
        "track": "Execution",
        "summary": "Policy for preparing, sending, completing and retaining fundraising envelopes in DocuSign, including signer verification, anchored fields, certificate of completion, executed PDF and access controls.",
        "signers": [COMPANY_SIGNER, COUNSEL_SIGNER],
    },
]


# ---------------------------------------------------------------------------
# Markdown parser
# ---------------------------------------------------------------------------

INLINE_RE = re.compile(r"(\*\*.+?\*\*|\*.+?\*|`.+?`)")


def inline_parts(text: str) -> list[tuple[str, str]]:
    parts: list[tuple[str, str]] = []
    for piece in INLINE_RE.split(text):
        if not piece:
            continue
        if piece.startswith("**") and piece.endswith("**") and len(piece) > 4:
            parts.append((piece[2:-2], "bold"))
        elif piece.startswith("*") and piece.endswith("*") and len(piece) > 2:
            parts.append((piece[1:-1], "italic"))
        elif piece.startswith("`") and piece.endswith("`") and len(piece) > 2:
            parts.append((piece[1:-1], "code"))
        else:
            parts.append((piece, "normal"))
    return parts


SIGNATURE_LINE_RE = re.compile(
    r"^\**\s*(Company|Investor|Counsel|Secretary|Director|Insider)\s+"
    r"(signature|printed name|capacity|date)\s*:",
    re.IGNORECASE,
)


def strip_inline_signature_blocks(blocks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Remove duplicated signature lines from the body.

    The controlled execution page is generated at the end of every document.
    Keeping a second copy in the body would make DocuSign anchoring ambiguous
    and would make the Word draft look unfinished.
    """
    cleaned = []
    for block in blocks:
        if block["type"] == "paragraph" and SIGNATURE_LINE_RE.match(block["text"]):
            continue
        cleaned.append(block)
    return cleaned


def parse_markdown(text: str) -> list[dict[str, Any]]:
    blocks: list[dict[str, Any]] = []
    lines = text.splitlines()
    index = 0
    paragraph: list[str] = []

    def flush_paragraph() -> None:
        nonlocal paragraph
        if paragraph:
            blocks.append({"type": "paragraph", "text": " ".join(part.strip() for part in paragraph).strip()})
            paragraph = []

    while index < len(lines):
        line = lines[index]
        stripped = line.strip()
        if not stripped:
            flush_paragraph()
            index += 1
            continue
        if stripped in {"<!-- pagebreak -->", "<!-- PAGEBREAK -->"}:
            flush_paragraph()
            blocks.append({"type": "pagebreak"})
            index += 1
            continue
        if stripped.startswith("#"):
            flush_paragraph()
            level = len(stripped) - len(stripped.lstrip("#"))
            blocks.append({"type": "heading", "level": min(level, 4), "text": stripped[level:].strip()})
            index += 1
            continue
        if stripped.startswith("> "):
            flush_paragraph()
            quote: list[str] = []
            while index < len(lines) and lines[index].strip().startswith("> "):
                quote.append(lines[index].strip()[2:].strip())
                index += 1
            blocks.append({"type": "callout", "text": " ".join(quote)})
            continue
        if stripped.startswith("|") and "|" in stripped[1:]:
            flush_paragraph()
            table_lines: list[str] = []
            while index < len(lines) and lines[index].strip().startswith("|"):
                table_lines.append(lines[index].strip())
                index += 1
            rows: list[list[str]] = []
            for row_line in table_lines:
                cells = [cell.strip() for cell in row_line.strip("|").split("|")]
                if all(re.fullmatch(r":?-{3,}:?", cell) for cell in cells if cell):
                    continue
                rows.append(cells)
            if rows:
                blocks.append({"type": "table", "header": rows[0], "rows": rows[1:]})
            continue
        if re.match(r"^[-*]\s+", stripped):
            flush_paragraph()
            items: list[str] = []
            while index < len(lines) and re.match(r"^[-*]\s+", lines[index].strip()):
                items.append(re.sub(r"^[-*]\s+", "", lines[index].strip()))
                index += 1
            blocks.append({"type": "bullets", "items": items})
            continue
        if re.match(r"^\d+\.\s+", stripped):
            flush_paragraph()
            items = []
            while index < len(lines) and re.match(r"^\d+\.\s+", lines[index].strip()):
                items.append(re.sub(r"^\d+\.\s+", "", lines[index].strip()))
                index += 1
            blocks.append({"type": "numbers", "items": items})
            continue
        paragraph.append(stripped)
        index += 1
    flush_paragraph()
    return blocks


# ---------------------------------------------------------------------------
# DOCX helpers
# ---------------------------------------------------------------------------

def shade(cell_or_paragraph, fill: str) -> None:
    element = cell_or_paragraph._tc if hasattr(cell_or_paragraph, "_tc") else cell_or_paragraph._p
    pr = element.get_or_add_tcPr() if hasattr(cell_or_paragraph, "_tc") else element.get_or_add_pPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:fill"), fill)
    pr.append(shd)


def set_cell_margins(cell, top=90, start=110, bottom=90, end=110) -> None:
    tc_pr = cell._tc.get_or_add_tcPr()
    mar = OxmlElement("w:tcMar")
    for key, value in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = OxmlElement(f"w:{key}")
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")
        mar.append(node)
    tc_pr.append(mar)


def add_bottom_border(paragraph, color: str = "C9B98A", size: str = "8") -> None:
    p_pr = paragraph._p.get_or_add_pPr()
    borders = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), size)
    bottom.set(qn("w:space"), "4")
    bottom.set(qn("w:color"), color)
    borders.append(bottom)
    p_pr.append(borders)


def add_page_field(paragraph) -> None:
    run = paragraph.add_run()
    fld = OxmlElement("w:fldSimple")
    fld.set(qn("w:instr"), "PAGE")
    run._r.addnext(fld)


def add_inline_runs(paragraph, text: str, *, size: int = 10, color: RGBColor | None = None) -> None:
    for piece, style in inline_parts(text):
        run = paragraph.add_run(piece)
        run.font.name = "Georgia"
        run.font.size = Pt(size)
        run.font.color.rgb = color or INK
        if style == "bold":
            run.bold = True
        elif style == "italic":
            run.italic = True
        elif style == "code":
            run.font.name = "Consolas"
            run.font.size = Pt(size - 0.5)


def set_paragraph_spacing(paragraph, before=0, after=6, line=1.18) -> None:
    paragraph.paragraph_format.space_before = Pt(before)
    paragraph.paragraph_format.space_after = Pt(after)
    paragraph.paragraph_format.line_spacing = line


def add_heading(document, text: str, level: int) -> None:
    paragraph = document.add_paragraph()
    if level <= 2:
        paragraph.paragraph_format.page_break_before = level == 1 and len(document.paragraphs) > 10
    run = paragraph.add_run(text)
    run.font.name = "Arial"
    run.bold = True
    run.font.color.rgb = GOLD if level <= 2 else INK
    run.font.size = Pt({1: 13, 2: 12, 3: 10.5, 4: 10}[level])
    set_paragraph_spacing(paragraph, before=14 if level <= 2 else 9, after=5, line=1.1)
    if level == 1:
        add_bottom_border(paragraph, "D9C98A", "4")


def add_callout(document, text: str) -> None:
    table = document.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = table.cell(0, 0)
    shade(cell, PALE)
    set_cell_margins(cell)
    paragraph = cell.paragraphs[0]
    set_paragraph_spacing(paragraph, before=2, after=2, line=1.15)
    add_inline_runs(paragraph, text, size=9.5, color=MUTED)
    paragraph.runs[0].italic = True
    document.add_paragraph()


def add_table(document, header: list[str], rows: list[list[str]]) -> None:
    table = document.add_table(rows=1, cols=len(header))
    table.style = "Table Grid"
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    for idx, value in enumerate(header):
        cell = table.rows[0].cells[idx]
        shade(cell, PALE)
        set_cell_margins(cell)
        paragraph = cell.paragraphs[0]
        set_paragraph_spacing(paragraph, before=1, after=1, line=1.05)
        run = paragraph.add_run(value)
        run.font.name = "Arial"
        run.bold = True
        run.font.size = Pt(8.5)
        run.font.color.rgb = INK
    for row in rows:
        cells = table.add_row().cells
        for idx, value in enumerate(row[: len(header)]):
            cell = cells[idx]
            set_cell_margins(cell)
            paragraph = cell.paragraphs[0]
            set_paragraph_spacing(paragraph, before=1, after=1, line=1.08)
            add_inline_runs(paragraph, value, size=8.5)
    document.add_paragraph()


def add_bullets(document, items: list[str], numbered: bool = False) -> None:
    for index, item in enumerate(items, start=1):
        paragraph = document.add_paragraph(style="List Number" if numbered else "List Bullet")
        set_paragraph_spacing(paragraph, before=0, after=3, line=1.15)
        add_inline_runs(paragraph, item, size=10)


def configure_docx(document) -> None:
    section = document.sections[0]
    section.page_width = Inches(8.5)
    section.page_height = Inches(11)
    section.top_margin = Inches(0.85)
    section.bottom_margin = Inches(0.8)
    section.left_margin = Inches(0.9)
    section.right_margin = Inches(0.9)
    section.header_distance = Inches(0.35)
    section.footer_distance = Inches(0.35)

    normal = document.styles["Normal"]
    normal.font.name = "Georgia"
    normal.font.size = Pt(10)
    normal.paragraph_format.space_after = Pt(6)
    normal.paragraph_format.line_spacing = 1.18

    for style_name in ("List Bullet", "List Number"):
        style = document.styles[style_name]
        style.font.name = "Georgia"
        style.font.size = Pt(10)


def add_header_footer(document) -> None:
    section = document.sections[0]
    header = section.header
    paragraph = header.paragraphs[0]
    paragraph.alignment = WD_ALIGN_PARAGRAPH.LEFT
    if LOGO_SMALL.exists():
        run = paragraph.add_run()
        run.add_picture(str(LOGO_SMALL), width=Inches(0.38))
    run = paragraph.add_run("  TRADINGBIBLE HOLDINGS, INC.")
    run.font.name = "Arial"
    run.bold = True
    run.font.size = Pt(7.5)
    run.font.color.rgb = GOLD
    run = paragraph.add_run("   ·   CONFIDENTIAL FUNDRAISING DRAFT")
    run.font.name = "Arial"
    run.font.size = Pt(7)
    run.font.color.rgb = MUTED
    add_bottom_border(paragraph, "D9C98A", "4")

    footer = section.footer
    footer_paragraph = footer.paragraphs[0]
    footer_paragraph.alignment = WD_ALIGN_PARAGRAPH.LEFT
    run = footer_paragraph.add_run("DRAFT · NOT EXECUTED · COUNSEL REVIEW REQUIRED   ·   tradingbible.app   ·   ")
    run.font.name = "Arial"
    run.font.size = Pt(7)
    run.font.color.rgb = MUTED
    add_page_field(footer_paragraph)
    run = footer_paragraph.add_run(" of ")
    run.font.name = "Arial"
    run.font.size = Pt(7)
    run.font.color.rgb = MUTED
    run = footer_paragraph.add_run()
    fld = OxmlElement("w:fldSimple")
    fld.set(qn("w:instr"), "NUMPAGES")
    run._r.addnext(fld)


def add_cover(document, meta: dict[str, Any]) -> None:
    paragraph = document.add_paragraph()
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    paragraph.paragraph_format.space_before = Pt(18)
    if LOGO_SMALL.exists():
        paragraph.add_run().add_picture(str(LOGO_SMALL), width=Inches(0.95))

    paragraph = document.add_paragraph()
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = paragraph.add_run("TRADINGBIBLE HOLDINGS, INC.")
    run.font.name = "Arial"
    run.bold = True
    run.font.size = Pt(12)
    run.font.color.rgb = GOLD
    set_paragraph_spacing(paragraph, before=12, after=2)

    paragraph = document.add_paragraph()
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = paragraph.add_run("CONFIDENTIAL FUNDRAISING DRAFT")
    run.font.name = "Arial"
    run.bold = True
    run.font.size = Pt(8)
    run.font.color.rgb = MUTED
    set_paragraph_spacing(paragraph, before=0, after=18)

    paragraph = document.add_paragraph()
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = paragraph.add_run(meta["title"])
    run.font.name = "Arial"
    run.bold = True
    run.font.size = Pt(23)
    run.font.color.rgb = INK
    set_paragraph_spacing(paragraph, before=6, after=6, line=1.05)

    paragraph = document.add_paragraph()
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = paragraph.add_run(meta["subtitle"])
    run.font.name = "Georgia"
    run.italic = True
    run.font.size = Pt(11)
    run.font.color.rgb = MUTED
    set_paragraph_spacing(paragraph, before=0, after=18)

    paragraph = document.add_paragraph()
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = paragraph.add_run(f"{meta['number']}   ·   VERSION {COMPANY['version']}   ·   {COMPANY['prepared'].upper()}")
    run.font.name = "Arial"
    run.font.size = Pt(8)
    run.font.color.rgb = MUTED
    set_paragraph_spacing(paragraph, before=0, after=16)

    table = document.add_table(rows=1, cols=1)
    cell = table.cell(0, 0)
    shade(cell, PALE)
    set_cell_margins(cell, top=150, start=160, bottom=150, end=160)
    paragraph = cell.paragraphs[0]
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = paragraph.add_run("DRAFT · NOT EXECUTED · COUNSEL REVIEW REQUIRED")
    run.font.name = "Arial"
    run.bold = True
    run.font.size = Pt(8.5)
    run.font.color.rgb = GOLD
    set_paragraph_spacing(paragraph, before=0, after=8)
    paragraph = cell.add_paragraph()
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = paragraph.add_run(
        "This is a confidential drafting instrument for internal review and counsel. It is not an offer to sell, "
        "a solicitation of an offer to buy, a filing, a qualification, an approval or an executed agreement. "
        "No securities have been offered, sold or issued by reason of this document."
    )
    run.font.name = "Georgia"
    run.font.size = Pt(8.5)
    run.font.color.rgb = MUTED
    set_paragraph_spacing(paragraph, before=0, after=0, line=1.12)

    document.add_paragraph().add_run().add_break(docx.enum.text.WD_BREAK.PAGE)


def add_signature_page(document, meta: dict[str, Any], signers: list[dict[str, Any]]) -> None:
    document.add_paragraph().add_run().add_break(docx.enum.text.WD_BREAK.PAGE)
    heading = document.add_paragraph()
    run = heading.add_run("Execution and signature record")
    run.font.name = "Arial"
    run.bold = True
    run.font.size = Pt(13)
    run.font.color.rgb = GOLD
    set_paragraph_spacing(heading, before=0, after=4)
    note = document.add_paragraph()
    add_inline_runs(
        note,
        "The DocuSign tabs are anchored only to the unique execution line in each signer’s block. "
        "Complete only the fields assigned to your capacity. A completed envelope is execution evidence; "
        "it is not a regulatory approval, an SEC qualification or an offer capable of acceptance.",
        size=8.5,
        color=MUTED,
    )
    set_paragraph_spacing(note, before=0, after=12, line=1.12)

    blocks = 2
    rows = (len(signers) + blocks - 1) // blocks
    table = document.add_table(rows=rows, cols=blocks)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    for index, signer_def in enumerate(signers):
        row = index // blocks
        col = index % blocks
        cell = table.cell(row, col)
        set_cell_margins(cell, top=120, start=120, bottom=120, end=120)
        paragraph = cell.paragraphs[0]
        run = paragraph.add_run(signer_def["anchor"].replace("{number}", meta["number"]))
        run.font.name = "Arial"
        run.bold = True
        run.font.size = Pt(7.5)
        run.font.color.rgb = GOLD
        set_paragraph_spacing(paragraph, before=0, after=4)
        paragraph = cell.add_paragraph()
        run = paragraph.add_run(signer_def["party"])
        run.font.name = "Arial"
        run.bold = True
        run.font.size = Pt(8.5)
        set_paragraph_spacing(paragraph, before=0, after=1)
        paragraph = cell.add_paragraph()
        run = paragraph.add_run(f"Capacity: {signer_def['capacity']}")
        run.font.name = "Arial"
        run.font.size = Pt(8)
        run.font.color.rgb = MUTED
        set_paragraph_spacing(paragraph, before=0, after=8)
        for line in (
            signer_def["signatureLines"]["signature"],
            signer_def["signatureLines"]["printedName"],
            signer_def["signatureLines"]["capacity"],
            signer_def["signatureLines"]["date"],
        ):
            paragraph = cell.add_paragraph()
            run = paragraph.add_run(line)
            run.font.name = "Arial"
            run.font.size = Pt(8)
            set_paragraph_spacing(paragraph, before=0, after=5)
    for index in range(len(signers), rows * blocks):
        table.cell(index // blocks, index % blocks).text = ""


def add_completion_fields(document, signer_def: dict[str, Any]) -> None:
    if not signer_def.get("customFields"):
        return
    heading = document.add_paragraph()
    run = heading.add_run(f"Completion fields — {signer_def['party']}")
    run.font.name = "Arial"
    run.bold = True
    run.font.size = Pt(10.5)
    run.font.color.rgb = GOLD
    set_paragraph_spacing(heading, before=10, after=4)
    note = document.add_paragraph()
    add_inline_runs(
        note,
        "These fields are completed in DocuSign. They are displayed here so the Word working copy and the signed PDF carry the same labels.",
        size=8,
        color=MUTED,
    )
    set_paragraph_spacing(note, before=0, after=6)
    table = document.add_table(rows=0, cols=1)
    table.style = "Table Grid"
    for field in signer_def["customFields"]:
        cell = table.add_row().cells[0]
        set_cell_margins(cell)
        paragraph = cell.paragraphs[0]
        set_paragraph_spacing(paragraph, before=1, after=1)
        add_inline_runs(paragraph, field["anchor"], size=8.5)


def build_docx(meta: dict[str, Any], blocks: list[dict[str, Any]], path: Path) -> None:
    document = docx.Document()
    configure_docx(document)
    add_header_footer(document)
    add_cover(document, meta)

    for block in blocks:
        kind = block["type"]
        if kind == "heading":
            add_heading(document, block["text"], block["level"])
        elif kind == "paragraph":
            paragraph = document.add_paragraph()
            set_paragraph_spacing(paragraph, before=0, after=6)
            paragraph.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
            add_inline_runs(paragraph, block["text"], size=10)
        elif kind == "callout":
            add_callout(document, block["text"])
        elif kind == "table":
            add_table(document, block["header"], block["rows"])
        elif kind == "bullets":
            add_bullets(document, block["items"], numbered=False)
        elif kind == "numbers":
            add_bullets(document, block["items"], numbered=True)
        elif kind == "pagebreak":
            document.add_paragraph().add_run().add_break(docx.enum.text.WD_BREAK.PAGE)

    for signer_def in meta["resolvedSigners"]:
        add_completion_fields(document, signer_def)
    add_signature_page(document, meta, meta["resolvedSigners"])
    document.save(str(path))


# ---------------------------------------------------------------------------
# HTML / PDF
# ---------------------------------------------------------------------------

def html_inline(text: str) -> str:
    pieces = []
    for value, style in inline_parts(text):
        escaped = html.escape(value)
        if style == "bold":
            pieces.append(f"<strong>{escaped}</strong>")
        elif style == "italic":
            pieces.append(f"<em>{escaped}</em>")
        elif style == "code":
            pieces.append(f"<code>{escaped}</code>")
        else:
            pieces.append(escaped)
    return "".join(pieces)


def build_html(meta: dict[str, Any], blocks: list[dict[str, Any]]) -> str:
    logo_data = ""
    if LOGO_SMALL.exists():
        logo_data = base64.b64encode(LOGO_SMALL.read_bytes()).decode("ascii")

    body: list[str] = []
    for block in blocks:
        kind = block["type"]
        if kind == "heading":
            tag = {1: "h1", 2: "h2", 3: "h3", 4: "h4"}[block["level"]]
            body.append(f"<{tag}>{html_inline(block['text'])}</{tag}>")
        elif kind == "paragraph":
            body.append(f"<p>{html_inline(block['text'])}</p>")
        elif kind == "callout":
            body.append(f'<div class="callout">{html_inline(block["text"])}</div>')
        elif kind == "table":
            head = "".join(f"<th>{html_inline(cell)}</th>" for cell in block["header"])
            rows = "".join(
                "<tr>" + "".join(f"<td>{html_inline(cell)}</td>" for cell in row[: len(block["header"])]) + "</tr>"
                for row in block["rows"]
            )
            body.append(f'<table class="data-table"><thead><tr>{head}</tr></thead><tbody>{rows}</tbody></table>')
        elif kind == "bullets":
            body.append("<ul>" + "".join(f"<li>{html_inline(item)}</li>" for item in block["items"]) + "</ul>")
        elif kind == "numbers":
            body.append("<ol>" + "".join(f"<li>{html_inline(item)}</li>" for item in block["items"]) + "</ol>")
        elif kind == "pagebreak":
            body.append('<div class="page-break"></div>')

    completion_sections: list[str] = []
    for signer_def in meta["resolvedSigners"]:
        if not signer_def.get("customFields"):
            continue
        rows = "".join(f"<tr><td>{html.escape(field['anchor'])}</td></tr>" for field in signer_def["customFields"])
        completion_sections.append(
            f'<section class="completion"><h2>Completion fields — {html.escape(signer_def["party"])}</h2>'
            f'<p class="small">These fields are completed in DocuSign. They are displayed here so the Word working copy and the signed PDF carry the same labels.</p>'
            f'<table class="data-table single">{rows}</table></section>'
        )

    signature_blocks = []
    for signer_def in meta["resolvedSigners"]:
        lines = "".join(
            f'<div class="sig-line">{html.escape(line)}</div>'
            for line in (
                signer_def["signatureLines"]["signature"],
                signer_def["signatureLines"]["printedName"],
                signer_def["signatureLines"]["capacity"],
                signer_def["signatureLines"]["date"],
            )
        )
        signature_blocks.append(
            f'<div class="signer"><div class="anchor">{html.escape(signer_def["anchor"].replace("{number}", meta["number"]))}</div>'
            f'<div class="party">{html.escape(signer_def["party"])}</div>'
            f'<div class="capacity">Capacity: {html.escape(signer_def["capacity"])}</div>{lines}</div>'
        )

    return f"""<!doctype html>
<html><head><meta charset="utf-8"><title>{html.escape(meta['number'])} — {html.escape(meta['title'])}</title>
<style>
  @page {{
    size: Letter;
    margin: 30mm 16mm 26mm;
    @top-left {{ content: ""; background-image: url("data:image/png;base64,{logo_data}"); background-repeat: no-repeat; background-position: left center; background-size: 9mm auto; width: 22mm; height: 9mm; }}
    @top-center {{ content: "TRADINGBIBLE HOLDINGS, INC. · CONFIDENTIAL"; color: #6b5a24; font-family: Arial, sans-serif; font-size: 6.8pt; letter-spacing: .03em; }}
    @top-right {{ content: "{html.escape(meta['number'])} · DRAFT"; color: #9a7a1e; font-family: Arial, sans-serif; font-size: 6.8pt; font-weight: 700; letter-spacing: .03em; }}
    @bottom-left {{ content: "DRAFT · NOT EXECUTED · COUNSEL REVIEW REQUIRED"; color: #6a665a; font-family: Arial, sans-serif; font-size: 6pt; }}
    @bottom-center {{ content: "tradingbible.app · legal@tradingbible.app"; color: #6a665a; font-family: Arial, sans-serif; font-size: 6pt; }}
    @bottom-right {{ content: "Page " counter(page) " of " counter(pages); color: #6a665a; font-family: Arial, sans-serif; font-size: 6pt; }}
  }}
  @page :first {{
    margin-top: 18mm;
    margin-bottom: 20mm;
    @top-left {{ content: none; background: none; }}
    @top-center {{ content: none; }}
    @top-right {{ content: none; }}
    @bottom-left {{ content: none; }}
    @bottom-center {{ content: none; }}
    @bottom-right {{ content: none; }}
  }}
  * {{ box-sizing: border-box; }}
  html, body {{ margin: 0; padding: 0; }}
  body {{ color: #1a1a1a; font-family: Georgia, "Times New Roman", serif; font-size: 10pt; line-height: 1.42; }}
  .watermark {{ position: fixed; top: 44%; left: 8%; right: 8%; text-align: center; transform: rotate(-28deg); font-family: Arial, sans-serif; font-size: 34pt; font-weight: 800; color: rgba(154,122,30,0.055); letter-spacing: 3px; z-index: -1; }}
  .cover {{ text-align: center; padding-top: 0; page-break-after: always; }}
  .cover img {{ width: 23mm; height: 23mm; object-fit: contain; }}
  .org {{ margin-top: 5mm; font-family: Arial, sans-serif; font-size: 11pt; font-weight: 800; letter-spacing: .12em; color: #9a7a1e; }}
  .kicker {{ margin-top: 2mm; font-family: Arial, sans-serif; font-size: 7.5pt; font-weight: 700; letter-spacing: .16em; color: #6a665a; }}
  h1.title {{ margin: 8mm 0 3mm; font-family: Arial, sans-serif; font-size: 25pt; line-height: 1.08; letter-spacing: -.02em; color: #171717; }}
  .subtitle {{ font-size: 11.5pt; font-style: italic; color: #5b5545; margin-bottom: 7mm; }}
  .ref {{ font-family: Arial, sans-serif; font-size: 8pt; color: #6a665a; letter-spacing: .04em; }}
  .draft-box {{ margin: 9mm auto 0; max-width: 150mm; border: 1px solid #d9c98a; background: #f7f3e7; padding: 6mm; }}
  .draft-box .draft {{ font-family: Arial, sans-serif; font-size: 8.5pt; font-weight: 800; color: #9a7a1e; letter-spacing: .06em; }}
  .draft-box p {{ font-size: 8.5pt; color: #5b5545; margin: 3mm 0 0; text-align: center; }}
  h1, h2, h3, h4 {{ font-family: Arial, sans-serif; color: #171717; page-break-after: avoid; }}
  h1 {{ font-size: 13pt; margin: 7mm 0 2.5mm; border-bottom: 1px solid #e2d8b9; padding-bottom: 1.5mm; color: #7c621c; }}
  h2 {{ font-size: 11.5pt; margin: 6mm 0 2mm; color: #7c621c; }}
  h3 {{ font-size: 10.2pt; margin: 4.5mm 0 1.5mm; }}
  h4 {{ font-size: 9.5pt; margin: 3.5mm 0 1mm; }}
  p {{ margin: 0 0 2.6mm; text-align: justify; orphans: 3; widows: 3; }}
  ul, ol {{ margin: 0 0 3mm 5.5mm; padding: 0; }}
  li {{ margin: 0 0 1.2mm; }}
  .callout {{ margin: 3mm 0 4mm; padding: 3.2mm 4mm; background: #f7f3e7; border-left: 3px solid #c9a33a; color: #4d4739; font-size: 9pt; font-style: italic; }}
  code {{ font-family: Consolas, monospace; font-size: 8.8pt; background: #f3f0e8; padding: 0 1mm; }}
  table.data-table {{ width: 100%; border-collapse: collapse; margin: 3mm 0 4.5mm; page-break-inside: auto; }}
  table.data-table th, table.data-table td {{ border: 1px solid #b9b09a; padding: 1.6mm 2mm; vertical-align: top; text-align: left; font-size: 8.3pt; line-height: 1.3; }}
  table.data-table th {{ background: #f0ebdc; font-family: Arial, sans-serif; font-size: 8pt; }}
  table.data-table tr {{ page-break-inside: avoid; }}
  table.single td {{ font-family: Arial, sans-serif; }}
  .page-break {{ page-break-before: always; height: 0; }}
  .completion {{ page-break-inside: avoid; margin-top: 5mm; }}
  .small {{ font-size: 8pt; color: #5b5545; }}
  .execution {{ page-break-before: always; }}
  .execution h1 {{ color: #7c621c; }}
  .signature-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; margin-top: 5mm; }}
  .signer {{ border: 1px solid #cfc5ac; padding: 4mm; min-height: 58mm; page-break-inside: avoid; }}
  .anchor {{ font-family: Arial, sans-serif; font-size: 7pt; font-weight: 800; color: #9a7a1e; letter-spacing: .03em; }}
  .party {{ font-family: Arial, sans-serif; font-size: 9pt; font-weight: 700; margin-top: 2mm; }}
  .capacity {{ font-family: Arial, sans-serif; font-size: 8pt; color: #5b5545; margin: 1mm 0 4mm; }}
  .sig-line {{ font-family: Arial, sans-serif; font-size: 8pt; margin-top: 4.5mm; }}
</style></head>
<body>
  <div class="watermark">DRAFT · COUNSEL REVIEW REQUIRED</div>
  <section class="cover">
    <img src="data:image/png;base64,{logo_data}" alt="TradingBible logo" />
    <div class="org">TRADINGBIBLE HOLDINGS, INC.</div>
    <div class="kicker">CONFIDENTIAL FUNDRAISING DRAFT</div>
    <h1 class="title">{html.escape(meta['title'])}</h1>
    <div class="subtitle">{html.escape(meta['subtitle'])}</div>
    <div class="ref">{html.escape(meta['number'])} &nbsp;·&nbsp; VERSION {html.escape(COMPANY['version'])} &nbsp;·&nbsp; {html.escape(COMPANY['prepared'].upper())}</div>
    <div class="draft-box">
      <div class="draft">DRAFT · NOT EXECUTED · COUNSEL REVIEW REQUIRED</div>
      <p>This is a confidential drafting instrument for internal review and counsel. It is not an offer to sell, a solicitation of an offer to buy, a filing, a qualification, an approval or an executed agreement. No securities have been offered, sold or issued by reason of this document.</p>
    </div>
  </section>
  {''.join(body)}
  {''.join(completion_sections)}
  <section class="execution">
    <h1>Execution and signature record</h1>
    <p class="small">The DocuSign tabs are anchored only to the unique execution line in each signer’s block. Complete only the fields assigned to your capacity. A completed envelope is execution evidence; it is not a regulatory approval, an SEC qualification or an offer capable of acceptance.</p>
    <div class="signature-grid">{''.join(signature_blocks)}</div>
  </section>
</body></html>"""


def build_pdf(html_path: Path, pdf_path: Path) -> None:
    profile = Path(tempfile.mkdtemp(prefix="tb-fundraising-chrome-"))
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


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def resolve_signers(meta: dict[str, Any]) -> list[dict[str, Any]]:
    resolved = []
    for base in meta["signers"]:
        item = json.loads(json.dumps(base))
        item["anchor"] = item["anchor"].replace("{number}", meta["number"])
        for field in item.get("fieldAnchors", {}).values():
            field["anchor"] = field["anchor"].replace("{number}", meta["number"])
        item["signatureLines"] = {
            "signature": item["fieldAnchors"]["signature"]["anchor"],
            "printedName": item["fieldAnchors"]["printedName"]["anchor"],
            "capacity": item["fieldAnchors"]["title"]["anchor"],
            "date": item["fieldAnchors"]["date"]["anchor"],
        }
        if item["id"] == "investor" and meta.get("investorFields"):
            item["customFields"] = json.loads(json.dumps(meta["investorFields"]))
        resolved.append(item)
    return resolved


def main() -> None:
    if not CHROME.exists():
        raise SystemExit(f"Missing Chrome: {CHROME}")
    if not SOURCE.exists():
        raise SystemExit(f"Missing source folder: {SOURCE}")

    pdf_dir = STORAGE / "pdf"
    docx_dir = STORAGE / "docx"
    protected_dir = STORAGE / "docx-protected"
    for folder in (STORAGE, pdf_dir, docx_dir, protected_dir, LOGO_SMALL.parent):
        folder.mkdir(parents=True, exist_ok=True)
    if LOGO.exists():
        image = Image.open(LOGO).convert("RGBA")
        image.thumbnail((256, 256), Image.LANCZOS)
        image.save(LOGO_SMALL, optimize=True)

    documents = []
    for meta in DOCUMENTS:
        source = SOURCE / f"{meta['slug']}.md"
        if not source.exists():
            raise SystemExit(f"Missing source: {source}")
        meta = {**meta, "resolvedSigners": resolve_signers(meta)}
        blocks = strip_inline_signature_blocks(parse_markdown(source.read_text(encoding="utf-8")))

        docx_path = docx_dir / f"{meta['slug']}.docx"
        protected_path = protected_dir / f"{meta['slug']}.docx"
        pdf_path = pdf_dir / f"{meta['slug']}.pdf"

        build_docx(meta, blocks, docx_path)
        shutil.copy2(docx_path, protected_path)
        html_text = build_html(meta, blocks)
        for signer_def in meta["resolvedSigners"]:
            anchors = [signer_def["anchor"], *signer_def.get("fieldAnchors", {}).values()]
            for field in signer_def.get("fieldAnchors", {}).values():
                anchors.append(field["anchor"])
            for field in signer_def.get("customFields", []):
                anchors.append(field["anchor"])
            for anchor in anchors:
                value = anchor["anchor"] if isinstance(anchor, dict) else anchor
                if value and value not in html_text:
                    raise RuntimeError(f"{meta['slug']}: missing DocuSign anchor: {value}")
        html_path = pdf_dir / f"{meta['slug']}.html"
        html_path.write_text(html_text, encoding="utf-8")
        build_pdf(html_path, pdf_path)
        html_path.unlink(missing_ok=True)

        documents.append({
            "slug": meta["slug"],
            "number": meta["number"],
            "title": meta["title"],
            "subtitle": meta["subtitle"],
            "category": meta["category"],
            "track": meta["track"],
            "summary": meta["summary"],
            "status": "Draft — not executed",
            "visibility": "internal",
            "classification": "Confidential — internal / counsel / prospective investor",
            "version": f"{COMPANY['version']} · {COMPANY['prepared']}",
            "signatureFields": " + ".join(s["label"] for s in meta["resolvedSigners"]),
            "signatureStatus": "Open — not executed",
            "counselReviewRequired": True,
            "pdf": f"pdf/{meta['slug']}.pdf",
            "docx": f"docx/{meta['slug']}.docx",
            "docxProtected": f"docx-protected/{meta['slug']}.docx",
            "pdfBytes": pdf_path.stat().st_size,
            "docxBytes": docx_path.stat().st_size,
            "emailSubjectPrefix": "TradingBible Confidential",
            "signers": meta["resolvedSigners"],
        })
        print(f"built {meta['number']:6} {meta['slug']}")

    manifest = {
        "title": "TradingBible confidential fundraising document packet",
        "issuer": COMPANY["name"],
        "operator": COMPANY["name"],
        "jurisdiction": COMPANY["jurisdiction"],
        "updated": COMPANY["prepared"],
        "version": COMPANY["version"],
        "notice": "Drafting packet only. Not an offer, solicitation, filing, qualification, approval or executed instrument. Admin access only; counsel review required before any external use.",
        "documents": documents,
    }
    (STORAGE / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {STORAGE / 'manifest.json'} ({len(documents)} documents)")


if __name__ == "__main__":
    main()
