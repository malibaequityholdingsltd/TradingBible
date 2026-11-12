#!/usr/bin/env python3
"""Build the TradingBible workforce document pack.

Source: docs/hr/*.md
Outputs:
  apps/api/storage/hr-documents/md/*.md
  apps/api/storage/hr-documents/docx/*.docx
  apps/api/storage/hr-documents/pdf/*.pdf
  apps/api/storage/hr-documents/manifest.json

Every document is issued as a controlled template. The pack is not evidence
that counsel, a board, an insurer, a payroll provider or a regulator has
approved a document. Adoption is recorded separately in the workforce register.
"""

from __future__ import annotations

import base64
import html
import json
import re
import shutil
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import docx
from PIL import Image
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "hr"
STORAGE = ROOT / "apps/api/storage/hr-documents"
CHROME = Path("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
LOGO = ROOT / "apps/web/public/logos/tradingbible-logo.png"
LOGO_SMALL = STORAGE / "_assets" / "tradingbible-logo-256.png"

GOLD = RGBColor(0x9A, 0x7A, 0x1E)
INK = RGBColor(0x1A, 0x1A, 0x1A)
MUTED = RGBColor(0x5B, 0x55, 0x45)
PALE = "F3EFE3"
INLINE_RE = re.compile(r"(\*\*.+?\*\*|\*.+?\*|`.+?`)")

VERSION = "1.0"
ISSUED = "12 November 2026"
BOUNDARY = (
    "CONTROLLED TEMPLATE · COUNSEL REVIEW AND LOCAL ADOPTION REQUIRED. This document is a "
    "company policy or contract framework, not an executed agreement, a legal opinion, a "
    "regulatory approval, a payroll filing, an insurance policy or a promise of a benefit. "
    "Record adoption and approval references in the Workforce Compliance Register before "
    "treating it as operative."
)

DOCUMENT_META = {
    "00-EMPLOYER-COMPLIANCE-MANUAL": ("employer-manual", "Employer Compliance Manual"),
    "01-EMPLOYEE-HANDBOOK": ("handbook", "Employee Handbook"),
    "02-EMPLOYMENT-CONTRACT-US": ("us-contract", "US Employment Contract Template"),
    "03-EMPLOYMENT-CONTRACT-NIGERIA": ("ng-contract", "Nigeria Employment Contract Template"),
    "04-NDA-IP-ASSIGNMENT": ("nda-ip", "Confidentiality and IP Assignment Pack"),
    "05-ACCEPTABLE-USE-AND-SECURITY": ("security", "Acceptable Use and Information Security Policy"),
    "06-ONBOARDING-PACK": ("onboarding", "Onboarding Pack"),
    "07-OFFBOARDING-PACK": ("offboarding", "Offboarding and Access-Revocation Pack"),
    "08-PAYROLL-AND-BENEFITS-FRAMEWORK": ("payroll-benefits", "Payroll and Benefits Framework"),
    "09-JOB-DESCRIPTION-PACK": ("job-descriptions", "Job Description Pack"),
    "10-JURISDICTION-GUIDE-US-NIGERIA": ("jurisdictions", "US and Nigeria Jurisdiction Guide"),
    "11-EMPLOYEE-FILE-CHECKLIST": ("employee-file", "Employee File Checklist"),
}


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


def parse_markdown(text: str) -> list[dict[str, Any]]:
    text = text.replace("- [ ] ", "- ☐ ").replace("- [x] ", "- ☑ ")
    blocks: list[dict[str, Any]] = []
    lines = text.splitlines()
    index = 0
    paragraph: list[str] = []

    def flush() -> None:
        nonlocal paragraph
        if paragraph:
            blocks.append({"type": "paragraph", "text": " ".join(p.strip() for p in paragraph).strip()})
            paragraph = []

    while index < len(lines):
        line = lines[index]
        stripped = line.strip()
        if not stripped:
            flush()
            index += 1
            continue
        if stripped in {"<!-- pagebreak -->", "<!-- PAGEBREAK -->"}:
            flush()
            blocks.append({"type": "pagebreak"})
            index += 1
            continue
        if stripped.startswith("#"):
            flush()
            level = len(stripped) - len(stripped.lstrip("#"))
            blocks.append({"type": "heading", "level": min(level, 4), "text": stripped[level:].strip()})
            index += 1
            continue
        if stripped.startswith("> "):
            flush()
            quote: list[str] = []
            while index < len(lines) and lines[index].strip().startswith("> "):
                quote.append(lines[index].strip()[2:].strip())
                index += 1
            blocks.append({"type": "callout", "text": " ".join(quote)})
            continue
        if stripped.startswith("|") and "|" in stripped[1:]:
            flush()
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
            flush()
            items: list[str] = []
            while index < len(lines) and re.match(r"^[-*]\s+", lines[index].strip()):
                items.append(re.sub(r"^[-*]\s+", "", lines[index].strip()))
                index += 1
            blocks.append({"type": "bullets", "items": items})
            continue
        if re.match(r"^\d+\.\s+", stripped):
            flush()
            items = []
            while index < len(lines) and re.match(r"^\d+\.\s+", lines[index].strip()):
                items.append(re.sub(r"^\d+\.\s+", "", lines[index].strip()))
                index += 1
            blocks.append({"type": "numbers", "items": items})
            continue
        paragraph.append(stripped)
        index += 1
    flush()
    return blocks


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


def spacing(paragraph, before=0, after=6, line=1.18) -> None:
    paragraph.paragraph_format.space_before = Pt(before)
    paragraph.paragraph_format.space_after = Pt(after)
    paragraph.paragraph_format.line_spacing = line


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


def add_page_field(paragraph) -> None:
    run = paragraph.add_run()
    fld = OxmlElement("w:fldSimple")
    fld.set(qn("w:instr"), "PAGE")
    run._r.addnext(fld)


def add_header_footer(document) -> None:
    section = document.sections[0]
    section.different_first_page_header_footer = True
    for first_page_part in (section.first_page_header, section.first_page_footer):
        first_page_part.is_linked_to_previous = False
        for p in first_page_part.paragraphs:
            p.clear()
    header = section.header
    paragraph = header.paragraphs[0]
    paragraph.alignment = WD_ALIGN_PARAGRAPH.LEFT
    if LOGO_SMALL.exists():
        run = paragraph.add_run()
        run.add_picture(str(LOGO_SMALL), width=Inches(0.38))
    run = paragraph.add_run("  TRADINGBIBLE HOLDINGS, INC.   ·   CONTROLLED TEMPLATE")
    run.font.name = "Arial"
    run.bold = True
    run.font.size = Pt(7.5)
    run.font.color.rgb = GOLD
    add_bottom_border(paragraph, "D9C98A", "4")
    footer = section.footer
    footer_paragraph = footer.paragraphs[0]
    footer_paragraph.alignment = WD_ALIGN_PARAGRAPH.LEFT
    run = footer_paragraph.add_run("COUNSEL REVIEW REQUIRED   ·   tradingbible.app   ·   ")
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


def add_cover(document, title: str, doc_id: str) -> None:
    paragraph = document.add_paragraph()
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    paragraph.paragraph_format.space_before = Pt(24)
    if LOGO_SMALL.exists():
        paragraph.add_run().add_picture(str(LOGO_SMALL), width=Inches(0.9))
    paragraph = document.add_paragraph()
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = paragraph.add_run("TRADINGBIBLE HOLDINGS, INC.")
    run.font.name = "Arial"
    run.bold = True
    run.font.size = Pt(11)
    run.font.color.rgb = GOLD
    spacing(paragraph, before=12, after=2)
    paragraph = document.add_paragraph()
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = paragraph.add_run("CONTROLLED TEMPLATE · COUNSEL REVIEW REQUIRED")
    run.font.name = "Arial"
    run.bold = True
    run.font.size = Pt(8)
    run.font.color.rgb = MUTED
    spacing(paragraph, before=0, after=24)
    paragraph = document.add_paragraph()
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = paragraph.add_run(title)
    run.font.name = "Arial"
    run.bold = True
    run.font.size = Pt(22)
    run.font.color.rgb = INK
    spacing(paragraph, before=8, after=10)
    paragraph = document.add_paragraph()
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = paragraph.add_run(f"{doc_id.upper()}   ·   VERSION {VERSION}   ·   {ISSUED.upper()}")
    run.font.name = "Arial"
    run.font.size = Pt(8)
    run.font.color.rgb = MUTED
    spacing(paragraph, before=0, after=22)
    table = document.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = table.cell(0, 0)
    shade(cell, PALE)
    set_cell_margins(cell, top=140, start=160, bottom=140, end=160)
    p = cell.paragraphs[0]
    spacing(p, before=2, after=2, line=1.2)
    add_inline_runs(p, BOUNDARY, size=8.5, color=MUTED)
    document.add_paragraph()


def add_heading(document, text: str, level: int) -> None:
    paragraph = document.add_paragraph()
    if level <= 2:
        paragraph.paragraph_format.page_break_before = level == 1 and len(document.paragraphs) > 10
    run = paragraph.add_run(text)
    run.font.name = "Arial"
    run.bold = True
    run.font.color.rgb = GOLD if level <= 2 else INK
    run.font.size = Pt({1: 13, 2: 12, 3: 10.5, 4: 10}[level])
    spacing(paragraph, before=14 if level <= 2 else 9, after=5, line=1.1)
    if level == 1:
        add_bottom_border(paragraph, "D9C98A", "4")


def add_callout(document, text: str) -> None:
    table = document.add_table(rows=1, cols=1)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    cell = table.cell(0, 0)
    shade(cell, PALE)
    set_cell_margins(cell)
    paragraph = cell.paragraphs[0]
    spacing(paragraph, before=2, after=2, line=1.15)
    add_inline_runs(paragraph, text, size=9.5, color=MUTED)
    if paragraph.runs:
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
        spacing(paragraph, before=1, after=1, line=1.05)
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
            spacing(paragraph, before=1, after=1, line=1.08)
            add_inline_runs(paragraph, value, size=8.5)
    document.add_paragraph()


def add_bullets(document, items: list[str], numbered: bool = False) -> None:
    for item in items:
        paragraph = document.add_paragraph(style="List Number" if numbered else "List Bullet")
        spacing(paragraph, before=0, after=3, line=1.15)
        add_inline_runs(paragraph, item, size=10)


def build_docx(title: str, doc_id: str, blocks: list[dict[str, Any]], path: Path) -> None:
    document = docx.Document()
    configure_docx(document)
    add_header_footer(document)
    add_cover(document, title, doc_id)
    for block in blocks:
        kind = block["type"]
        if kind == "heading":
            add_heading(document, block["text"], block["level"])
        elif kind == "paragraph":
            paragraph = document.add_paragraph()
            spacing(paragraph, before=0, after=6)
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
            document.add_paragraph().add_run().add_break(WD_BREAK.PAGE)
    document.save(str(path))


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


def build_html(title: str, doc_id: str, blocks: list[dict[str, Any]]) -> str:
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
    return f"""<!doctype html>
<html><head><meta charset="utf-8"><title>{html.escape(title)}</title>
<style>
  @page {{
    size: Letter;
    margin: 30mm 16mm 26mm;
    @top-left {{ content: ""; }}
    @top-center {{ content: "TRADINGBIBLE HOLDINGS, INC. · CONTROLLED TEMPLATE"; color: #7c621c; font-family: Arial, sans-serif; font-size: 6.8pt; letter-spacing: .04em; }}
    @top-right {{ content: "{html.escape(doc_id.upper())}"; color: #9a7a1e; font-family: Arial, sans-serif; font-size: 6.8pt; font-weight: 700; }}
    @bottom-left {{ content: "COUNSEL REVIEW REQUIRED"; color: #6a665a; font-family: Arial, sans-serif; font-size: 6pt; }}
    @bottom-center {{ content: "tradingbible.app · legal@tradingbible.app"; color: #6a665a; font-family: Arial, sans-serif; font-size: 6pt; }}
    @bottom-right {{ content: "Page " counter(page) " of " counter(pages); color: #6a665a; font-family: Arial, sans-serif; font-size: 6pt; }}
  }}
  @page :first {{
    margin-top: 18mm; margin-bottom: 20mm;
    @top-left {{ content: none; }} @top-center {{ content: none; }} @top-right {{ content: none; }}
    @bottom-left {{ content: none; }} @bottom-center {{ content: none; }} @bottom-right {{ content: none; }}
  }}
  * {{ box-sizing: border-box; }}
  html, body {{ margin: 0; padding: 0; }}
  body {{ color: #1a1a1a; font-family: Georgia, "Times New Roman", serif; font-size: 10pt; line-height: 1.42; }}
  .cover {{ text-align: center; page-break-after: always; }}
  .cover img {{ width: 22mm; height: 22mm; object-fit: contain; }}
  .org {{ margin-top: 5mm; font-family: Arial, sans-serif; font-size: 11pt; font-weight: 800; letter-spacing: .12em; color: #9a7a1e; }}
  .kicker {{ margin-top: 3mm; font-family: Arial, sans-serif; font-size: 8pt; font-weight: 700; letter-spacing: .16em; color: #6a665a; }}
  h1.title {{ margin: 10mm auto 4mm; max-width: 165mm; font-family: Arial, sans-serif; font-size: 23pt; line-height: 1.1; letter-spacing: -.02em; color: #171717; }}
  .ref {{ font-family: Arial, sans-serif; font-size: 8pt; color: #6a665a; letter-spacing: .04em; }}
  .status-box {{ margin: 12mm auto 0; max-width: 150mm; border: 1px solid #d9c98a; background: #f7f3e7; padding: 6mm; text-align: left; }}
  .status-box p {{ font-size: 8.5pt; color: #5b5545; margin: 0; text-align: left; }}
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
  .page-break {{ page-break-before: always; height: 0; }}
</style></head><body>
  <section class="cover">
    <img src="data:image/png;base64,{logo_data}" alt="TradingBible logo" />
    <div class="org">TRADINGBIBLE HOLDINGS, INC.</div>
    <div class="kicker">CONTROLLED TEMPLATE · COUNSEL REVIEW REQUIRED</div>
    <h1 class="title">{html.escape(title)}</h1>
    <div class="ref">{html.escape(doc_id.upper())} &nbsp;·&nbsp; VERSION {VERSION} &nbsp;·&nbsp; {ISSUED.upper()}</div>
    <div class="status-box"><p>{html.escape(BOUNDARY)}</p></div>
  </section>
  {''.join(body)}
</body></html>"""


def build_pdf(html_path: Path, pdf_path: Path) -> None:
    profile = Path(tempfile.mkdtemp(prefix="tb-workforce-chrome-"))
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
    if not CHROME.exists():
        raise SystemExit(f"Missing Chrome: {CHROME}")
    if not SOURCE.exists():
        raise SystemExit(f"Missing source folder: {SOURCE}")

    md_dir = STORAGE / "md"
    docx_dir = STORAGE / "docx"
    pdf_dir = STORAGE / "pdf"
    for folder in (STORAGE, md_dir, docx_dir, pdf_dir, LOGO_SMALL.parent):
        folder.mkdir(parents=True, exist_ok=True)
    if LOGO.exists():
        image = Image.open(LOGO).convert("RGBA")
        image.thumbnail((256, 256), Image.LANCZOS)
        image.save(LOGO_SMALL, optimize=True)

    documents: list[dict[str, Any]] = []
    source_files = sorted(SOURCE.glob("*.md"))
    if not source_files:
        raise SystemExit(f"No Markdown documents in {SOURCE}")

    for source in source_files:
        stem = source.stem
        if stem not in DOCUMENT_META:
            continue
        doc_id, title = DOCUMENT_META[stem]
        blocks = parse_markdown(source.read_text(encoding="utf-8"))
        md_path = md_dir / f"{stem}.md"
        docx_path = docx_dir / f"{stem}.docx"
        pdf_path = pdf_dir / f"{stem}.pdf"
        shutil.copy2(source, md_path)
        build_docx(title, doc_id, blocks, docx_path)
        html_text = build_html(title, doc_id, blocks)
        html_path = STORAGE / f".{stem}.html"
        html_path.write_text(html_text, encoding="utf-8")
        build_pdf(html_path, pdf_path)
        html_path.unlink(missing_ok=True)
        documents.append({
            "id": doc_id,
            "title": title,
            "file": source.name,
            "md": f"md/{md_path.name}",
            "docx": f"docx/{docx_path.name}",
            "pdf": f"pdf/{pdf_path.name}",
            "docxBytes": docx_path.stat().st_size,
            "pdfBytes": pdf_path.stat().st_size,
        })

    manifest = {
        "version": VERSION,
        "issued": ISSUED,
        "builtAt": datetime.now(timezone.utc).isoformat(),
        "boundary": BOUNDARY,
        "documents": documents,
    }
    (STORAGE / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(f"Built {len(documents)} workforce documents into {STORAGE}")


if __name__ == "__main__":
    main()
