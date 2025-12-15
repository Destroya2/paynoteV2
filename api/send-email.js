export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { to, invoice_number, pdf_url, client_name } = req.body;

    // Validation
    if (!to || !invoice_number || !pdf_url || !client_name) {
      return res.status(400).json({ error: 'Données manquantes' });
    }

    // Template HTML email
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0;
            padding: 0;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background: #ffffff;
          }
          .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 40px 30px; 
            text-align: center; 
            border-radius: 8px 8px 0 0; 
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 700;
          }
          .content { 
            background: #f9fafb; 
            padding: 40px 30px;
          }
          .content p {
            margin: 0 0 15px 0;
            font-size: 16px;
            color: #374151;
          }
          .button { 
            display: inline-block; 
            background: #6366F1; 
            color: white !important; 
            padding: 14px 32px; 
            text-decoration: none; 
            border-radius: 8px; 
            margin: 25px 0;
            font-weight: 600;
            font-size: 16px;
          }
          .button-container {
            text-align: center;
          }
          .invoice-number {
            background: white;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #6366F1;
            margin: 20px 0;
          }
          .footer { 
            text-align: center; 
            color: #6b7280; 
            font-size: 13px; 
            padding: 30px 20px;
            background: #ffffff;
          }
          .footer p {
            margin: 5px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📄 Nouvelle Facture</h1>
          </div>
          <div class="content">
            <p>Bonjour <strong>${client_name}</strong>,</p>
            
            <p>Vous avez reçu une nouvelle facture de notre part.</p>
            
            <div class="invoice-number">
              <p style="margin: 0; color: #6366F1; font-weight: 600;">Numéro de facture</p>
              <p style="margin: 5px 0 0 0; font-size: 20px; font-weight: 700; color: #1f2937;">${invoice_number}</p>
            </div>
            
            <p>Vous pouvez télécharger votre facture au format PDF en cliquant sur le bouton ci-dessous :</p>
            
            <div class="button-container">
              <a href="${pdf_url}" class="button">Télécharger la facture PDF</a>
            </div>
            
            <p>Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
            <a href="${pdf_url}" style="color: #6366F1; word-break: break-all;">${pdf_url}</a></p>
            
            <p style="margin-top: 30px;">Merci pour votre confiance ! 🙏</p>
          </div>
          <div class="footer">
            <p><strong>Cette facture a été générée avec Paynote</strong></p>
            <p>Solution de facturation IA pour freelances</p>
            <p style="color: #9ca3af; margin-top: 10px;">© 2025 Paynote. Tous droits réservés.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Appel à Resend API
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Paynote <onboarding@resend.dev>', // Changez avec votre domaine vérifié
        to: [to],
        subject: `Facture ${invoice_number} - Paynote`,
        html: emailHtml,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Erreur lors de l\'envoi de l\'email');
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Email envoyé avec succès',
      data 
    });

  } catch (error) {
    console.error('Error in send-email:', error);
    return res.status(500).json({ 
      error: error.message || 'Erreur lors de l\'envoi de l\'email' 
    });
  }
}
