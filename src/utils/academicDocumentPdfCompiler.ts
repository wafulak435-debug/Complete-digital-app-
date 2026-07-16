import { jsPDF } from "jspdf";

export interface DocumentCompilerOptions {
  title: string;
  subtitle: string;
  author: string;
  layoutType: "Academic Textbook" | "Business Proposal Blueprint" | "Theological Journal" | "Strategic Policy Document" | "Wonderful Book Cover (Front & Back)" | "Professional Magazine (Multi-Column Layout)";
  themeName: "regal" | "royal" | "divine" | "corporate";
  chaptersCount: number;
  preserveMeaning: boolean;
  contentSeed: string;
}

export function compileAcademicDocumentPdf(options: DocumentCompilerOptions): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const w = 210; // A4 width
  const h = 297; // A4 height

  // Define Themes
  const themes = {
    regal: {
      primary: { r: 120, g: 20, b: 20 },   // Rich Maroon
      secondary: { r: 197, g: 160, b: 89 }, // Antique Gold Accent
      bg: { r: 254, g: 253, b: 249 }        // Parchment white
    },
    royal: {
      primary: { r: 15, g: 32, b: 67 },    // Indigo Navy
      secondary: { r: 79, g: 141, b: 181 },  // Steel Blue
      bg: { r: 250, g: 251, b: 254 }        // Ice white
    },
    divine: {
      primary: { r: 20, g: 82, b: 51 },     // Forest green
      secondary: { r: 212, g: 175, b: 55 }, // Bright gold
      bg: { r: 255, g: 255, b: 250 }        // Warm cream
    },
    corporate: {
      primary: { r: 30, g: 41, b: 59 },     // Charcoal Gray
      secondary: { r: 100, g: 116, b: 139 },// Slate Accent
      bg: { r: 248, g: 250, b: 252 }        // Light slate
    }
  };

  const selectedTheme = themes[options.themeName] || themes.regal;

  // Set initial document properties
  doc.setProperties({
    title: options.title,
    author: options.author,
    subject: options.layoutType,
    keywords: "zion digital academy, academic publishing, book studio, proposal planner"
  });

  // HELPER Functions
  const applyThemeBackground = () => {
    doc.setFillColor(selectedTheme.bg.r, selectedTheme.bg.g, selectedTheme.bg.b);
    doc.rect(0, 0, w, h, "F");
  };

  const drawDoubleBorders = () => {
    doc.setDrawColor(selectedTheme.primary.r, selectedTheme.primary.g, selectedTheme.primary.b);
    doc.setLineWidth(0.8);
    doc.rect(8, 8, w - 16, h - 16); // Outer border
    
    doc.setDrawColor(selectedTheme.secondary.r, selectedTheme.secondary.g, selectedTheme.secondary.b);
    doc.setLineWidth(0.3);
    doc.rect(10, 10, w - 20, h - 20); // Inner border
  };

  const drawHeaderFooter = (pageNumber: number, totalPages: number) => {
    // Top Running Header
    doc.setDrawColor(selectedTheme.secondary.r, selectedTheme.secondary.g, selectedTheme.secondary.b);
    doc.setLineWidth(0.2);
    doc.line(12, 16, w - 12, 16);

    doc.setTextColor(selectedTheme.secondary.r, selectedTheme.secondary.g, selectedTheme.secondary.b);
    doc.setFont("times", "normal");
    doc.setFontSize(7.5);
    doc.text(options.title.toUpperCase(), 12, 14);
    doc.text(options.layoutType.toUpperCase(), w - 12, 14, { align: "right" });

    // Bottom Running Footer
    doc.line(12, h - 16, w - 12, h - 16);
    
    doc.setTextColor(120, 120, 120);
    doc.setFontSize(8);
    const publisherTag = "PUBLISHED BY ZION DIGITAL ACADEMIC COMPILER CORE (BUNGOMA)";
    doc.text(publisherTag, 12, h - 12);
    doc.text(`Page ${pageNumber} of ${totalPages}`, w - 12, h - 12, { align: "right" });
  };

  const addTOCDots = (xStart: number, xEnd: number, y: number) => {
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.15);
    let currentX = xStart;
    while (currentX < xEnd) {
      doc.line(currentX, y, currentX + 0.6, y);
      currentX += 2.0;
    }
  };

  // --- PAGE 1: ELEGANT TITLE COVER PAGE ---
  // --- PAGE 1: ELEGANT TITLE COVER PAGE ---
  const drawCornerFiligree = (cx: number, cy: number, dx: number, dy: number) => {
    doc.setDrawColor(selectedTheme.secondary.r, selectedTheme.secondary.g, selectedTheme.secondary.b);
    doc.setLineWidth(0.6);
    doc.line(cx, cy, cx + dx * 12, cy);
    doc.line(cx, cy, cx, cy + dy * 12);
    doc.line(cx + dx * 2, cy + dy * 2, cx + dx * 8, cy + dy * 2);
    doc.line(cx + dx * 2, cy + dy * 2, cx + dx * 2, cy + dy * 8);
  };

  // Check if Book Cover layout is selected
  if (options.layoutType === "Wonderful Book Cover (Front & Back)") {
    // --- FRONT COVER ---
    applyThemeBackground();
    drawDoubleBorders();
    drawCornerFiligree(12, 12, 1, 1);
    drawCornerFiligree(w - 12, 12, -1, 1);
    drawCornerFiligree(12, h - 12, 1, -1);
    drawCornerFiligree(w - 12, h - 12, -1, -1);

    // Crest Text
    doc.setTextColor(selectedTheme.primary.r, selectedTheme.primary.g, selectedTheme.primary.b);
    doc.setFont("times", "bold");
    doc.setFontSize(11);
    doc.text("ZION DIGITAL PUBLISHING PRESS - BUNGOMA", w / 2, 40, { align: "center" });
    
    doc.setTextColor(100, 100, 100);
    doc.setFont("courier", "bold");
    doc.setFontSize(8);
    doc.text("DELUXE WONDERFUL FRONT COVER EDITION", w / 2, 45, { align: "center" });

    doc.setDrawColor(selectedTheme.secondary.r, selectedTheme.secondary.g, selectedTheme.secondary.b);
    doc.line(w / 2 - 30, 48, w / 2 + 30, 48);

    // Title Block
    doc.setTextColor(30, 30, 30);
    doc.setFont("times", "bold");
    doc.setFontSize(26);
    const splitTitleCover = doc.splitTextToSize(options.title || "The Unnamed Manuscript", w - 50);
    doc.text(splitTitleCover, w / 2, 110, { align: "center" });

    // Subtitle
    doc.setTextColor(80, 80, 80);
    doc.setFont("times", "italic");
    doc.setFontSize(13);
    const splitSubCover = doc.splitTextToSize(options.subtitle || "A divine handbook of structural administration and servant leadership", w - 60);
    doc.text(splitSubCover, w / 2, 115 + (splitTitleCover.length * 9), { align: "center" });

    // Golden Seal
    const scy = 190;
    doc.circle(w / 2, scy, 18, "S");
    doc.circle(w / 2, scy, 16, "S");
    doc.setFont("times", "bold");
    doc.setFontSize(6.5);
    doc.text("WONDERFUL", w / 2, scy - 3, { align: "center" });
    doc.text("BOOK COVER", w / 2, scy + 3, { align: "center" });
    doc.setFont("courier", "bold");
    doc.text("BUNGOMA WEST DISTRICT", w / 2, scy + 7, { align: "center" });

    // Author
    doc.setTextColor(selectedTheme.primary.r, selectedTheme.primary.g, selectedTheme.primary.b);
    doc.setFont("times", "bold");
    doc.setFontSize(12);
    doc.text(`BY MASTER SCHOLAR: ${options.author.toUpperCase()}`, w / 2, 235, { align: "center" });

    doc.setTextColor(120, 120, 120);
    doc.setFont("times", "normal");
    doc.setFontSize(9);
    doc.text(`ZION CLASSIC SERIES • PRINT-READY PRINTED EDITION • KES 1,500.00`, w / 2, 245, { align: "center" });

    // --- BACK COVER ---
    doc.addPage();
    applyThemeBackground();
    drawDoubleBorders();
    drawCornerFiligree(12, 12, 1, 1);
    drawCornerFiligree(w - 12, 12, -1, 1);
    drawCornerFiligree(12, h - 12, 1, -1);
    drawCornerFiligree(w - 12, h - 12, -1, -1);

    // Book Back Title
    doc.setTextColor(selectedTheme.primary.r, selectedTheme.primary.g, selectedTheme.primary.b);
    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.text("SYNOPSIS & READER INSIGHTS (BACK COVER)", w / 2, 40, { align: "center" });
    doc.setDrawColor(selectedTheme.secondary.r, selectedTheme.secondary.g, selectedTheme.secondary.b);
    doc.line(w / 2 - 25, 44, w / 2 + 25, 44);

    // Back Cover Content
    doc.setTextColor(60, 60, 60);
    doc.setFont("times", "normal");
    doc.setFontSize(10);
    // Heading in bold!
    doc.setFont("times", "bold");
    doc.text("ABOUT THE WORK:", 25, 60);
    doc.setFont("times", "normal");

    const mainBackText = options.contentSeed || "This wonderful deluxe edition is a certified regional publication, designed and formulated in Bungoma under the stewardship of the Zion Digital Leadership & Bible School. It is crafted with meticulous attention to detail to guide the reader through advanced organizational systems, strategic regional case studies, and digital capacity frameworks.\n\nProviding elegant guidelines ready to copy, distribute, print, or download, this publication preserves strict academic and covenantal authenticity. May this volume illuminate your path towards strategic leadership and societal transformation.";
    const splitBackText = doc.splitTextToSize(mainBackText, w - 50);
    doc.text(splitBackText, 25, 66);

    // Barcode & ISBN block at bottom
    const bcy = 215;
    doc.setFont("courier", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(30,30,30);
    doc.text("ISBN 978-9966-224-051-2", w / 2, bcy - 5, { align: "center" });

    let blockX = w / 2 - 27;
    for (let c = 0; c < 30; c++) {
      const barW = (c % 3 === 0) ? 0.8 : (c % 2 === 0) ? 0.3 : 0.55;
      doc.setLineWidth(barW);
      doc.line(blockX, bcy, blockX, bcy + 15);
      blockX += 1.8;
    }
    
    doc.setFont("courier", "normal");
    doc.setFontSize(7.5);
    doc.text("ZION DIGITAL PRESS CORE - BUNGOMA", w / 2, bcy + 22, { align: "center" });
    doc.text("KES 1,500.00 / USD 12.00 (COPYABLE & PRINT READY)", w / 2, bcy + 27, { align: "center" });

    // Save
    const safeFilenameCover = options.title.toLowerCase().replace(/[^a-z0-9]+/g, "_") + "_wonderful_covers.pdf";
    doc.save(safeFilenameCover);
    return;
  }

  // Check if Magazine layout is selected
  if (options.layoutType === "Professional Magazine (Multi-Column Layout)") {
    applyThemeBackground();
    
    // Draw thin elegant borders
    doc.setDrawColor(selectedTheme.primary.r, selectedTheme.primary.g, selectedTheme.primary.b);
    doc.setLineWidth(0.5);
    doc.rect(10, 10, w - 20, h - 20);

    // Magazine Masthead
    doc.setDrawColor(selectedTheme.secondary.r, selectedTheme.secondary.g, selectedTheme.secondary.b);
    doc.setLineWidth(1.5);
    doc.line(14, 28, w - 14, 28);
    
    doc.setTextColor(selectedTheme.primary.r, selectedTheme.primary.g, selectedTheme.primary.b);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(30);
    doc.text("ZION EXECUTIVE DISPATCHER", w / 2, 24, { align: "center" });
    
    doc.setTextColor(110, 110, 110);
    doc.setFont("courier", "bold");
    doc.setFontSize(7.5);
    doc.text("VOL. IX ISSUE IV • EAST AFRICA LEADERSHIP CHRONICLE • BUNGOMA, KENYA", w / 2, 32, { align: "center" });

    doc.setLineWidth(0.3);
    doc.line(14, 34, w - 14, 34);

    // Headline Title - headings in bold!
    doc.setTextColor(30, 30, 30);
    doc.setFont("times", "bold");
    doc.setFontSize(22);
    const splitTitleMag = doc.splitTextToSize(options.title || "The Strategic Pivot", w - 40);
    doc.text(splitTitleMag, 20, 50);

    // Subtitle
    doc.setTextColor(120, 20, 20);
    doc.setFont("times", "italic");
    doc.setFontSize(11);
    const splitSubMag = doc.splitTextToSize(`Insight: ${options.subtitle || "Adapting agile governance networks inside Western Province districts"}`, w - 40);
    doc.text(splitSubMag, 20, 53 + (splitTitleMag.length * 6));

    // Editorial author
    const authorY = 56 + (splitTitleMag.length * 6) + (splitSubMag.length * 4);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 100, 100);
    doc.text(`BY EDITORIAL WRITER: ${options.author.toUpperCase()} | SPECIAL DISPATCH IN-DEPTH COVENANT STUDY`, 20, authorY);

    // Divider line
    doc.setDrawColor(210, 210, 210);
    doc.setLineWidth(0.3);
    doc.line(20, authorY + 4, w - 20, authorY + 4);

    // Columns Layout X/Y parameters
    const colY = authorY + 12;
    const colW = 81;
    const colH = 175;

    const seedMagText = options.contentSeed || "The integration of agile database design and secure local server systems has catalyzed a brand-new administrative model in East African learning institutions. By structuring computer networks and database schemas directly around verified community needs, administrators can bypass classic bureaucracy and achieve immediate, ultra-durable sync performance.\n\nUnder our joint covenantal leadership framework in Bungoma County, researchers have discovered that academic commitment grows exponentially when data structures are made transparent. Rather than storing system variables in remote, unreachable centralized server nodes that require high internet bandwidth, we utilize localized offline database caching buffers to maintain continuous, undistorted document records even during total internet grid failure. Final documents are certified print ready.";
    const paragraphs = seedMagText.split("\n\n");
    const col1Text = paragraphs[0] || "";
    const col2Text = paragraphs.slice(1).join("\n\n") || "";

    // COLUMN 1 (LEFT) - Headings in bold, not the whole document
    doc.setFont("times", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(selectedTheme.primary.r, selectedTheme.primary.g, selectedTheme.primary.b);
    doc.text("I. STRATEGIC REGIONAL FOCUS", 20, colY);
    
    doc.setFont("times", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(60, 60, 60);
    const splitCol1 = doc.splitTextToSize(col1Text, colW);
    doc.text(splitCol1, 20, colY + 6);

    // Column Divider
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.35);
    doc.line(105, colY - 2, 105, colY + colH - 12);

    // COLUMN 2 (RIGHT) - Headings in bold
    doc.setFont("times", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(selectedTheme.primary.r, selectedTheme.primary.g, selectedTheme.primary.b);
    doc.text("II. SYSTEM IMPLEMENTATION LOGS", 109, colY);

    doc.setFont("times", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(60, 60, 60);
    const splitCol2 = doc.splitTextToSize(col2Text, colW);
    doc.text(splitCol2, 109, colY + 6);

    // Callout Box
    const boxY = 240;
    doc.setFillColor(246, 248, 250);
    doc.setDrawColor(selectedTheme.primary.r, selectedTheme.primary.g, selectedTheme.primary.b);
    doc.setLineWidth(0.25);
    doc.rect(20, boxY, w - 40, 25, "FD");

    doc.setFillColor(selectedTheme.primary.r, selectedTheme.primary.g, selectedTheme.primary.b);
    doc.rect(20, boxY, 1.5, 25, "F");

    doc.setTextColor(selectedTheme.primary.r, selectedTheme.primary.g, selectedTheme.primary.b);
    doc.setFont("times", "bold");
    doc.setFontSize(9.5);
    doc.text("MAGAZINE METRIC OF COVENANT PERFORMANCE", 24, boxY + 6);

    doc.setTextColor(80, 80, 80);
    doc.setFont("times", "italic");
    doc.setFontSize(8);
    doc.text("This dispatcher review is certified as a print-ready executive magazine layout. All fonts, structures, headings (bolded), and columns are preserved exactly without distortion and structured with full typographic fidelity.", 24, boxY + 12, { maxWidth: w - 50 });

    // Footer
    doc.setDrawColor(200, 200, 200);
    doc.line(14, h - 16, w - 14, h - 16);
    doc.setTextColor(110, 110, 110);
    doc.setFont("courier", "bold");
    doc.setFontSize(7.5);
    doc.text("ZION PROFESSIONAL MAGAZINE COMPILER - FULL COVENANT DISPATCH", w / 2, h - 11, { align: "center" });

    // Save
    const safeFilenameMag = options.title.toLowerCase().replace(/[^a-z0-9]+/g, "_") + "_professional_magazine.pdf";
    doc.save(safeFilenameMag);
    return;
  }

  applyThemeBackground();
  drawDoubleBorders();

  drawCornerFiligree(12, 12, 1, 1);
  drawCornerFiligree(w - 12, 12, -1, 1);
  drawCornerFiligree(12, h - 12, 1, -1);
  drawCornerFiligree(w - 12, h - 12, -1, -1);

  // Institution / Crest Text
  doc.setTextColor(selectedTheme.primary.r, selectedTheme.primary.g, selectedTheme.primary.b);
  doc.setFont("times", "bold");
  doc.setFontSize(10.5);
  doc.text("ZION DIGITAL LEADERSHIP & BIBLE SCHOOL", w / 2, 35, { align: "center" });

  doc.setTextColor(110, 110, 110);
  doc.setFont("courier", "bold");
  doc.setFontSize(7);
  doc.text("ESTABLISHED FOR ACADEMIC EXCELLENCE & STRATEGIC INNOVATION", w / 2, 40, { align: "center" });

  doc.setDrawColor(selectedTheme.secondary.r, selectedTheme.secondary.g, selectedTheme.secondary.b);
  doc.setLineWidth(0.4);
  doc.line(w / 2 - 40, 44, w / 2 + 40, 44);

  // Document Type / Layout Badge
  doc.setFillColor(selectedTheme.primary.r, selectedTheme.primary.g, selectedTheme.primary.b);
  doc.rect(w / 2 - 35, 75, 70, 7.5, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(options.layoutType.toUpperCase(), w / 2, 80, { align: "center" });

  // Main Title
  doc.setTextColor(30, 30, 30);
  doc.setFont("times", "bold");
  doc.setFontSize(26);
  const splitTitle = doc.splitTextToSize(options.title || "The Unnamed Manuscript", w - 50);
  doc.text(splitTitle, w / 2, 105, { align: "center" });

  // Subtitle
  doc.setTextColor(80, 80, 80);
  doc.setFont("times", "italic");
  doc.setFontSize(13);
  const splitSub = doc.splitTextToSize(options.subtitle || "Exploring divine leadership vectors and high-fidelity frameworks", w - 60);
  doc.text(splitSub, w / 2, 105 + (splitTitle.length * 10), { align: "center" });

  // Seal Watermark Graphic
  const cy = 185;
  doc.setDrawColor(selectedTheme.secondary.r, selectedTheme.secondary.g, selectedTheme.secondary.b);
  doc.setLineWidth(0.3);
  doc.circle(w / 2, cy, 18, "S");
  doc.circle(w / 2, cy, 16, "S");
  doc.setFont("times", "normal");
  doc.setFontSize(6);
  doc.setTextColor(selectedTheme.primary.r, selectedTheme.primary.g, selectedTheme.primary.b);
  doc.text("OFFICIAL SEAL", w / 2, cy - 4, { align: "center" });
  doc.text("ACADEMIC COUNCIL", w / 2, cy + 4, { align: "center" });
  doc.setFont("courier", "bold");
  doc.setFontSize(5);
  doc.text("BUNGOMA - KENYA", w / 2, cy + 8, { align: "center" });

  // Author details / Date at bottom
  doc.setTextColor(60, 60, 60);
  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.text(`PREPARED BY: ${options.author.toUpperCase() || "ACADEMIC STAFF"}`, w / 2, 235, { align: "center" });

  doc.setTextColor(120, 120, 120);
  doc.setFont("times", "normal");
  doc.setFontSize(9);
  doc.text("CURRICULUM ALIGNMENT SERIES", w / 2, 242, { align: "center" });
  
  const currentDate = new Date().toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' });
  doc.text(`DATE OF COMPILATION: ${currentDate}`, w / 2, 248, { align: "center" });

  doc.setFont("courier", "normal");
  doc.setFontSize(7);
  doc.text("COMPRESSED HIGH FIDELITY SECURE DOCUMENT", w / 2, 260, { align: "center" });

  // Generate dynamic pages based on structured chapters requested
  const totalChapters = Math.max(1, Math.min(100, options.chaptersCount));
  
  // Create simulated or real parsed chapters from actual seed or standard curriculum
  const chapters: { title: string; sections: { title: string; content: string }[] }[] = [];
  
  const rawSeed = options.contentSeed || "";
  const seedSections = rawSeed.split(/\n\s*CHAPTER|\n\s*##\s+|\n\s*#\s+/i).filter(s => s.trim().length > 10);

  for (let i = 1; i <= totalChapters; i++) {
    let chapterTitle = `Chapter ${i}: Advanced Principles & Frameworks`;
    let chapContent = "";

    if (seedSections[i - 1]) {
      const lines = seedSections[i - 1].trim().split("\n");
      const matchedTitle = lines[0].replace(/^[#\-*\s]+/, "").trim();
      chapterTitle = `Chapter ${i}: ${matchedTitle || "Dynamic Scholastic Foundations"}`;
      chapContent = lines.slice(1).join("\n").trim();
    } else {
      // Default placeholder text to meet page volume requests seamlessly
      if (options.layoutType === "Academic Textbook") {
        chapterTitle = `Chapter ${i}: Structural Foundations of Zion Computer Science`;
        chapContent = `Zion Computer Science and infrastructure paradigms are built upon rigorous technical and academic excellence. In this module, the fundamental algorithms and leadership schemas are researched. The Bungoma constant represents the baseline optimization parameter for database and system integrations. We study the core system models, database replication mechanisms, and peer-to-peer security rules. In subsequent lessons, these abstract theories are applied to real-world deployment networks across East Africa, Nairobi, and Western Province districts, yielding optimized data transfer logs and high durability.`;
      } else if (options.layoutType === "Theological Journal") {
        chapterTitle = `Chapter ${i}: Hermeneutics, Homiletics & Divine Covenants`;
        chapContent = `Exegesis and theological inquiry require a disciplined methodology to extract deep covenantal secrets. We explore how sacred scriptures apply directly to modern leadership, ethical stewardship, and community reconciliation. Throughout Bungoma and the larger Mount Elgon region, faith-based integration has historically provided the strongest foundation for ethical action, digital integrity, and servant leadership.`;
      } else if (options.layoutType === "Business Proposal Blueprint") {
        chapterTitle = `Chapter ${i}: Enterprise Architecture, Budget Planning & ROI`;
        chapContent = `This enterprise project proposal details a self-sustaining technical network designed to empower local scholars and leadership clusters. Financially, our projections show a 40% efficiency boost in database storage utilization, translating directly to massive cost savings. The budget comprises regional material procurement, software licenses, full-stack container environments, and long-term security auditing metrics.`;
      } else {
        chapterTitle = `Chapter ${i}: Ethical Governance, Policy Drafting & Strategy`;
        chapContent = `Governance systems require clear rules, check-and-balance parameters, and comprehensive audit logs. Under the direction of the Board of Examiners at Zion school, this strategic roadmap focuses on policy development, community accountability, and the seamless integration of distributed data processing tools to monitor compliance and ethical milestones.`;
      }
    }

    // Add sub-sections to make chapters rich and multi-paged
    const subSections = [
      {
        title: `Section ${i}.1: Core Methodological Foundations`,
        content: chapContent.slice(0, 450) || "The study methodology utilizes comprehensive literature surveys, comparative qualitative evaluations, and cloud system validation logs to ensure reliable scholastic outputs."
      },
      {
        title: `Section ${i}.2: Case Study & Regional Context (Bungoma & Mount Elgon)`,
        content: `Applying academic concepts within the Western Kenya region demonstrates the resilience of this framework. Local institutions have successfully integrated these protocols, resulting in high satisfaction indexes, secure and decentralized records, and immediate local capacity building.`
      },
      {
        title: `Section ${i}.3: Implementation Checklist & Strategic Milestones`,
        content: `1. Conduct preliminary environment assessment and resource mapping.\n2. Design local server sandboxes and establish local data synchronization hooks.\n3. Implement automated self-assessment feedback loops.\n4. Securely sign verified diplomas of completion on the immutable blockchain ledgers.`
      }
    ];

    chapters.push({
      title: chapterTitle,
      sections: subSections
    });
  }

  // Calculate total pages including TOC
  // Page 1: Cover
  // Page 2: Table of Contents
  // Subsequent: Each chapter gets its own page(s). Let's lay out 1 chapter per page to keep it clean and highly structured.
  // This yields exactly `totalChapters + 2` pages.
  const totalPagesCount = totalChapters + 2;

  // --- PAGE 2: AUTOMATED TABLE OF CONTENTS (TOC) ---
  doc.addPage();
  applyThemeBackground();
  drawDoubleBorders();
  drawHeaderFooter(2, totalPagesCount);

  // TOC Heading
  doc.setTextColor(selectedTheme.primary.r, selectedTheme.primary.g, selectedTheme.primary.b);
  doc.setFont("times", "bold");
  doc.setFontSize(16);
  doc.text("TABLE OF CONTENTS", w / 2, 28, { align: "center" });

  doc.setDrawColor(selectedTheme.secondary.r, selectedTheme.secondary.g, selectedTheme.secondary.b);
  doc.setLineWidth(0.4);
  doc.line(w / 2 - 30, 31, w / 2 + 30, 31);

  // TOC Intro
  doc.setTextColor(80, 80, 80);
  doc.setFont("times", "italic");
  doc.setFontSize(9.5);
  doc.text("This index lists all curated academic chapters, sub-sections, and page distributions.", 20, 40);

  // Render index items
  let tocY = 52;
  doc.setFont("times", "bold");
  doc.setFontSize(10);
  doc.setTextColor(30, 30, 30);
  
  // Render Cover entry
  doc.text("COVER PAGE", 20, tocY);
  addTOCDots(52, w - 24, tocY);
  doc.text("1", w - 20, tocY, { align: "right" });
  
  tocY += 7;
  doc.text("TABLE OF CONTENTS INDEX", 20, tocY);
  addTOCDots(74, w - 24, tocY);
  doc.text("2", w - 20, tocY, { align: "right" });

  tocY += 10;

  chapters.forEach((chap, cIdx) => {
    if (tocY > 250) {
      // If table of contents runs too long, wrap to next line or trim
      return;
    }
    
    // Chapter entry
    doc.setFont("times", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(selectedTheme.primary.r, selectedTheme.primary.g, selectedTheme.primary.b);
    
    const displayChapTitle = chap.title.length > 50 ? chap.title.slice(0, 48) + "..." : chap.title;
    doc.text(displayChapTitle.toUpperCase(), 20, tocY);
    
    const pageIndex = cIdx + 3; // Chapters start on Page 3
    addTOCDots(20 + doc.getTextWidth(displayChapTitle.toUpperCase()) + 3, w - 24, tocY);
    doc.setTextColor(30, 30, 30);
    doc.text(pageIndex.toString(), w - 20, tocY, { align: "right" });

    tocY += 5;

    // Render Section Subsections in TOC (smaller font)
    chap.sections.slice(0, 2).forEach((sec) => {
      if (tocY > 250) return;
      doc.setFont("times", "normal");
      doc.setFontSize(8);
      doc.setTextColor(90, 90, 90);
      const displaySecTitle = sec.title.length > 60 ? sec.title.slice(0, 58) + "..." : sec.title;
      doc.text(`   • ${displaySecTitle}`, 20, tocY);
      tocY += 4.2;
    });

    tocY += 3.5; // space between chapters
  });

  // Brief seal declaration
  doc.setFont("courier", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(selectedTheme.secondary.r, selectedTheme.secondary.g, selectedTheme.secondary.b);
  doc.text("© ZION ACADEMIC PUBLISHING PRESS - BUNGOMA WEST DISTRICT, KENYA", w / 2, 274, { align: "center" });


  // --- PGS 3+: CURATED CHAPTERS ---
  chapters.forEach((chap, cIdx) => {
    doc.addPage();
    applyThemeBackground();
    drawDoubleBorders();

    const currentPageNum = cIdx + 3;
    drawHeaderFooter(currentPageNum, totalPagesCount);

    // Chapter Header Label
    doc.setTextColor(selectedTheme.secondary.r, selectedTheme.secondary.g, selectedTheme.secondary.b);
    doc.setFont("times", "bold");
    doc.setFontSize(10);
    const chapterLabel = `CHAPTER ${cIdx + 1} OF ${totalChapters}`;
    doc.text(chapterLabel, 20, 26);

    // Chapter Title
    doc.setTextColor(selectedTheme.primary.r, selectedTheme.primary.g, selectedTheme.primary.b);
    doc.setFont("times", "bold");
    doc.setFontSize(15);
    const splitChapTitle = doc.splitTextToSize(chap.title, w - 40);
    doc.text(splitChapTitle, 20, 33);

    // Decorative line
    const dividerY = 35 + (splitChapTitle.length * 4);
    doc.setDrawColor(selectedTheme.primary.r, selectedTheme.primary.g, selectedTheme.primary.b);
    doc.setLineWidth(0.6);
    doc.line(20, dividerY, 80, dividerY);
    
    doc.setDrawColor(selectedTheme.secondary.r, selectedTheme.secondary.g, selectedTheme.secondary.b);
    doc.setLineWidth(0.2);
    doc.line(80, dividerY, w - 20, dividerY);

    // Sections container
    let textY = dividerY + 10;

    chap.sections.forEach((sec, sIdx) => {
      // 1. Title
      doc.setFont("times", "bold");
      doc.setFontSize(11);
      doc.setTextColor(30, 30, 30);
      const splitSecTitle = doc.splitTextToSize(sec.title, w - 40);
      doc.text(splitSecTitle, 20, textY);
      textY += 4.5 + (splitSecTitle.length * 1);

      // 2. Section Content text wrapping
      doc.setFont("times", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(60, 60, 60);
      const splitContent = doc.splitTextToSize(sec.content, w - 40);
      doc.text(splitContent, 20, textY);
      textY += (splitContent.length * 4.4) + 6;

      // Draw light line between sections
      if (sIdx < chap.sections.length - 1) {
        doc.setDrawColor(230, 230, 230);
        doc.setLineWidth(0.25);
        doc.line(20, textY - 2, w - 20, textY - 2);
      }
    });

    // Elegant Regional Callout Box for Bungoma at the bottom of the page
    const calloutY = 224;
    doc.setFillColor(248, 246, 240);
    doc.setDrawColor(selectedTheme.secondary.r, selectedTheme.secondary.g, selectedTheme.secondary.b);
    doc.setLineWidth(0.3);
    doc.rect(20, calloutY, w - 40, 30, "FD");

    // Callout vertical accent bar
    doc.setFillColor(selectedTheme.primary.r, selectedTheme.primary.g, selectedTheme.primary.b);
    doc.rect(20, calloutY, 1.8, 30, "F");

    // Callout text
    doc.setTextColor(selectedTheme.primary.r, selectedTheme.primary.g, selectedTheme.primary.b);
    doc.setFont("times", "bold");
    doc.setFontSize(9.5);
    doc.text("REGIONAL CASE INSIGHTS & PRACTICAL FIELD ANALYSIS:", 24, calloutY + 6);

    doc.setTextColor(80, 80, 80);
    doc.setFont("times", "italic");
    doc.setFontSize(8);
    const splitCallout = doc.splitTextToSize(
      `These strategic curriculum outlines, formatted under the joint mandate of the Zion Board of Examiners in Bungoma, represent certified regional templates verified for practical deployability across Nairobi, Bungoma County networks, the Mount Elgon region, and local East Africa training groups. Integrity of scripture reference logs and computational data remains uncompromised.`,
      w - 48
    );
    doc.text(splitCallout, 24, calloutY + 11);
  });

  // Save the constructed file
  const safeFilename = options.title.toLowerCase().replace(/[^a-z0-9]+/g, "_") + "_full_manuscript.pdf";
  doc.save(safeFilename);
}
