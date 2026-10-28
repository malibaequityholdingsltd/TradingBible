#!/usr/bin/env python3
"""Build the controlled TB stock document library.

The nine source instruments are the signature-ready Word drafts in the
TradingBible TB stock package.  This script makes three deterministic changes
to each source before publishing it to the API storage area:

  1. Adds a unique execution-block anchor to each signer cell so DocuSign can
     place tabs only inside the correct signer's block.
  2. Adds printed-name and capacity lines required by the DocuSign tabs.
  3. Replaces the old "DocSign" label with "DocuSign" and rejects any `.net`
     reference in the published DOCX/PDF output.

It writes the DOCX reader copies, PDF files used only for DocuSign anchoring,
and the manifest consumed by the API.  Run from the repository root:

  python3 scripts/build-tb-stock-documents.py
"""

from __future__ import annotations

import html
import json
import shutil
import subprocess
import tempfile
import zipfile
from pathlib import Path

import docx
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.oxml.ns import qn
from docx.shared import Pt, RGBColor
from docx.table import Table
from docx.text.paragraph import Paragraph


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = Path("/Users/malibagt/Downloads/TradingBible_TB_Stock_Market_Reference_Style")
STORAGE = ROOT / "apps/api/storage/tb-stock-documents"
CHROME = Path("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")

DOCUMENTS = [
    {
        "source": "01_TB_Public_Markets_Strategy_and_Board_Feasibility_Mandate.docx",
        "slug": "tb-public-markets-strategy-board-feasibility",
        "number": "TB-01",
        "title": "TB Public Markets Strategy and Board Feasibility Mandate",
        "category": "Corporate authority",
        "summary": "Authorizes feasibility work on a possible future public listing. It does not authorize an offering, an exchange application, or a listing.",
    },
    {
        "source": "02_LLC_Conversion_and_Corporate_Restructuring_Framework.docx",
        "slug": "tb-llc-conversion-corporate-restructuring",
        "number": "TB-02",
        "title": "LLC Conversion and Corporate Restructuring Framework",
        "category": "Corporate authority",
        "summary": "Framework for reconciling the LLC record and evaluating a corporate conversion. No conversion, share issuance, or ownership change is effected by this draft.",
    },
    {
        "source": "03_TB_Share_Capital_and_Shareholder_Governance.docx",
        "slug": "tb-share-capital-shareholder-governance",
        "number": "TB-03",
        "title": "TB Share Capital and Shareholder Governance",
        "category": "Equity & governance",
        "summary": "Proposed share-capital and shareholder-governance terms for a future qualified issuer. No shares, price, allocation, or public market is created.",
    },
    {
        "source": "04_SEC_Registration_and_Prospectus_Preparation_Standard.docx",
        "slug": "tb-sec-registration-prospectus-standard",
        "number": "TB-04",
        "title": "SEC Registration and Prospectus Preparation Standard",
        "category": "Securities",
        "summary": "Preparation standard for a possible SEC registration and prospectus. No filing, effectiveness, or regulatory approval is implied.",
    },
    {
        "source": "05_Audit_and_Financial_Reporting_Readiness.docx",
        "slug": "tb-audit-financial-reporting-readiness",
        "number": "TB-05",
        "title": "Audit and Financial Reporting Readiness",
        "category": "Financial reporting",
        "summary": "Readiness standard for investor-grade financial statements and reporting controls. No audit opinion, reported result, or financial approval exists.",
    },
    {
        "source": "06_Public_Company_Governance_and_Ethics_Charter.docx",
        "slug": "tb-public-company-governance-ethics",
        "number": "TB-06",
        "title": "Public Company Governance and Ethics Charter",
        "category": "Governance",
        "summary": "Proposed governance, board, committee, and ethics framework for a future public issuer. Board composition and committee appointments remain future actions.",
    },
    {
        "source": "07_Exchange_Listing_and_IPO_Execution_Playbook.docx",
        "slug": "tb-exchange-listing-ipo-playbook",
        "number": "TB-07",
        "title": "Exchange Listing and IPO Execution Playbook",
        "category": "IPO preparation",
        "summary": "Playbook for evaluating an exchange listing and IPO execution. Nasdaq is a target only; no application, approval, or listing exists.",
    },
    {
        "source": "08_IPO_Due_Diligence_and_Evidence_Governance.docx",
        "slug": "tb-ipo-due-diligence-evidence",
        "number": "TB-08",
        "title": "IPO Due Diligence and Evidence Governance",
        "category": "Diligence",
        "summary": "Data-room, evidence, and verification standard for a possible IPO process. It does not establish any fact, valuation, or approval.",
    },
    {
        "source": "09_TB_Electronic_Signature_and_Approval_Protocol.docx",
        "slug": "tb-electronic-signature-approval-protocol",
        "number": "TB-09",
        "title": "TB Electronic Signature and Approval Protocol",
        "category": "Execution controls",
        "summary": "Control protocol for electronic signature and approval of TB instruments. A completed DocuSign envelope is execution evidence, not a regulatory or listing approval.",
    },
]

