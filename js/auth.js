// ============================================
// AUTH.JS - PAYNOTE
// Gestion de l'authentification avec Supabase
// ============================================

// Login Form
if (document.getElementById('loginForm')) {
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('error');
        const btn = document.getElementById('loginBtn');
        
        // Désactiver le bouton pendant la connexion
        btn.disabled = true;
        const originalContent = btn.innerHTML;
        btn.innerHTML = '<span>Connexion en cours...</span>';
        errorDiv.classList.add('hidden');
        
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });
            
            if (error) throw error;
            
            // Connexion réussie - redirection
            window.location.href = 'app.html';
            
        } catch (error) {
            console.error('Login error:', error);
            
            // Afficher l'erreur
            const errorSpan = errorDiv.querySelector('span');
            if (errorSpan) {
                errorSpan.textContent = 'Email ou mot de passe incorrect';
            } else {
                errorDiv.textContent = 'Email ou mot de passe incorrect';
            }
            errorDiv.classList.remove('hidden');
            
            // Réactiver le bouton
            btn.disabled = false;
            btn.innerHTML = originalContent;
        }
    });
}

// Register Form
if (document.getElementById('registerForm')) {
    document.getElementById('registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const fullName = document.getElementById('fullName').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const terms = document.getElementById('terms');
        const errorDiv = document.getElementById('error');
        const btn = document.getElementById('registerBtn');
        
        // Vérifier les conditions d'utilisation
        if (terms && !terms.checked) {
            const errorSpan = errorDiv.querySelector('span');
            if (errorSpan) {
                errorSpan.textContent = 'Vous devez accepter les conditions d\'utilisation';
            } else {
                errorDiv.textContent = 'Vous devez accepter les conditions d\'utilisation';
            }
            errorDiv.classList.remove('hidden');
            return;
        }
        
        // Désactiver le bouton pendant l'inscription
        btn.disabled = true;
        const originalContent = btn.innerHTML;
        btn.innerHTML = '<span>Création du compte...</span>';
        errorDiv.classList.add('hidden');
        
        try {
            // Créer l'utilisateur avec les métadonnées
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        full_name: fullName
                    }
                }
            });
            
            if (authError) throw authError;
            
            // ✅ LE TRIGGER CRÉE AUTOMATIQUEMENT LE PROFIL DANS LA TABLE USERS
            // Pas besoin d'insert manuel !
            
            console.log('Compte créé avec succès:', authData.user.id);
            
            // Attendre un peu pour que le trigger s'exécute
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Redirection vers l'application
            window.location.href = 'app.html';
            
        } catch (error) {
            console.error('Registration error:', error);
            
            // Afficher l'erreur
            const errorSpan = errorDiv.querySelector('span');
            let errorMessage = error.message || 'Une erreur est survenue';
            
            // Messages d'erreur personnalisés
            if (error.message.includes('already registered')) {
                errorMessage = 'Cet email est déjà utilisé';
            } else if (error.message.includes('Password should be')) {
                errorMessage = 'Le mot de passe doit contenir au moins 6 caractères';
            } else if (error.message.includes('Invalid email')) {
                errorMessage = 'Format d\'email invalide';
            }
            
            if (errorSpan) {
                errorSpan.textContent = errorMessage;
            } else {
                errorDiv.textContent = errorMessage;
            }
            errorDiv.classList.remove('hidden');
            
            // Réactiver le bouton
            btn.disabled = false;
            btn.innerHTML = originalContent;
        }
    });
}

// Check Auth Status
async function checkAuth() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) throw error;
        
        // Pages publiques (accessibles sans authentification)
        const publicPages = ['index.html', 'login.html', 'register.html', ''];
        const currentPage = window.location.pathname.split('/').pop();
        
        // Si pas connecté et sur une page protégée -> redirection login
        if (!user && !publicPages.includes(currentPage)) {
            console.log('Non authentifié - redirection vers login');
            window.location.href = 'login.html';
            return;
        }
        
        // Si connecté et sur une page publique (login/register) -> redirection app
        if (user && (currentPage === 'login.html' || currentPage === 'register.html')) {
            console.log('Déjà authentifié - redirection vers app');
            window.location.href = 'app.html';
            return;
        }
        
        // Si connecté et sur l'app, vérifier que le profil existe
        if (user && (currentPage === 'app.html' || currentPage === 'profile.html')) {
            await ensureUserProfile(user);
        }
        
    } catch (error) {
        console.error('Auth check error:', error);
        
        // En cas d'erreur, rediriger vers login si on n'est pas sur une page publique
        const publicPages = ['index.html', 'login.html', 'register.html', ''];
        const currentPage = window.location.pathname.split('/').pop();
        
        if (!publicPages.includes(currentPage)) {
            window.location.href = 'login.html';
        }
    }
}

// Vérifier et créer le profil utilisateur si nécessaire
async function ensureUserProfile(user) {
    try {
        // Vérifier si le profil existe
        const { data: profile, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();
        
        // Si le profil n'existe pas (cas rare où le trigger n'a pas fonctionné)
        if (error && error.code === 'PGRST116') {
            console.log('Profil inexistant - création manuelle...');
            
            const { error: insertError } = await supabase
                .from('users')
                .insert([{
                    id: user.id,
                    email: user.email,
                    full_name: user.user_metadata?.full_name || '',
                    plan: 'free',
                    invoice_limit: 5,
                    invoice_count: 0
                }]);
            
            if (insertError) {
                console.error('Erreur création profil:', insertError);
            } else {
                console.log('Profil créé avec succès');
            }
        }
    } catch (error) {
        console.error('Erreur vérification profil:', error);
    }
}

// Logout Function (utilisée dans app.html et profile.html)
async function logout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout error:', error);
        alert('Erreur lors de la déconnexion');
    }
}

// Event listeners pour les boutons de déconnexion
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
});

// Run auth check on page load
if (typeof supabase !== 'undefined') {
    checkAuth();
} else {
    console.error('Supabase n\'est pas initialisé. Vérifiez config.js');
}

// Listen for auth state changes
if (typeof supabase !== 'undefined') {
    supabase.auth.onAuthStateChange((event, session) => {
        console.log('Auth state changed:', event);
        
        if (event === 'SIGNED_IN') {
            console.log('Utilisateur connecté:', session.user.email);
        }
        
        if (event === 'SIGNED_OUT') {
            console.log('Utilisateur déconnecté');
            const publicPages = ['index.html', 'login.html', 'register.html', ''];
            const currentPage = window.location.pathname.split('/').pop();
            
            if (!publicPages.includes(currentPage)) {
                window.location.href = 'login.html';
            }
        }
        
        if (event === 'USER_UPDATED') {
            console.log('Utilisateur mis à jour');
        }
    });
}
