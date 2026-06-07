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
    console.error('Erro: Credenciais do Supabase ausentes no .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const photoId = 'b8b0ead7-9347-4942-aa2e-e71db61d8a58';
    console.log(`=== Verificando Existência da Foto ID: ${photoId} ===`);
    
    const { data: photo, error } = await supabase
        .from('photos')
        .select('id, title, photographer_id, price')
        .eq('id', photoId)
        .maybeSingle();

    if (error) {
        console.error('Erro ao buscar foto:', error);
        return;
    }

    if (photo) {
        console.log('Foto encontrada!');
        console.log('Dados da Foto:', JSON.stringify(photo, null, 2));
    } else {
        console.log('FOTO NÃO ENCONTRADA no banco de dados!');
    }
}

run();
