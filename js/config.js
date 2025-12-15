// ⚠️ REMPLACER PAR VOS VRAIES CLÉS SUPABASE
const SUPABASE_URL = 'https://waczgbtdiigoniavoyoh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhY3pnYnRkaWlnb25pYXZveW9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU3MzU5MjIsImV4cCI6MjA4MTMxMTkyMn0.hOgEi-Q1gIRN7BxF1rTjRq_aZOn4_MQHv7Avrx7kZ5o';
const PERPLEXITY_API_KEY = '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';

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
