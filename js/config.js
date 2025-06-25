// Supabase configuration
const supabaseConfig = {
    url: 'https://fkhqjzzqbypkwrpnldgk.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZraHFqenpxYnlwa3dycG5sZGdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc2MzM0OTAsImV4cCI6MjA2MzIwOTQ5MH0.O5LjcwITJT3hIbnNnXJNYYYPDeOGBKkLmU6EyUUY478'
};

// Create Supabase client
const { createClient } = supabase;
const supabaseClient = createClient(supabaseConfig.url, supabaseConfig.key);

export { supabaseConfig, supabaseClient }; 