PARTY = "Malik Nlem"
CAPACITY = "Chief Executive Manager"
OPTIONAL_PARTY = "Additional Authorized Signatory"
OPTIONAL_CAPACITY = "Authorized Signatory"

# Each tab is anchored to its own line. The labels are unique per signer, so
# one recipient can never receive a field belonging to the other block.
ISSUER_FIELDS = {
    "signature": "Issuer signature: __________________",
    "printedName": "Issuer printed name: ______________",
    "title": "Issuer capacity: __________________",
    "date": "Issuer date: ______________________",
}
OPTIONAL_FIELDS = {
    "signature": "Additional signature: ______________",
    "printedName": "Additional printed name: __________",
    "title": "Additional capacity: ______________",
    "date": "Additional date: __________________",
}


def execution_anchor(number: str, optional: bool = False) -> str:
    seq = number.replace("TB-", "")
    suffix = "OPTIONAL SIGNATORY" if optional else "AUTHORIZED SIGNATORY"
    return f"TB EXECUTION {seq} - {suffix}"


def set_cell_text(cell, lines: list[tuple[str, bool]]) -> None:
    for paragraph in list(cell.paragraphs):
        paragraph._element.getparent().remove(paragraph._element)
    for index, (text, bold) in enumerate(lines):
        paragraph = cell.add_paragraph()
        paragraph.paragraph_format.space_before = Pt(0)
        paragraph.paragraph_format.space_after = Pt(3)
        paragraph.paragraph_format.line_spacing = 1.05
        run = paragraph.add_run(text)
        run.font.name = "Arial"
        run.font.size = Pt(8.5 if bold else 9)
        run.font.bold = bold
        run.font.color.rgb = RGBColor(0x8A, 0x67, 0x14) if bold else RGBColor(0x22, 0x22, 0x22)


def add_page_break_before(element) -> None:
    paragraph = docx.Document().add_paragraph()
    run = paragraph.add_run()
    run.add_break(WD_BREAK.PAGE)
    element.addprevious(paragraph._p)


def prepare_docx(source: Path, target: Path, doc_meta: dict) -> None:
    document = docx.Document(str(source))

    # Make the execution heading explicit and keep the signature block on a
    # fresh page. The source heading is the last Heading 1 named "Execution".
    execution_heading = None
    for paragraph in document.paragraphs:
        if paragraph.text.strip().lower() == "execution":
            execution_heading = paragraph
    if execution_heading is None:
        raise RuntimeError(f"{source.name}: execution heading not found")
    execution_heading.text = "Execution and signature record"
    add_page_break_before(execution_heading._p)

    table = document.tables[-1] if document.tables else None
    if table is None or len(table.rows) < 1 or len(table.rows[0].cells) < 3:
        raise RuntimeError(f"{source.name}: expected a two-signer execution table")

    anchor_one = execution_anchor(doc_meta["number"])
    anchor_two = execution_anchor(doc_meta["number"], optional=True)
    left, _spacer, right = table.rows[0].cells[:3]
    set_cell_text(left, [
        (anchor_one, True),
        (PARTY, False),
        (f"Capacity: {CAPACITY}", False),
        (ISSUER_FIELDS["title"], False),
        (ISSUER_FIELDS["signature"], False),
        (ISSUER_FIELDS["printedName"], False),
        (ISSUER_FIELDS["date"], False),
    ])
    set_cell_text(right, [
        (anchor_two, True),
        (f"{OPTIONAL_PARTY} (if required)", False),
        (f"Capacity: {OPTIONAL_CAPACITY}", False),
        (OPTIONAL_FIELDS["title"], False),
        (OPTIONAL_FIELDS["signature"], False),
        (OPTIONAL_FIELDS["printedName"], False),
        (OPTIONAL_FIELDS["date"], False),
    ])

    document.save(str(target))

    # The source calls the provider "DocSign"; the controlled copy must name
    # the real provider. A zip-level replacement also catches split runs.
    replace_in_docx(target, {"DocSign": "DocuSign"})


def replace_in_docx(path: Path, replacements: dict[str, str]) -> None:
    temporary = path.with_suffix(".rewrite.docx")
    with zipfile.ZipFile(path, "r") as source_zip, zipfile.ZipFile(temporary, "w", zipfile.ZIP_DEFLATED) as target_zip:
        for item in source_zip.infolist():
            data = source_zip.read(item.filename)
            if item.filename.startswith("word/") and item.filename.endswith(".xml"):
                text = data.decode("utf-8")
                for old, new in replacements.items():
                    text = text.replace(old, new)
                data = text.encode("utf-8")
            target_zip.writestr(item, data)
    temporary.replace(path)


