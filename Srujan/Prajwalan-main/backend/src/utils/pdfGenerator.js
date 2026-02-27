const PDFDocument = require('pdfkit');

function generatePrescriptionPDF(patientName, doctorName, diagnosis, prescription, notes) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      let buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // Header
      doc.fontSize(20).text('Q Nirvana Hospital', { align: 'center' });
      doc.fontSize(12).text('Prescription & Consultation Notes', { align: 'center' });
      doc.moveDown(2);

      doc.fontSize(14).text(`Doctor: Dr. ${doctorName}`);
      doc.text(`Patient: ${patientName}`);
      doc.text(`Date: ${new Date().toLocaleDateString('en-IN')}`);
      doc.moveDown();

      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown();

      // Body
      doc.fontSize(14).text('Diagnosis:', { underline: true });
      doc.fontSize(12).text(diagnosis || 'N/A');
      doc.moveDown();

      doc.fontSize(14).text('Prescription:', { underline: true });
      doc.fontSize(12).text(prescription || 'No medicines prescribed');
      doc.moveDown();

      doc.fontSize(14).text('Notes / Advice:', { underline: true });
      doc.fontSize(12).text(notes || 'N/A');
      doc.moveDown(2);

      // Footer
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown();
      doc.fontSize(10).text('This is a system generated document. Contact hospital for queries.', { align: 'center', color: 'grey' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { generatePrescriptionPDF };
