import { jsPDF } from 'jspdf';
import { type AppState } from '../types';
import { drawLayout } from './drawer';
import { LayoutMath, getCutToFitLength } from './math';
import { RENDER_CONFIG, DEFAULT_ZOOM, DEFAULT_PAN_X, DEFAULT_PAN_Y } from '../constants';

export const generatePdf = (state: AppState): jsPDF => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const canvas = document.createElement('canvas');
  // Use higher resolution for crisp PDF output
  canvas.width = RENDER_CONFIG.DIMS.CANVAS_W * 2;
  canvas.height = RENDER_CONFIG.DIMS.CANVAS_H * 2;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.scale(2, 2);
  }

  const pageWidth = 297;
  const pageHeight = 210;
  const margin = 10;
  const contentWidth = pageWidth - (margin * 2);

  state.phases.forEach((phase, i) => {
    if (i > 0) doc.addPage();
    
    // Draw Main Outer Border
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.rect(margin, margin, contentWidth, pageHeight - (margin * 2));

    // ==========================================
    // TITLE BLOCK (Top Section)
    // ==========================================
    doc.rect(margin, margin, contentWidth, 25); // Header Box
    
    // Left side: Logo / Company Name
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('POWER RAIL LAYOUT', margin + 5, margin + 8);
    
    // Sub-title details
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`TS: ${state.ts || 'N/A'}`, margin + 5, margin + 15);
    doc.text(`Sub-sub: ${state.subSub || 'N/A'}`, margin + 45, margin + 15);
    doc.text(`Work Order: ${state.wo || 'N/A'}`, margin + 5, margin + 21);

    // Section indicator (Middle)
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(`SECTION ${i + 1} OF ${state.phases.length}`, margin + 138, margin + 15, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const flowDir = state.isRTL ? 'Right to Left' : 'Left to Right';
    doc.text(`Build Direction: ${flowDir}`, margin + 138, margin + 21, { align: 'center' });

    // Right side: Totals
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('P-RAIL TO PREP', margin + contentWidth - 5, margin + 8, { align: 'right' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    // Red / Blue totals
    const rText = phase.red.isCutToFit 
      ? `(+) RED RAIL: ON-SITE-CUT ≯${getCutToFitLength(phase.red.totalMm)} mm` 
      : `(+) RED RAIL: ${phase.red.totalMm.toFixed(1)} mm`;
    
    const bText = phase.blue.isCutToFit 
      ? `(-) BLUE RAIL: ${getCutToFitLength(phase.blue.totalMm)} mm *CUT-ON-SITE*` 
      : `(-) BLUE RAIL: ${phase.blue.totalMm.toFixed(1)} mm`;

    doc.setTextColor(220, 38, 38); // Red
    doc.text(rText, margin + contentWidth - 5, margin + 15, { align: 'right' });
    doc.setTextColor(37, 99, 235); // Blue
    doc.text(bText, margin + contentWidth - 5, margin + 21, { align: 'right' });
    doc.setTextColor(0);

    // ==========================================
    // CANVAs AREA
    // ==========================================
    const canvasY = margin + 25;
    const canvasHeight = 123.11; // 277 / 2.25
    
    if (ctx) {
      const fittedPhase = JSON.parse(JSON.stringify(phase));
      fittedPhase.view.scale = DEFAULT_ZOOM;
      fittedPhase.view.panX = DEFAULT_PAN_X;
      fittedPhase.view.panY = DEFAULT_PAN_Y;
      
      // Clear before drawing
      ctx.clearRect(0, 0, RENDER_CONFIG.DIMS.CANVAS_W, RENDER_CONFIG.DIMS.CANVAS_H);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, RENDER_CONFIG.DIMS.CANVAS_W, RENDER_CONFIG.DIMS.CANVAS_H);

      drawLayout(
        ctx, 
        fittedPhase, 
        RENDER_CONFIG.DIMS.CANVAS_W, 
        RENDER_CONFIG.DIMS.CANVAS_H, 
        state.isRTL, 
        LayoutMath.getStartPostNum(state.phases, i),
        [],
        phase.showPosts ?? true,
        null,
        true,
        null,
        null,
        !!state.indicatorsFlipped,
        i,
        state.phases.length
      );
      
      const imgData = canvas.toDataURL('image/png', 1.0);
      doc.addImage(imgData, 'PNG', margin, canvasY, contentWidth, canvasHeight);
    }

    doc.rect(margin, canvasY, contentWidth, canvasHeight); // Border around canvas

    // ==========================================
    // NOTES & COMMENTS AREA
    // ==========================================
    const notesY = canvasY + canvasHeight;
    const notesHeight = pageHeight - margin - notesY;
    
    // Notes Title
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('TECHNICIAN NOTES & INSTRUCTIONS:', margin + 3, notesY + 5);
    
    // Divider line for notes box
    doc.line(margin + 75, notesY, margin + 75, notesY + notesHeight);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    // Feature Checkmarks
    const isStartZero = state.isRTL ? !!state.indicatorsFlipped : !state.indicatorsFlipped;
    const printParts = [
      { name: 'CIS', start: phase.cis?.start, end: phase.cis?.end },
      { name: 'ISO', start: phase.iso?.start, end: phase.iso?.end },
      { name: 'RAMP', start: phase.ramp?.start, end: phase.ramp?.end },
      { name: 'EXP', start: phase.exp?.start, end: phase.exp?.end },
    ];
    
    const checkmarks: string[] = [];
    printParts.forEach(part => {
      const side0Yes = isStartZero ? part.start : part.end;
      const side1Yes = isStartZero ? part.end : part.start;
      if (side0Yes) checkmarks.push(`0-SIDE ${part.name}: YES`);
      if (side1Yes) checkmarks.push(`1-SIDE ${part.name}: YES`);
    });

    const has1Lug = phase.lugs.some(l => l.type === '1');
    const has5Lug = phase.lugs.some(l => l.type === '5');
    const hasGround = phase.lugs.some(l => l.type === 'ground');
    const hasBlueLight = phase.lugs.some(l => l.type === 'blue-light');

    if (has1Lug) checkmarks.push('1-LUG: YES');
    if (has5Lug) checkmarks.push('5-LUG: YES');
    if (hasGround) checkmarks.push('GS CABLE: YES');
    if (hasBlueLight) checkmarks.push('BLUE LIGHT: YES');

    let featureYStart = notesY + 12;
    checkmarks.forEach((stmt, index) => {
      const isCol2 = index % 2 === 1;
      const xOffset = isCol2 ? 38 : 3;
      const yOffset = featureYStart + Math.floor(index / 2) * 6;
      doc.text(stmt, margin + xOffset, yOffset);
    });

    // Actual Comments
    if (phase.comments) {
      const splitText = doc.splitTextToSize(phase.comments, contentWidth - 85);
      
      // If the text is really long, we just print as much as fits or reduce font size.
      // Usually it fits in the remaining space.
      const linesThatFit = Math.floor((notesHeight - 6) / 4);
      const truncatedText = splitText.length > linesThatFit 
        ? [...splitText.slice(0, linesThatFit - 1), '... (notes truncated)']
        : splitText;

      doc.text(truncatedText, margin + 78, notesY + 5);
    } else {
      doc.setTextColor(150);
      doc.text("No additional notes provided for this section.", margin + 78, notesY + 5);
      doc.setTextColor(0);
    }

    // ==========================================
    // FOOTER
    // ==========================================
    doc.setFontSize(7);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin + 3, pageHeight - margin - 2);
    doc.text(`Page ${i + 1} of ${state.phases.length}`, contentWidth + margin - 3, pageHeight - margin - 2, { align: 'right' });

  });

  return doc;
};
