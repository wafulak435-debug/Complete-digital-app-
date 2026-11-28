import { jsPDF } from "jspdf";

function escapeHtml(raw: string): string {
  return String(raw || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function triggerBlobDownload(blob: Blob, filename: string): void {
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);
}

/**
 * Downloads formatted text content as a clean PDF document.
 */
export function exportPDF(title: string, content: string) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const maxLineWidth = pageWidth - margin * 2;

  // Header Banner
  doc.setFillColor(11, 37, 77); // Deep Navy #0B254D
  doc.rect(0, 0, pageWidth, 25, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("ZION DIGITAL ACADEMIC LEDGER", margin, 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Official Course Publication - Verified Tutor Document", margin, 18);

  // Document Title
  let currentY = 35;
  doc.setTextColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);

  const titleLines = doc.splitTextToSize(title || "Untitled Document", maxLineWidth);
  doc.text(titleLines, margin, currentY);
  currentY += titleLines.length * 8 + 4;

  // Divider
  doc.setDrawColor(21, 94, 239);
  doc.setLineWidth(0.5);
  doc.line(margin, currentY, pageWidth - margin, currentY);
  currentY += 8;

  // Document Content
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(51, 65, 85);

  const paragraphs = (content || "No text provided.").split("\n");

  paragraphs.forEach((paragraph) => {
    if (!paragraph.trim()) {
      currentY += 4;
      return;
    }

    const lines = doc.splitTextToSize(paragraph, maxLineWidth);

    if (currentY + lines.length * 6 > pageHeight - margin) {
      doc.addPage();
      currentY = margin + 10;

      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`${title} - Continued`, margin, margin);
      doc.setFontSize(11);
      doc.setTextColor(51, 65, 85);
    }

    doc.text(lines, margin, currentY);
    currentY += lines.length * 6 + 3;
  });

  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${i} of ${pageCount} - Zion Digital School`, pageWidth / 2, pageHeight - 8, { align: "center" });
  }

  const safeFilename = (title || "document").toLowerCase().replace(/[^a-z0-9]/g, "_") + ".pdf";
  doc.save(safeFilename);
}

/**
 * Downloads formatted text as a Word document (.docx) compatible file.
 */
export function exportWordDoc(title: string, content: string) {
  const safeTitle = escapeHtml(title || "Zion_Document");
  const formattedText = (content || "No text provided.")
    .split("\n")
    .map((line) => `<p style="font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.5; color: #1e293b; margin-bottom: 8pt;">${escapeHtml(line) || "&nbsp;"}</p>`)
    .join("");

  const wordDocumentHTML = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>${safeTitle}</title>
      <style>
        body { font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; margin: 1in; padding: 0; }
        h1 { color: #0b254d; font-size: 22pt; margin-bottom: 12pt; border-bottom: 2px solid #155eef; padding-bottom: 6pt; }
        .header-meta { font-size: 9pt; color: #64748b; margin-bottom: 18pt; text-transform: uppercase; font-weight: bold; }
        .footer { margin-top: 30pt; font-size: 9pt; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 8pt; text-align: center; }
      </style>
    </head>
    <body>
      <div class="header-meta">ZION DIGITAL SCHOOL - OFFICIAL COURSE NOTES</div>
      <h1>${safeTitle}</h1>
      <div class="content">${formattedText}</div>
      <div class="footer">Published via Zion Digital Tutor Publisher</div>
    </body>
    </html>
  `;

  const blob = new Blob(["\ufeff" + wordDocumentHTML], {
    type: "application/msword;charset=utf-8",
  });

  const safeFilename = (title || "document").toLowerCase().replace(/[^a-z0-9]/g, "_") + ".docx";
  triggerBlobDownload(blob, safeFilename);
}

/**
 * Downloads formatted text as a self-contained multi-slide HTML presentation deck (.html).
 */