def iter_blocks(document):
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
            raw = html.escape(cell.text).replace("\n", "<br>")
            cell_lines = []
            for line in raw.split("<br>"):
                cell_lines.append(f"<strong>{line}</strong>" if line.startswith("TB EXECUTION ") else line)
            if "signature" in cell.text.lower() or "printed name" in cell.text.lower():
                signature = True
            cells.append(f"<td>{'<br>'.join(cell_lines)}</td>")
        rows.append("<tr>" + "".join(cells) + "</tr>")
    cls = "signature-table" if signature else "data-table"
    return f'<table class="{cls}"><tbody>{"".join(rows)}</tbody></table>'


def render_document(source: Path) -> str:
    document = docx.Document(str(source))
    cover = []
    body = []
    paragraph_index = 0
    execution_seen = False
    for block in iter_blocks(document):
        if isinstance(block, Table):
            body.append(render_table(block))
            continue
        text = block.text.strip()
        if not text:
            continue
        paragraph_index += 1
        style = (block.style.name or "").lower()
        if paragraph_index <= 4:
            cover.append(text)
            continue
        if text.lower() == "execution and signature record" and not execution_seen:
            execution_seen = True
            body.append('<div style="page-break-before: always"></div>')
            body.append(f"<h1>{inline_runs(block)}</h1>")
            body.append('<p class="execution-note">The DocuSign tabs are anchored only to the unique execution line in each signer’s block. Complete only the fields assigned to your capacity. A completed envelope is not a regulatory approval or a listing approval.</p>')
            continue
        if style.startswith("heading 1"):
            body.append(f"<h1>{inline_runs(block)}</h1>")
        elif style.startswith("heading 2") or style == "title":
            body.append(f"<h2>{inline_runs(block)}</h2>")
        elif "____" in text:
            body.append(f'<p class="sig-line">{inline_runs(block)}</p>')
        else:
            body.append(f"<p>{inline_runs(block)}</p>")

    cover_html = []
    labels = ["org", "governance", "title", "document-ref"]
    for index, text in enumerate(cover):
        cover_html.append(f'<div class="{labels[index]}">{html.escape(text)}</div>')

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
  .execution-note {{ font-family: Arial, sans-serif; font-size: 8.5pt; color: #5b5140; margin-bottom: 14px; }}
  .sig-line {{ margin-top: 15px; padding: 8px 0; border-top: 1px solid #bbb; text-align: left; font-family: Arial, sans-serif; font-size: 9pt; }}
  table {{ width: 100%; border-collapse: collapse; margin: 10px 0 16px; page-break-inside: auto; }}
  tr {{ page-break-inside: avoid; page-break-after: auto; }}
  th, td {{ border: 1px solid #aaa; padding: 5px 6px; vertical-align: top; text-align: left; font-size: 8.4pt; line-height: 1.35; }}
  th {{ background: #f0ede3; font-family: Arial, sans-serif; font-weight: 700; }}
  .signature-table {{ page-break-inside: avoid; page-break-before: avoid; }}
  .signature-table td {{ height: auto; min-height: 142px; vertical-align: top; }}
  .signature-table td:first-child {{ width: 47%; }}
  .signature-table td:nth-child(2) {{ width: 6%; }}
  .signature-table td:last-child {{ width: 47%; }}
  strong {{ font-weight: 700; }}
  em {{ font-style: italic; }}
</style></head>
<body>
  <div class="cover">{"".join(cover_html)}</div>
  {"".join(body)}
</body></html>"""


def build_pdf(html_path: Path, pdf_path: Path) -> None:
    profile = Path(tempfile.mkdtemp(prefix="tb-stock-doc-chrome-"))
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


def assert_no_net_text(text: str, label: str) -> None:
    if ".net" in text.lower():
        raise RuntimeError(f"Published document contains a .net reference: {label}")


def assert_no_net_docx(path: Path) -> None:
    text = ""
    with zipfile.ZipFile(path) as archive:
        for name in archive.namelist():
            if name.startswith("word/") and name.endswith(".xml"):
                text += archive.read(name).decode("utf-8", errors="ignore")
    assert_no_net_text(text, str(path))


def main() -> None:
    if not CHROME.exists():
        raise SystemExit(f"Missing Chrome: {CHROME}")
    if not DEFAULT_SOURCE.exists():
        raise SystemExit(f"Missing source package: {DEFAULT_SOURCE}")

    pdf_dir = STORAGE / "pdf"
    docx_dir = STORAGE / "docx"
    protected_dir = STORAGE / "docx-protected"
    for folder in (STORAGE, pdf_dir, docx_dir, protected_dir):
        folder.mkdir(parents=True, exist_ok=True)

    documents = []
    for meta in DOCUMENTS:
        source = DEFAULT_SOURCE / meta["source"]
        if not source.exists():
            raise SystemExit(f"Missing source: {source}")
        slug = meta["slug"]
        docx_path = docx_dir / f"{slug}.docx"
        protected_path = protected_dir / f"{slug}.docx"
        pdf_path = pdf_dir / f"{slug}.pdf"

        prepare_docx(source, docx_path, meta)
        shutil.copy2(docx_path, protected_path)
        html_text = render_document(docx_path)
        assert_no_net_text(html_text, f"{slug}.html")
        html_path = pdf_dir / f"{slug}.html"
        html_path.write_text(html_text, encoding="utf-8")
        build_pdf(html_path, pdf_path)
        html_path.unlink(missing_ok=True)
        assert_no_net_docx(docx_path)

        documents.append({
            **{key: meta[key] for key in ("slug", "number", "title", "category", "summary")},
            "subtitle": "TB stock preparation · signature-ready instrument",
            "status": "Draft — signature block open",
            "visibility": "public",
            "classification": "Public draft — signature-ready instrument",
            "version": "October 2026",
            "signatureFields": "Authorized signatory + conditional additional authorized signatory",
            "signatureStatus": "Open — not executed",
            "pdf": f"pdf/{slug}.pdf",
            "docx": f"docx/{slug}.docx",
            "docxProtected": f"docx-protected/{slug}.docx",
            "pdfBytes": pdf_path.stat().st_size,
            "docxBytes": docx_path.stat().st_size,
            "emailSubjectPrefix": "TradingBible TB Stock",
            "signers": [
                {
                    "id": "issuer",
                    "label": f"{PARTY} — {CAPACITY}",
                    "party": PARTY,
                    "capacity": CAPACITY,
                    "required": True,
                    "anchor": execution_anchor(meta["number"]),
                    "tabOffsetsPx": {"signature": 15, "printedName": 46, "title": 76, "date": 106},
                    "fieldAnchors": {
                        "signature": {"anchor": ISSUER_FIELDS["signature"], "xOffset": "0", "yOffset": "0", "width": "190", "height": "24"},
                        "printedName": {"anchor": ISSUER_FIELDS["printedName"], "xOffset": "0", "yOffset": "0", "width": "190", "height": "18"},
                        "title": {"anchor": ISSUER_FIELDS["title"], "xOffset": "0", "yOffset": "0", "width": "190", "height": "18"},
                        "date": {"anchor": ISSUER_FIELDS["date"], "xOffset": "0", "yOffset": "0", "width": "130", "height": "18"},
                    },
                },
                {
                    "id": "additional",
                    "label": f"{OPTIONAL_PARTY} (if required)",
                    "party": OPTIONAL_PARTY,
                    "capacity": OPTIONAL_CAPACITY,
                    "required": False,
                    "anchor": execution_anchor(meta["number"], optional=True),
                    "tabOffsetsPx": {"signature": 15, "printedName": 46, "title": 76, "date": 106},
                    "fieldAnchors": {
                        "signature": {"anchor": OPTIONAL_FIELDS["signature"], "xOffset": "0", "yOffset": "0", "width": "190", "height": "24"},
                        "printedName": {"anchor": OPTIONAL_FIELDS["printedName"], "xOffset": "0", "yOffset": "0", "width": "190", "height": "18"},
                        "title": {"anchor": OPTIONAL_FIELDS["title"], "xOffset": "0", "yOffset": "0", "width": "190", "height": "18"},
                        "date": {"anchor": OPTIONAL_FIELDS["date"], "xOffset": "0", "yOffset": "0", "width": "130", "height": "18"},
                    },
                },
            ],
        })
        print(f"built {slug}")

    manifest = {
        "title": "TradingBible TB stock document library",
        "issuer": "TradingBible LLC",
        "proposedIssuer": "TradingBible, Inc.",
        "ticker": "TB",
        "tickerStatus": "Proposed — not reserved or approved",
        "jurisdiction": "Delaware, United States",
        "updated": "October 2026",
        "notice": "TB is a proposed future ticker. These signature-ready preparation instruments are not an offer, solicitation, listing application, regulatory approval, or evidence that TB is publicly traded. DocuSign execution is recorded separately; no signature is fabricated.",
        "documents": documents,
    }
    (STORAGE / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {STORAGE / 'manifest.json'} ({len(documents)} documents)")


if __name__ == "__main__":
    main()
