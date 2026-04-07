import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface DemandPDFData {
  creatorName: string;
  date: string;
  items: { name: string; quantity: number }[];
}

export function generateDemandPDF(data: DemandPDFData) {
  const doc = new jsPDF();

  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('BON DE DEMANDE', 105, 25, { align: 'center' });

  doc.setFontSize(12);
  doc.text('ERCM SA', 105, 35, { align: 'center' });

  doc.setDrawColor(180, 30, 30);
  doc.setLineWidth(1);
  doc.line(20, 40, 190, 40);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${data.date}`, 20, 50);
  doc.text(`Requester: ${data.creatorName}`, 20, 58);

  autoTable(doc, {
    startY: 68,
    head: [['#', 'Item', 'Quantity']],
    body: data.items.map((item, i) => [(i + 1).toString(), item.name, item.quantity.toString()]),
    styles: { fontSize: 10 },
    headStyles: { fillColor: [30, 30, 30] },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 150;
  doc.setFont('helvetica', 'bold');
  doc.text(`Total Items: ${data.items.length}`, 20, finalY + 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Signature Stock Manager: ___________________', 20, finalY + 40);
  doc.text('Signature Receiver: ___________________', 110, finalY + 40);

  doc.save(`demand-${data.date}.pdf`);
}

// --- Rapport de Réception ---

interface ReceptionPDFData {
  date: string;
  stockManagerName: string;
  magazinierName: string;
  validatedItems: { name: string; quantity: number; poids: number | null }[];
  rejectedItems: { name: string; quantity: number; reason: string }[];
  addedItems: { name: string; quantity: number; poids: number | null }[];
  totalValidatedQty: number;
}

export function generateReceptionPDF(data: ReceptionPDFData) {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('RAPPORT DE RÉCEPTION', 105, 25, { align: 'center' });

  doc.setFontSize(12);
  doc.text('ERCM SA', 105, 35, { align: 'center' });

  doc.setDrawColor(180, 30, 30);
  doc.setLineWidth(1);
  doc.line(20, 40, 190, 40);

  // Info
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${data.date}`, 20, 50);
  doc.text(`Stock Manager: ${data.stockManagerName}`, 20, 58);
  doc.text(`Magazinier: ${data.magazinierName}`, 20, 66);

  let currentY = 76;

  // Validated items
  if (data.validatedItems.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Articles Validés', 20, currentY);
    currentY += 4;

    autoTable(doc, {
      startY: currentY,
      head: [['#', 'Article', 'Quantité', 'Poids (kg)']],
      body: data.validatedItems.map((item, i) => [
        (i + 1).toString(),
        item.name,
        item.quantity.toString(),
        item.poids != null ? item.poids.toString() : '—',
      ]),
      styles: { fontSize: 10 },
      headStyles: { fillColor: [34, 139, 34] },
    });
    currentY = (doc as any).lastAutoTable?.finalY + 10 || currentY + 30;
  }

  // Rejected items
  if (data.rejectedItems.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Articles Rejetés', 20, currentY);
    currentY += 4;

    autoTable(doc, {
      startY: currentY,
      head: [['#', 'Article', 'Quantité', 'Motif de Rejet']],
      body: data.rejectedItems.map((item, i) => [
        (i + 1).toString(),
        item.name,
        item.quantity.toString(),
        item.reason,
      ]),
      styles: { fontSize: 10 },
      headStyles: { fillColor: [180, 30, 30] },
    });
    currentY = (doc as any).lastAutoTable?.finalY + 10 || currentY + 30;
  }

  // Added items by stock manager
  if (data.addedItems.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Articles Ajoutés par Stock Manager', 20, currentY);
    currentY += 4;

    autoTable(doc, {
      startY: currentY,
      head: [['#', 'Article', 'Quantité', 'Poids (kg)']],
      body: data.addedItems.map((item, i) => [
        (i + 1).toString(),
        item.name,
        item.quantity.toString(),
        item.poids != null ? item.poids.toString() : '—',
      ]),
      styles: { fontSize: 10 },
      headStyles: { fillColor: [30, 30, 120] },
    });
    currentY = (doc as any).lastAutoTable?.finalY + 10 || currentY + 30;
  }

  // Totals
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`Total Articles Validés: ${data.validatedItems.length + data.addedItems.length}`, 20, currentY);
  doc.text(`Total Quantité Validée: ${data.totalValidatedQty + data.addedItems.reduce((s, i) => s + i.quantity, 0)}`, 20, currentY + 8);
  doc.text(`Articles Rejetés: ${data.rejectedItems.length}`, 20, currentY + 16);

  // Signatures
  const sigY = currentY + 35;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Signature Stock Manager: ___________________', 20, sigY);
  doc.text('Signature Magazinier: ___________________', 110, sigY);

  doc.save(`rapport-reception-${data.date}.pdf`);
}
