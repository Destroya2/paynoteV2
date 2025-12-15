// ⚠️ REMPLACER PAR VOS VRAIES CLÉS SUPABASE

// Initialiser Supabase Client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Configuration
const CONFIG = {
    plans: {
        free: { limit: 5, price: 0 },
        pro: { limit: Infinity, price: 4 },
        premium: { limit: Infinity, price: 9 }
    }
};
