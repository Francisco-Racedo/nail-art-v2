const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/['"]/g, '');
    }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
    console.log("Updating to 60...");
    const { error: updErr } = await supabase.from('config').update({ intervalo_minutos: 60 }).eq('id', 1);
    console.log("Update Error:", updErr);

    const { data, error } = await supabase.from('config').select('*');
    console.log("DATA:", data);
}
run();
