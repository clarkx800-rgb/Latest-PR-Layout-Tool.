import { jsPDF } from 'jspdf';
const doc = new jsPDF();
doc.setFont('helvetica', 'normal');
doc.text("X' Y-¹⁄₂\"", 10, 10);
doc.text("X' Y-½\"", 10, 20);
doc.text("X' Y-3/16\"", 10, 30);
doc.save('test.pdf');
console.log('Saved');
