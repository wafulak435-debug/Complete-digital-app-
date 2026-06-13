import { jsPDF } from "jspdf";
import { QRCodeGenerator } from "./qrCode";

interface CertificateParams {
  studentName: string;
  studentEmail: string;
  schoolName: string;
  courseTopic: string;
  score: number;
  ledgerHash: string;
  date: string;
  verificationUrl: string;
}

export function generateAccreditedCertificatePdf(params: CertificateParams): void {
  // A4 Landscape dimensions: 297mm width x 210mm height
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4"
  });

  const w = 297;
  const h = 210;

  // 1. Draw elegant background parchment shading (subtle antique linen tint)
  doc.setFillColor(254, 252, 246);
  doc.rect(0, 0, w, h, "F");

  // 2. Double-line golden certificate borders
  doc.setDrawColor(180, 134, 12); // Antique Rich Gold color
  doc.setLineWidth(1.5);
  doc.rect(8, 8, w - 16, h - 16); // Outer border

  doc.setDrawColor(218, 165, 32); // Light Gold color
  doc.setLineWidth(0.5);
  doc.rect(11, 11, w - 22, h - 22); // Inner border

  // 3. Filigree-like Corner Accents (Draw lines or small corner triangles)
  const drawCornerAccent = (x: number, y: number, xDir: number, yDir: number) => {
    doc.setDrawColor(180, 134, 12);
    doc.setLineWidth(1.0);
    doc.line(x, y, x + xDir * 15, y);
    doc.line(x, y, x, y + yDir * 15);
    doc.line(x + xDir * 3, y + yDir * 3, x + xDir * 12, y + yDir * 3);
    doc.line(x + xDir * 3, y + yDir * 3, x + xDir * 3, y + yDir * 12);
  };
  drawCornerAccent(14, 14, 1, 1);       // Top-left
  drawCornerAccent(w - 14, 14, -1, 1);    // Top-right
  drawCornerAccent(14, h - 14, 1, -1);    // Bottom-left
  drawCornerAccent(w - 14, h - 14, -1, -1); // Bottom-right

  // 4. Large Faded Background Seal watermark in center
  doc.setDrawColor(241, 230, 206);
  doc.setFillColor(241, 230, 206);
  // Simple circle and cross lines to represent sacred seal
  // We specify alpha transparency if supported, or just clean light-colored vectors
  doc.setLineWidth(0.4);
  doc.circle(w / 2, h / 2 - 5, 45, "S");
  doc.circle(w / 2, h / 2 - 5, 42, "S");
  doc.line(w / 2 - 35, h / 2 - 5, w / 2 + 35, h / 2 - 5);
  doc.line(w / 2, h / 2 - 40, w / 2, h / 2 + 30);

  // 5. Header Section
  doc.setTextColor(115, 24, 24); // Primary Rich Maroon (Bungoma Senate color)
  doc.setFont("times", "bold");
  doc.setFontSize(22);
  doc.text("ZION DIGITAL LEADERSHIP & COMPUTER SCHOOL", w / 2, 28, { align: "center" });

  doc.setTextColor(100, 110, 120);
  doc.setFont("courier", "bold");
  doc.setFontSize(7.5);
  doc.text("ESTABLISHED IN COVENANT EXCELLENCE & SACRED STEWARDSHIP", w / 2, 33, { align: "center" });

  // Elegant divider line
  doc.setDrawColor(180, 134, 12);
  doc.setLineWidth(0.7);
  doc.line(w / 2 - 70, 38, w / 2 + 70, 38);

  // 6. Confers Section
  doc.setTextColor(80, 80, 80);
  doc.setFont("times", "italic");
  doc.setFontSize(11);
  doc.text("On Recommendation of the Academic Faculty & Joint Board of Examiners, Confers Upon", w / 2, 47, { align: "center" });

  // Student Name
  doc.setTextColor(26, 26, 26);
  doc.setFont("times", "bolditalic");
  doc.setFontSize(26);
  doc.text(params.studentName.toUpperCase(), w / 2, 62, { align: "center" });

  // Underline beneath name
  doc.setDrawColor(180, 134, 12);
  doc.setLineWidth(0.4);
  doc.line(w / 2 - 60, 65, w / 2 + 60, 65);

  // Mastery Text
  doc.setTextColor(80, 80, 80);
  doc.setFont("times", "italic");
  doc.setFontSize(11);
  doc.text("This official Graduate Diploma representing outstanding competency and mastery in our advanced,", w / 2, 75, { align: "center" });
  doc.text("AI-evaluated syllabus study topic of:", w / 2, 81, { align: "center" });

  // Syllabus / Course Name Box
  doc.setFillColor(245, 243, 237);
  doc.setDrawColor(190, 190, 180);
  doc.setLineWidth(0.3);
  doc.rect(w / 2 - 90, 87, 180, 12, "FD");

  doc.setTextColor(15, 15, 15);
  doc.setFont("courier", "bold");
  doc.setFontSize(11);
  doc.text(`[ ${params.schoolName.toUpperCase()} ]`, w / 2, 94, { align: "center" });

  // Additional detail text
  doc.setTextColor(110, 110, 110);
  doc.setFont("times", "normal");
  doc.setFontSize(8.5);
  doc.text(
    "With all rights, honors, and privileges thereunto appertaining. Satisfied study self-assessments, evaluated quizzes,",
    w / 2,
    108,
    { align: "center" }
  );
  doc.text(
    "and continuous learning modules verified automatically by the Zion Academy AI validation core and signed by Chancellor.",
    w / 2,
    113,
    { align: "center" }
  );

  // 7. Render Vector QR CODE for Digital Verification & Trust
  // Dimensions and Placement for QR Code on Certificate
  const qrX = w / 2 - 15; // Centered horizontally
  const qrY = 122;
  const qrSize = 30; // 30mm x 30mm

  // Background white box for QR Code
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(180, 134, 12);
  doc.setLineWidth(0.4);
  doc.rect(qrX - 2, qrY - 2, qrSize + 4, qrSize + 4, "FD");

  try {
    const qrGrid = QRCodeGenerator.generate(params.verificationUrl);
    const boxSize = qrSize / qrGrid.length;

    doc.setFillColor(15, 23, 42); // Very deep navy/black modules
    for (let r = 0; r < qrGrid.length; r++) {
      for (let c = 0; c < qrGrid[r].length; c++) {
        if (qrGrid[r][c]) {
          doc.rect(qrX + c * boxSize, qrY + r * boxSize, boxSize + 0.05, boxSize + 0.05, "F");
        }
      }
    }
  } catch (err) {
    console.error("Vector QR paint error on PDF:", err);
    // Draw placeholder cross border if qr generation fails
    doc.line(qrX, qrY, qrX + qrSize, qrY + qrSize);
    doc.line(qrX + qrSize, qrY, qrX, qrY + qrSize);
  }

  // Verification label beneath QR
  doc.setTextColor(180, 134, 12);
  doc.setFont("courier", "bold");
  doc.setFontSize(6.5);
  doc.text("SCAN TO VERIFY", w / 2, qrY + qrSize + 4.5, { align: "center" });

  // 8. Signatures Section & Official Seal
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(9);

  // Signature 1: AI Director Core
  const sigLineY = 175;
  doc.setDrawColor(190, 190, 180);
  doc.setLineWidth(0.3);
  doc.line(30, sigLineY, 95, sigLineY);

  doc.setFont("times", "italic");
  doc.setFontSize(10.5);
  doc.text("Wafula_ai_Academic", 62.5, sigLineY - 3, { align: "center" });
  doc.setFont("courier", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(120, 120, 120);
  doc.text("AI DIRECTORY AUDIT", 62.5, sigLineY + 4, { align: "center" });

  // Signature 2: Chancellor Kelvin Opara Wafula
  doc.setDrawColor(190, 190, 180);
  doc.setLineWidth(0.3);
  doc.line(w - 95, sigLineY, w - 30, sigLineY);

  doc.setTextColor(15, 23, 42);
  doc.setFont("times", "bolditalic");
  doc.setFontSize(11);
  doc.text("Kelvin O. Wafula", w - 62.5, sigLineY - 3, { align: "center" });
  doc.setFont("courier", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(120, 120, 120);
  doc.text("CHANCELLOR & CHIEF ADMINISTRATOR", w - 62.5, sigLineY + 4, { align: "center" });

  // Official Instructions Seal Graphics (Bottom middle left / overlay)
  const sealX = w / 2;
  const sealY = 175;

  // Let's draw an elegant golden-embossed certificate "INSTRUCTIONS SEAL" graphic overlapping bottom-middle
  doc.setDrawColor(218, 165, 32);
  doc.setFillColor(184, 134, 11);
  doc.setLineWidth(0.6);
  doc.circle(148.5, 175, 12, "FD"); // Seal body

  doc.setFillColor(218, 165, 32);
  doc.circle(148.5, 175, 10, "S"); // Inner ring

  doc.setTextColor(255, 255, 255);
  doc.setFont("courier", "bold");
  doc.setFontSize(5);
  doc.text("OFFICIAL SEAL", 148.5, 173.5, { align: "center" });
  doc.text("ZION SCHOOL", 148.5, 176.5, { align: "center" });
  doc.text("* 2026 *", 148.5, 179.5, { align: "center" });

  // 9. Footnote and LEDGER HASH citation
  doc.setTextColor(130, 130, 130);
  doc.setFont("courier", "bold");
  doc.setFontSize(6.5);
  doc.text(`ISSUED AT BUNGOMA KENYA • LOCAL LEDGER VERIFICATION STATE: ACTIVE`, 15, h - 12);
  doc.text(`SYSTEM REGISTRATION UNIQUE SECURE VALUE: ${params.ledgerHash}`, w - 15, h - 12, { align: "right" });

  // Save the generated document directly in student browser
  const docFilename = `ZionCertificate_${params.studentName.replace(/\s+/g, "_")}.pdf`;
  doc.save(docFilename);
}
