// ============================================
// APP.JS - PAYNOTE V2
// Version avec API Vercel Perplexity
// ============================================

let currentUser = null;
let currentInvoiceData = null;

// ============================================
// INITIALISATION
// ============================================

async function initApp() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
            window.location.href = 'login.html';
            return;
        }
        
        currentUser = user;
        console.log('✅ Utilisateur connecté:', user.email);
        
        await loadUserProfile();
        await loadInvoices();
        setupEventListeners();
        
    } catch (error) {
        console.error('❌ Erreur initialisation:', error);
        window.location.href = 'login.html';
    }
}

// ============================================
// PROFIL UTILISATEUR
// ============================================

async function loadUserProfile() {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', currentUser.id)
            .single();
        
        if (error) throw error;
        
        // Mettre à jour l'UI
        const initials = getInitials(data.full_name || currentUser.email);
        const userInitials = document.getElementById('userInitials');
        if (userInitials) {
            userInitials.textContent = initials;
        }
        
        // Plan badge
        const planBadge = document.getElementById('planBadge');
        if (planBadge) {
            planBadge.textContent = data.plan.charAt(0).toUpperCase() + data.plan.slice(1);
        }
        
        // Invoice count
        const invoiceCount = document.getElementById('invoiceCount');
        if (invoiceCount) {
            invoiceCount.textContent = `${data.invoice_count}/${data.invoice_limit} factures`;
        }
        
        // Progress bar
        const planProgress = document.getElementById('planProgress');
        if (planProgress) {
            const progress = (data.invoice_count / data.invoice_limit) * 100;
            planProgress.style.width = progress + '%';
        }
        
    } catch (error) {
        console.error('❌ Erreur chargement profil:', error);
    }
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item[data-view]').forEach(nav => {
        nav.addEventListener('click', (e) => {
            e.preventDefault();
            showView(nav.dataset.view);
        });
    });
    
    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.location.href = 'index.html';
        });
    }
    
    // Generate Invoice
    const generateBtn = document.getElementById('generateBtn');
    if (generateBtn) {
        generateBtn.addEventListener('click', generateInvoice);
    }
    
    // Modal close
    const closePreview = document.getElementById('closePreview');
    if (closePreview) {
        closePreview.addEventListener('click', () => {
            document.getElementById('previewModal').classList.add('hidden');
        });
    }
    
    // Edit button
    const editBtn = document.getElementById('editBtn');
    if (editBtn) {
        editBtn.addEventListener('click', () => {
            document.getElementById('previewModal').classList.add('hidden');
        });
    }
    
    // Modal buttons
    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadPDF);
    }
    
    const sendBtn = document.getElementById('sendBtn');
    if (sendBtn) {
        sendBtn.addEventListener('click', sendInvoice);
    }
    
    // Character counter for textarea
    const invoiceInput = document.getElementById('invoiceInput');
    const charCount = document.getElementById('charCount');
    if (invoiceInput && charCount) {
        invoiceInput.addEventListener('input', () => {
            const count = invoiceInput.value.length;
            charCount.textContent = `${count} caractère${count > 1 ? 's' : ''}`;
        });
    }
}

// ============================================
// GÉNÉRATION DE FACTURE (API VERCEL)
// ============================================

async function generateInvoice() {
    const input = document.getElementById('invoiceInput');
    const prompt = input.value.trim();
    
    if (!prompt) {
        showError('Merci de décrire ta facture');
        return;
    }
    
    const btn = document.getElementById('generateBtn');
    const loader = document.getElementById('loader');
    const form = document.querySelector('.generator-form');
    
    btn.disabled = true;
    btn.innerHTML = '<span>⏳ Génération en cours...</span>';
    loader.classList.remove('hidden');
    if (form) form.style.display = 'none';
    hideError();
    
    // Animer les étapes
    animateLoaderSteps();
    
    try {
        console.log('🚀 Appel API Vercel Perplexity...');
        
        // ✅ APPELER L'API VERCEL EN PRODUCTION
        const response = await fetch('https://paynote-v2-amm6nm6u9-destroya2s-projects.vercel.app/api/generate-invoice', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ description: prompt })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erreur de génération');
        }
        
        const invoiceData = await response.json();
        console.log('✅ Données reçues de l\'API:', invoiceData);
        
        // Générer le numéro de facture
        let invoiceNumber;
        try {
            const { data: numberData, error: numberError } = await supabase
                .rpc('generate_invoice_number', { user_id: currentUser.id });
            
            if (numberError) throw numberError;
            invoiceNumber = numberData;
        } catch (rpcError) {
            console.warn('⚠️ RPC generate_invoice_number not available, using fallback');
            invoiceNumber = generateInvoiceNumber();
        }
        
        // Préparer les données complètes
        currentInvoiceData = {
            ...invoiceData,
            invoice_number: invoiceNumber,
            user_id: currentUser.id
        };
        
        console.log('✅ Facture complète:', currentInvoiceData);
        
        // Afficher l'aperçu
        displayInvoicePreview(currentInvoiceData);
        document.getElementById('previewModal').classList.remove('hidden');
        
        // Réinitialiser le formulaire
        input.value = '';
        const charCount = document.getElementById('charCount');
        if (charCount) {
            charCount.textContent = '0 caractère';
        }
        
        showSuccess('✅ Facture générée avec succès !');
        
    } catch (error) {
        console.error('❌ Erreur génération:', error);
        showError('Erreur lors de la génération: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="currentColor"/></svg><span>Générer ma facture</span>';
        loader.classList.add('hidden');
        if (form) form.style.display = 'block';
    }
}

