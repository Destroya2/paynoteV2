async function generateInvoicePDF(invoiceData, userData) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Colors
    const primaryColor = [99, 102, 241];
    const darkColor = [31, 41, 55];
    const lightGray = [156, 163, 175];
    
    // Logo Paynote (simple)
    doc.setFillColor(...primaryColor);
    doc.roundedRect(20, 15, 15, 15, 2, 2, 'F');
    doc.setFillColor(52, 211, 153);
    doc.circle(32, 27, 3, 'F');
    
    // Company Name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.setTextColor(...primaryColor);
    doc.text('Paynote', 40, 25);
    
    // Invoice Title
    doc.setFontSize(32);
    doc.setTextColor(...darkColor);
    doc.text('FACTURE', 20, 50);
    
    // Invoice Number & Dates
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...lightGray);
    doc.text('N° Facture', 20, 60);
    doc.text('Date d\'émission', 20, 67);
    doc.text('Date d\'échéance', 20, 74);
    
    doc.setTextColor(...darkColor);
    doc.setFont('helvetica', 'bold');
    doc.text(invoiceData.invoice_number, 60, 60);
    doc.setFont('helvetica', 'normal');
    doc.text(formatDate(invoiceData.issue_date), 60, 67);
    doc.text(formatDate(invoiceData.due_date), 60, 74);
    
    // Freelancer Info (right side)
    if (userData) {
        const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', userData.id)
            .single();
        
        if (profile) {
            let yPos = 60;
            doc.setFontSize(10);
            doc.setTextColor(...lightGray);
            doc.text('DE', 140, yPos);
            
            doc.setTextColor(...darkColor);
            doc.setFont('helvetica', 'bold');
            yPos += 7;
            doc.text(profile.full_name || profile.email, 140, yPos);
            
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            if (profile.company_name) {
                yPos += 5;
                doc.text(profile.company_name, 140, yPos);
            }
            if (profile.siret) {
                yPos += 5;
                doc.text(`SIRET: ${profile.siret}`, 140, yPos);
            }
            if (profile.address) {
                yPos += 5;
                doc.text(profile.address, 140, yPos);
            }
        }
    }
    
    // Client Info
    let clientY = 95;
    doc.setFontSize(10);
    doc.setTextColor(...lightGray);
    doc.text('FACTURER À', 20, clientY);
    
    clientY += 7;
    doc.setTextColor(...darkColor);
    doc.setFont('helvetica', 'bold');
    doc.text(invoiceData.client_name, 20, clientY);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    if (invoiceData.client_company) {
        clientY += 5;
        doc.text(invoiceData.client_company, 20, clientY);
    }
    if (invoiceData.client_email) {
        clientY += 5;
        doc.text(invoiceData.client_email, 20, clientY);
    }
    
    // Items Table
    let tableY = clientY + 20;
    
    // Table Header
    doc.setFillColor(249, 250, 251);
    doc.rect(20, tableY, 170, 10, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...darkColor);
    doc.text('Description', 22, tableY + 6);
    doc.text('Qté', 120, tableY + 6);
    doc.text('Prix unit.', 140, tableY + 6);
    doc.text('Total', 170, tableY + 6);
    
    // Table Items
    tableY += 12;
    doc.setFont('helvetica', 'normal');
    
    invoiceData.items.forEach(item => {
        doc.text(item.description, 22, tableY);
        doc.text(item.quantity.toString(), 120, tableY);
        doc.text(formatCurrency(item.unit_price, invoiceData.currency), 140, tableY);
        doc.text(formatCurrency(item.total, invoiceData.currency), 170, tableY);
        tableY += 7;
    });
    
    // Line separator
    doc.setDrawColor(...lightGray);
    doc.line(20, tableY + 5, 190, tableY + 5);
    
    // Total
    tableY += 15;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(...primaryColor);
    doc.text('TOTAL', 120, tableY);
    doc.text(formatCurrency(invoiceData.total, invoiceData.currency), 170, tableY);
    
    // Notes
    if (invoiceData.notes) {
        tableY += 20;
        doc.setFontSize(9);
        doc.setTextColor(...lightGray);
        doc.text('NOTES', 20, tableY);
        
        tableY += 5;
        doc.setTextColor(...darkColor);
        doc.setFont('helvetica', 'normal');
        const splitNotes = doc.splitTextToSize(invoiceData.notes, 170);
        doc.text(splitNotes, 20, tableY);
    }
    
    // Footer
    doc.setFontSize(10);
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'italic');
    doc.text('Merci pour votre confiance !', 105, 280, { align: 'center' });
    
    doc.setFontSize(8);
    doc.setTextColor(...lightGray);
    doc.text('Généré avec Paynote - paynote.app', 105, 287, { align: 'center' });
    
    return doc.output('blob');
}