export function exportSlidesDeck(title: string, content: string) {
  const safeTitle = title || "Course Presentation";
  const rawLines = (content || "").split("\n");
  const slides: { heading: string; bullets: string[] }[] = [];

  let currentSlide: { heading: string; bullets: string[] } = {
    heading: safeTitle,
    bullets: [],
  };

  for (const rawLine of rawLines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;
    const isHeading = /^#{1,4}\s+/.test(trimmed) || (/^[A-Z0-9\s:-]{6,60}$/.test(trimmed) && !trimmed.includes("."));
    if (isHeading) {
      if (currentSlide.bullets.length > 0 || slides.length === 0) {
        if (currentSlide.bullets.length > 0) slides.push(currentSlide);
      }
      currentSlide = {
        heading: trimmed.replace(/^#{1,4}\s+/, ""),
        bullets: [],
      };
    } else {
      const cleaned = trimmed.replace(/^[-*•]\s+/, "");
      currentSlide.bullets.push(cleaned);
      if (currentSlide.bullets.length >= 6) {
        slides.push(currentSlide);
        currentSlide = {
          heading: `${currentSlide.heading} (Continued)`,
          bullets: [],
        };
      }
    }
  }
  if (currentSlide.bullets.length > 0 || slides.length === 0) {
    slides.push(currentSlide);
  }

  const slidesHtml = slides
    .map(
      (s, idx) => `
      <section class="slide ${idx === 0 ? "active" : ""}" data-index="${idx}">
        <div class="slide-header">
          <span class="badge">Slide ${idx + 1} of ${slides.length}</span>
          <span class="brand">Zion Digital School</span>
        </div>
        <h2>${escapeHtml(s.heading)}</h2>
        <ul>
          ${
            s.bullets.length > 0
              ? s.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("")
              : `<li>Key study summary for ${escapeHtml(safeTitle)}</li>`
          }
        </ul>
      </section>`
    )
    .join("\n");

  const deckHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(safeTitle)} - Slides</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: #0b254d; color: #0f172a; display: flex; flex-direction: column; min-height: 100vh; }
    main { flex: 1; display: flex; align-items: center; justify-content: center; padding: 24px; }
    .slide { display: none; width: 100%; max-width: 920px; min-height: 480px; background: #ffffff; border-radius: 20px; padding: 40px; box-shadow: 0 24px 60px rgba(0,0,0,0.35); border-top: 8px solid #f5b82e; }
    .slide.active { display: flex; flex-direction: column; justify-content: flex-start; }
    .slide-header { display: flex; justify-content: space-between; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #155eef; margin-bottom: 20px; }
    .brand { color: #64748b; }
    h2 { margin: 0 0 24px 0; font-size: 28px; color: #0b254d; line-height: 1.25; }
    ul { margin: 0; padding-left: 22px; display: grid; gap: 14px; font-size: 18px; line-height: 1.5; color: #334155; }
    footer { padding: 16px 24px; display: flex; justify-content: center; gap: 12px; background: rgba(0,0,0,0.2); }
    button { background: #f5b82e; color: #0b254d; border: 0; padding: 10px 20px; border-radius: 10px; font-weight: 700; cursor: pointer; font-size: 14px; }
    button:hover { background: #e5a91e; }
    @media print {
      body { background: #fff; }
      footer { display: none; }
      .slide { display: flex !important; page-break-after: always; box-shadow: none; border: 1px solid #cbd5e1; margin-bottom: 20px; }
    }
  </style>
</head>
<body>
  <main>${slidesHtml}</main>
  <footer>
    <button type="button" onclick="step(-1)">Previous Slide</button>
    <button type="button" onclick="step(1)">Next Slide</button>
    <button type="button" onclick="window.print()">Print / Save PDF</button>
  </footer>
  <script>
    let cur = 0;
    const slides = Array.from(document.querySelectorAll('.slide'));
    function show(i) {
      cur = Math.max(0, Math.min(slides.length - 1, i));
      slides.forEach((s, idx) => s.classList.toggle('active', idx === cur));
    }
    function step(d) { show(cur + d); }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    });
  </script>
</body>
</html>`;

  const blob = new Blob([deckHtml], { type: "text/html;charset=utf-8" });
  const safeFilename = safeTitle.toLowerCase().replace(/[^a-z0-9]/g, "_") + "_slides.html";
  triggerBlobDownload(blob, safeFilename);
}

/**
 * Downloads structured lecture notes or tabular rows as a UTF-8 CSV spreadsheet (.csv)
 * compatible with Excel, LibreOffice Calc, and Google Sheets.
 */
export function exportSheetCsv(title: string, content: string) {
  const safeTitle = title || "Course_Sheet";
  const csvEscape = (val: string) => `"${String(val || "").replace(/"/g, '""')}"`;

  const rows: string[][] = [["Section", "Topic / Point", "Details"]];
  let currentSection = safeTitle;

  const lines = (content || "").split("\n");
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Parse markdown table row if present
    if (line.startsWith("|") && line.endsWith("|")) {
      const cells = line
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim());
      if (cells.every((c) => /^[-:]+$/.test(c))) continue;
      rows.push([
        currentSection,
        cells[0] || "",
        cells.slice(1).join(" | "),
      ]);
      continue;
    }

    if (/^#{1,4}\s+/.test(line)) {
      currentSection = line.replace(/^#{1,4}\s+/, "");
      continue;
    }

    const cleaned = line.replace(/^[-*•\d+.)]+\s*/, "");
    const colonIdx = cleaned.indexOf(":");
    if (colonIdx > 1 && colonIdx < 60) {
      rows.push([
        currentSection,
        cleaned.slice(0, colonIdx).trim(),
        cleaned.slice(colonIdx + 1).trim(),
      ]);
    } else {
      rows.push([currentSection, "Note", cleaned]);
    }
  }

  const csvBody = rows.map((r) => r.map(csvEscape).join(",")).join("\r\n");
  const blob = new Blob(["\ufeff" + csvBody], { type: "text/csv;charset=utf-8" });
  const safeFilename = safeTitle.toLowerCase().replace(/[^a-z0-9]/g, "_") + "_sheet.csv";
  triggerBlobDownload(blob, safeFilename);
}