// Animer les étapes du loader
function animateLoaderSteps() {
    const steps = document.querySelectorAll('.step-item');
    steps.forEach((step, index) => {
        step.classList.remove('active');
        setTimeout(() => {
            step.classList.add('active');
        }, index * 700);
    });
}

// ============================================
// AFFICHER L'APERÇU
// ============================================

function displayInvoicePreview(invoice) {
    const html = `
        <div class="invoice-preview">
            <div class="invoice-header">
                <div>
                    <div class="invoice-number">${invoice.invoice_number}</div>
                    <p style="color: #6B7280; margin-top: 8px;">Date d'émission: ${formatDate(invoice.issue_date)}</p>
                    <p style="color: #6B7280;">Date d'échéance: ${formatDate(invoice.due_date)}</p>
                </div>
                <div style="text-align: right;">
                    <h2 style="font-size: 32px; font-weight: 800; color: #1F2937;">FACTURE</h2>
                </div>
            </div>
            
            <div class="invoice-section">
                <h3>CLIENT</h3>
                <p><strong>${invoice.client_name}</strong></p>
                ${invoice.client_company ? `<p>${invoice.client_company}</p>` : ''}
                ${invoice.client_email ? `<p>${invoice.client_email}</p>` : ''}
            </div>
            
            <div class="invoice-section">
                <h3>DÉTAILS DE LA PRESTATION</h3>
                <table class="invoice-table">
                    <thead>
                        <tr>
                            <th style="text-align: left;">Description</th>
                            <th style="text-align: right;">Quantité</th>
                            <th style="text-align: right;">Prix unitaire</th>
                            <th style="text-align: right;">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${invoice.items.map(item => `
                            <tr>
                                <td>
                                    <strong>${item.description}</strong>
                                </td>
                                <td style="text-align: right;">${item.quantity}</td>
                                <td style="text-align: right;">${formatCurrency(item.unit_price, invoice.currency)}</td>
                                <td style="text-align: right;">${formatCurrency(item.total, invoice.currency)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <div style="text-align: right; margin-top: 32px; padding: 24px; background: #F9FAFB; border-radius: 12px;">
                <p class="invoice-total" style="font-size: 28px; font-weight: 800; color: #6366F1;">
                    Total: ${formatCurrency(invoice.total, invoice.currency)}
                </p>
            </div>
            
            ${invoice.notes ? `
                <div class="invoice-section">
                    <h3>NOTES</h3>
                    <p>${invoice.notes}</p>
                </div>
            ` : ''}
        </div>
    `;
    
    document.getElementById('previewContent').innerHTML = html;
}

// ============================================
// TÉLÉCHARGER PDF
// ============================================

async function downloadPDF() {
    if (!currentInvoiceData) {
        showErrorToast('Aucune facture à télécharger');
        return;
    }
    
    const downloadBtn = document.getElementById('downloadBtn');
    const originalText = downloadBtn.textContent;
    downloadBtn.disabled = true;
    downloadBtn.textContent = 'Génération PDF...';
    
    try {
        console.log('📄 Génération du PDF...');
        
        // Vérifier si generateInvoicePDF existe
        if (typeof generateInvoicePDF === 'function') {
            // Générer le PDF
            const pdfBlob = await generateInvoicePDF(currentInvoiceData, currentUser);
            
            // Upload to Supabase Storage
            const fileName = `${currentInvoiceData.invoice_number}.pdf`;
            const { error: uploadError } = await supabase.storage
                .from('invoices')
                .upload(`${currentUser.id}/${fileName}`, pdfBlob, {
                    upsert: true,
                    contentType: 'application/pdf'
                });
            
            if (uploadError && !uploadError.message.includes('already exists')) {
                throw uploadError;
            }
            
            // Get public URL
            const { data: urlData } = supabase.storage
                .from('invoices')
                .getPublicUrl(`${currentUser.id}/${fileName}`);
            
            currentInvoiceData.pdf_url = urlData.publicUrl;
            
            // Download file
            const url = URL.createObjectURL(pdfBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } else {
            console.warn('⚠️ generateInvoicePDF non disponible, sauvegarde uniquement');
        }
        
        // Save to database
        await saveInvoice(currentInvoiceData);
        
        showSuccess('✅ Facture sauvegardée avec succès !');
        document.getElementById('previewModal').classList.add('hidden');
        showView('history');
        await loadInvoices();
        await loadUserProfile();
        
    } catch (error) {
        console.error('❌ Erreur téléchargement:', error);
        showErrorToast('Erreur lors du téléchargement: ' + error.message);
    } finally {
        downloadBtn.disabled = false;
        downloadBtn.textContent = originalText;
    }
}

// ============================================
// ENVOYER PAR EMAIL
// ============================================

async function sendInvoice() {
    if (!currentInvoiceData) {
        showErrorToast('Aucune facture à envoyer');
        return;
    }
    
    if (!currentInvoiceData.client_email) {
        showErrorToast('❌ Email client manquant. Veuillez ajouter un email dans votre description.');
        return;
    }
    
    const sendBtn = document.getElementById('sendBtn');
    const originalText = sendBtn.textContent;
    sendBtn.disabled = true;
    sendBtn.textContent = '📧 Envoi en cours...';
    
    try {
        console.log('📧 Envoi de la facture par email...');
        
        // Générer le PDF si la fonction existe
        let pdfUrl = currentInvoiceData.pdf_url;
        
        if (typeof generateInvoicePDF === 'function') {
            const pdfBlob = await generateInvoicePDF(currentInvoiceData, currentUser);
            const fileName = `${currentInvoiceData.invoice_number}.pdf`;
            
            // Upload PDF to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('invoices')
                .upload(`${currentUser.id}/${fileName}`, pdfBlob, {
                    upsert: true,
                    contentType: 'application/pdf'
                });
            
            if (uploadError && !uploadError.message.includes('already exists')) {
                throw uploadError;
            }
            
            // Get public URL
            const { data: urlData } = supabase.storage
                .from('invoices')
                .getPublicUrl(`${currentUser.id}/${fileName}`);
            
            pdfUrl = urlData.publicUrl;
            currentInvoiceData.pdf_url = pdfUrl;
        }
        
        currentInvoiceData.status = 'sent';
        
        // Save invoice to database
        await saveInvoice(currentInvoiceData);
        
        // Send email via Vercel Function (si disponible)
        try {
            const response = await fetch('https://paynote-v2-amm6nm6u9-destroya2s-projects.vercel.app/api/send-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    to: currentInvoiceData.client_email,
                    invoice_number: currentInvoiceData.invoice_number,
                    pdf_url: pdfUrl,
                    client_name: currentInvoiceData.client_name
                })
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('✅ Email sent:', result);
            } else {
                console.warn('⚠️ Email API non disponible');
            }
        } catch (emailError) {
            console.warn('⚠️ Impossible d\'envoyer l\'email, mais facture sauvegardée:', emailError);
        }
        
        showSuccess('✅ Facture envoyée avec succès !');
        document.getElementById('previewModal').classList.add('hidden');
        showView('history');
        await loadInvoices();
        await loadUserProfile();
        
    } catch (error) {
        console.error('❌ Erreur envoi:', error);
        showErrorToast('Erreur lors de l\'envoi: ' + error.message);
    } finally {
        sendBtn.disabled = false;
        sendBtn.textContent = originalText;
    }
}

// ============================================
// SAUVEGARDER DANS LA BASE
// ============================================

async function saveInvoice(invoiceData) {
    try {
        console.log('💾 Sauvegarde de la facture...');
        
        // Vérifier si existe déjà
        const { data: existingInvoice } = await supabase
            .from('invoices')
            .select('id')
            .eq('invoice_number', invoiceData.invoice_number)
            .eq('user_id', invoiceData.user_id)
            .single();
        
        if (existingInvoice) {
            // Mettre à jour
            const { error } = await supabase
                .from('invoices')
                .update({
                    status: invoiceData.status,
                    pdf_url: invoiceData.pdf_url,
                    sent_at: invoiceData.status === 'sent' ? new Date().toISOString() : null
                })
                .eq('id', existingInvoice.id);
            
            if (error) throw error;
            console.log('✅ Facture mise à jour');
        } else {
            // Créer nouvelle facture
            const { error } = await supabase
                .from('invoices')
                .insert([{
                    user_id: invoiceData.user_id,
                    invoice_number: invoiceData.invoice_number,
                    client_name: invoiceData.client_name,
                    client_email: invoiceData.client_email || '',
                    client_company: invoiceData.client_company || '',
                    issue_date: invoiceData.issue_date,
                    due_date: invoiceData.due_date,
                    currency: invoiceData.currency || 'EUR',
                    subtotal: invoiceData.subtotal,
                    total: invoiceData.total,
                    items: invoiceData.items,
                    notes: invoiceData.notes || '',
                    status: invoiceData.status || 'draft',
                    pdf_url: invoiceData.pdf_url || null,
                    sent_at: invoiceData.status === 'sent' ? new Date().toISOString() : null
                }]);
            
            if (error) throw error;
            
            // Mettre à jour le compteur utilisateur
            try {
                const { error: updateError } = await supabase
                    .rpc('increment', {
                        row_id: currentUser.id,
                        x: 1
                    });
                
                if (updateError) {
                    console.warn('⚠️ Erreur increment RPC, fallback manuel');
                    // Fallback manuel
                    const { data: userData } = await supabase
                        .from('users')
                        .select('invoice_count')
                        .eq('id', currentUser.id)
                        .single();
                    
                    if (userData) {
                        await supabase
                            .from('users')
                            .update({ invoice_count: userData.invoice_count + 1 })
                            .eq('id', currentUser.id);
                    }
                }
            } catch (countError) {
                console.error('❌ Erreur update count:', countError);
            }
            
            console.log('✅ Facture créée');
        }
    } catch (error) {
        console.error('❌ Erreur sauvegarde:', error);
        throw error;
    }
}

// ============================================
// CHARGER L'HISTORIQUE
// ============================================

async function loadInvoices() {
    try {
        const { data, error } = await supabase
            .from('invoices')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        displayInvoices(data);
        
    } catch (error) {
        console.error('❌ Erreur chargement factures:', error);
    }
}

// ============================================
// AFFICHER LA LISTE
// ============================================

function displayInvoices(invoices) {
    const listDiv = document.getElementById('invoicesList');
    
    if (!invoices || invoices.length === 0) {
        listDiv.innerHTML = `
            <div class="empty-state">
                <span class="icon">📄</span>
                <p>Aucune facture pour le moment</p>
                <button class="btn-primary" onclick="showView('generator')">Créer ma première facture</button>
            </div>
        `;
        return;
    }
    
    const html = invoices.map(inv => `
        <div class="invoice-card" onclick="viewInvoice('${inv.id}')">
            <div class="invoice-card-info">
                <h3>${inv.invoice_number}</h3>
                <p>${inv.client_name} • ${formatDate(inv.issue_date)}</p>
            </div>
            <div class="invoice-card-meta">
                <span class="invoice-status ${inv.status}">${getStatusText(inv.status)}</span>
                <div class="invoice-amount">${formatCurrency(inv.total, inv.currency)}</div>
            </div>
        </div>
    `).join('');
    
    listDiv.innerHTML = html;
}

function getStatusText(status) {
    const statuses = {
        draft: 'Brouillon',
        sent: 'Envoyée',
        paid: 'Payée',
        overdue: 'En retard'
    };
    return statuses[status] || status;
}

async function viewInvoice(id) {
    try {
        const { data: invoice, error } = await supabase
            .from('invoices')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) throw error;
        
        if (invoice.pdf_url) {
            // Open PDF in new tab
            window.open(invoice.pdf_url, '_blank');
        } else {
            showErrorToast('PDF non disponible pour cette facture');
        }
    } catch (error) {
        console.error('❌ Erreur ouverture facture:', error);
        showErrorToast('Erreur lors de l\'ouverture de la facture');
    }
}

// ============================================
// INITIALISATION AU CHARGEMENT
// ============================================

if (window.location.pathname.includes('app.html')) {
    document.addEventListener('DOMContentLoaded', initApp);
}

console.log('✅ App.js chargé (API Vercel Production)');
