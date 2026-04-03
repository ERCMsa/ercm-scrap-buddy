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
