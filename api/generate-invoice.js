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
    const { description } = req.body;

    if (!description) {
      return res.status(400).json({ error: 'Description requise' });
    }

    const systemPrompt = `Tu es un assistant expert en facturation française. 
Extrait les informations d'une facture à partir d'une description en langage naturel.

Tu dois extraire:
- client_name: Nom du client ou société
- client_email: Email du client (si mentionné, sinon null)
- client_company: Nom de société (si mentionné, sinon null)
- service_description: Description professionnelle du service
- quantity: Nombre de jours/unités (défaut: 1)
- unit_price: Prix unitaire en nombre
- currency: Code devise (EUR, USD, etc. - défaut EUR)
- payment_terms: Délai de paiement en jours (défaut: 30)

Règles:
- Si montant total donné, calcule unit_price = total / quantity
- Détecte tarifs journaliers (ex: "400$/jour pendant 12 jours" = quantity: 12, unit_price: 400, currency: USD)
- Retourne UNIQUEMENT du JSON valide, sans texte avant ou après, sans balises markdown

Format JSON:
{
  "client_name": "Nom Client",
  "client_email": "email@exemple.fr",
  "client_company": "Société XYZ",
  "service_description": "Description du service",
  "quantity": 3,
  "unit_price": 500,
  "currency": "EUR",
  "payment_terms": 30
}`;

    // ✅ APPEL À PERPLEXITY (pas OpenAI)
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-large-128k-online',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Extrait les infos de cette facture en JSON:\n\n${description}` }
        ],
        temperature: 0.2,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API Error:', errorText);
      throw new Error('Erreur API Perplexity: ' + response.status);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Format de réponse Perplexity invalide');
    }
    
    const aiResponse = data.choices[0].message.content.trim();
    console.log('Perplexity Response:', aiResponse.substring(0, 200));
    
    // Parser la réponse JSON
    let parsedData;
    try {
      const cleanedResponse = aiResponse
          .replace(/```json\n?/g, '') // Optionnel: pour cibler spécifiquement '```json'
          .replace(/```\n?/g, '')
          .trim();
      
      parsedData = JSON.parse(cleanedResponse);
    } catch (e) {
      console.error('JSON Parse Error:', e);
      console.error('Response was:', aiResponse);
      
      // Essayer d'extraire le JSON avec regex
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Format de réponse IA invalide');
      }
    }

    // Validation des données
    if (!parsedData.client_name || !parsedData.service_description || !parsedData.unit_price) {
      console.error('Incomplete data:', parsedData);
      throw new Error('Données incomplètes extraites par l\'IA');
    }

    // Calculer les totaux
    const quantity = parsedData.quantity || 1;
    const unitPrice = parseFloat(parsedData.unit_price);
    const subtotal = quantity * unitPrice;
    
    // Préparer les données de facture
    const today = new Date();
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + (parsedData.payment_terms || 30));

    const invoiceData = {
      client_name: parsedData.client_name,
      client_email: parsedData.client_email || null,
      client_company: parsedData.client_company || null,
      issue_date: today.toISOString().split('T')[0],
      due_date: dueDate.toISOString().split('T')[0],
      currency: parsedData.currency || 'EUR',
      subtotal: subtotal,
      total: subtotal,
      items: [{
        description: parsedData.service_description,
        quantity: quantity,
        unit_price: unitPrice,
        total: subtotal
      }],
      notes: `Paiement sous ${parsedData.payment_terms || 30} jours`,
      status: 'draft'
    };

    console.log('Invoice generated:', invoiceData);
    return res.status(200).json(invoiceData);

  } catch (error) {
    console.error('Error in generate-invoice:', error);
    return res.status(500).json({ 
      error: error.message || 'Erreur lors de la génération de la facture' 
    });
  }
}
