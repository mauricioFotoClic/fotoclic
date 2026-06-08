const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

try {
    const envPath = path.join(__dirname, '..', '.env.local');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
            const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
            if (match) {
                const key = match[1];
                let value = match[2] || '';
                if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
                if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
                process.env[key] = value;
            }
        });
    }
} catch (e) {
    console.error('Erro ao ler .env.local', e);
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Erro: Credenciais do Supabase ausentes');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const photoIds = ['56de1621-3b4a-42fc-8cf1-04999d9fef1f', '5f91b8f8-7cdf-40a3-bfa8-317c10391bdd'];
    console.log(`=== Inspecionando Fotos: ${photoIds.join(', ')} ===`);

    const { data: photos, error } = await supabase
        .from('photos')
        .select('id, title, photographer_id, price')
        .in('id', photoIds);

    if (error) {
        console.error('Erro ao buscar fotos:', error);
        return;
    }

    console.log(`Encontradas ${photos.length} fotos:`);
    for (const p of photos) {
        const { data: photog } = await supabase.from('users').select('name, email').eq('id', p.photographer_id).single();
        console.log(`- Foto ID: ${p.id} | Título: ${p.title} | Fotógrafo: ${photog?.name} (${photog?.email}) | Preço: ${p.price}`);
    }
}

run();
