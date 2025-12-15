// ============================================
// UTILS.JS - PAYNOTE
// Version robuste avec Perplexity AI (SAFE)
// ============================================

// ⚠️ Assure-toi que PERPLEXITY_API_KEY est bien défini globalement
// window.PERPLEXITY_API_KEY = "sk-xxxx";

// ============================================
// GÉNÉRATION IA AVEC PERPLEXITY
// ============================================

async function generateInvoiceWithAI(prompt) {
    try {
        console.log('🤖 Génération avec Perplexity AI...');
        console.log('📝 Prompt:', prompt);

        const response = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.1-sonar-large-128k-online',
                temperature: 0.2,
                max_tokens: 1000,
                top_p: 0.9,
                messages: [
                    {
                        role: 'system',
                        content: `
Tu es un assistant expert en facturation pour freelances français.

INSTRUCTIONS STRICTES :
- Réponds UNIQUEMENT en JSON valide
- Aucun texte avant ou après
- Aucune balise markdown
- Valeurs par défaut logiques si info absente

FORMAT JSON :
{
  "client_name": "",
  "client_email": "",
  "client_address": "",
  "service_description": "",
  "detailed_description": "",
  "quantity": 1,
  "unit_price": 0,
  "tax_rate": 20,
  "issue_date": "YYYY-MM-DD",
  "due_date": "YYYY-MM-DD",
  "payment_terms": "Paiement à 30 jours",
  "notes": "Merci pour votre confiance"
}
`
                    },
                    {
                        role: 'user',
                        content: `Génère une facture depuis cette description :\n${prompt}`
                    }
                ]
            })
        });

        console.log('📡 Status HTTP:', response.status);

        // ===============================
        // GESTION ERREURS HTTP
        // ===============================
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ Erreur API brute:', errorText);

            if (response.status === 401) {
                throw new Error('Clé API Perplexity invalide');
            }
            if (response.status === 429) {
                throw new Error('Quota API Perplexity dépassé');
            }
            if (response.status >= 500) {
                throw new Error('Erreur serveur Perplexity');
            }

            throw new Error(`Erreur API (${response.status})`);
        }

        // ===============================
        // LECTURE TEXTE BRUT (CRITIQUE)
        // ===============================
        const rawText = await response.text();

        if (!rawText || rawText.trim().length < 5) {
            console.error('❌ Réponse vide Perplexity:', rawText);
            throw new Error("Réponse vide de l'API Perplexity");
        }

        // ===============================
        // PARSING JSON API
        // ===============================
        let apiData;
        try {
            apiData = JSON.parse(rawText);
        } catch (e) {
            console.error('❌ JSON API invalide:', rawText);
            throw new Error("Réponse Perplexity non JSON");
        }

        const message = apiData?.choices?.[0]?.message?.content;

        if (!message) {
            console.error('❌ Message IA manquant:', apiData);
            throw new Error("Aucune réponse générée par l'IA");
        }

        console.log('🧠 Réponse IA brute:', message);

        // ===============================
        // NETTOYAGE MARKDOWN (FIX MAJEUR)
        // ===============================
        let content = message
            .replace(/```json/gi, '')
            .replace(/```/g, '')
            .trim();

        console.log('🧹 Contenu nettoyé:', content);

        // ===============================
        // VALIDATION JSON IA
        // ===============================
        if (!content.startsWith('{') || !content.endsWith('}')) {
            console.error('❌ Contenu non JSON:', content);
            throw new Error("L'IA n'a pas retourné un JSON valide");
        }

        let invoiceData;
        try {
            invoiceData = JSON.parse(content);
        } catch (e) {
            console.error('❌ Erreur parsing facture:', content);
            throw new Error("Erreur de parsing de la facture générée");
        }

        // ===============================
        // VALIDATION MÉTIER
        // ===============================
        if (!invoiceData.client_name || !invoiceData.service_description) {
            throw new Error("Données de facture incomplètes");
        }

        invoiceData.quantity = Number(invoiceData.quantity) || 1;
        invoiceData.unit_price = Number(invoiceData.unit_price) || 0;
        invoiceData.tax_rate = Number(invoiceData.tax_rate) || 20;

        console.log('✅ Facture générée:', invoiceData);
        return invoiceData;

    } catch (error) {
        console.error('❌ Erreur génération facture:', error);

        if (
            error.message.includes('fetch') ||
            error.message.includes('Network')
        ) {
            throw new Error("Impossible de contacter l'API Perplexity");
        }

        throw error;
    }
}

// ============================================
// FORMATAGE
// ============================================

function formatCurrency(amount, currency = 'EUR') {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency
    }).format(amount);
}

function formatDate(date) {
    return new Intl.DateFormat('fr-FR').format(new Date(date));
}

function formatDateFR(dateString) {
    return new Date(dateString).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function parseCurrency(str) {
    return parseFloat(str.replace(/[^0-9.-]+/g, ''));
}

// ============================================
// NAVIGATION
// ============================================

function showView(viewName) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const targetView = document.getElementById(viewName + 'View');
    if (targetView) targetView.classList.add('active');

    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    const targetNav = document.querySelector(`[data-view="${viewName}"]`);
    if (targetNav) targetNav.classList.add('active');

    const titles = { generator: 'Nouvelle facture', history: 'Historique' };
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle && titles[viewName]) {
        pageTitle.textContent = titles[viewName];
    }
}

// ============================================
// NOTIFICATIONS
// ============================================

function showError(message, elementId = 'error') {
    const errorDiv = document.getElementById(elementId);
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
    }
}

function hideError(elementId = 'error') {
    const errorDiv = document.getElementById(elementId);
    if (errorDiv) errorDiv.classList.add('hidden');
}

function showSuccess(message, duration = 3000) {
    const div = document.createElement('div');
    div.className = 'success-toast';
    div.textContent = message;
    document.body.appendChild(div);
    setTimeout(() => div.remove(), duration);
}

// ============================================
// CALCULS
// ============================================

function generateInvoiceNumber() {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `FAC-${year}-${random}`;
}

function calculateDueDate(paymentTerms, issueDate = new Date()) {
    const match = paymentTerms.match(/(\d+)/);
    const days = match ? parseInt(match[0]) : 30;
    const dueDate = new Date(issueDate);
    dueDate.setDate(dueDate.getDate() + days);
    return dueDate.toISOString().split('T')[0];
}

function calculateInvoiceTotal(items, taxRate = 20) {
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    const tax = subtotal * (taxRate / 100);
    return {
        subtotal: +subtotal.toFixed(2),
        tax: +tax.toFixed(2),
        total: +(subtotal + tax).toFixed(2)
    };
}

function calculateItemTotal(quantity, unitPrice) {
    return +(quantity * unitPrice).toFixed(2);
}

// ============================================
// VALIDATION
// ============================================

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateAmount(amount) {
    return !isNaN(amount) && Number(amount) > 0;
}

// ============================================
// UTILITAIRES
// ============================================

function debounce(func, wait) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showSuccess('Copié dans le presse-papiers');
        return true;
    } catch {
        showError('Impossible de copier');
        return false;
    }
}

console.log('✅ utils.js chargé — Paynote Perplexity sécurisé');
