const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Ler o .env.local e jogar no process.env
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

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log('--- Lendo Tabela system_settings ---');
    const { data, error } = await supabase
        .from('system_settings')
        .select('*');

    if (error) {
        console.error('Erro ao buscar system_settings:', error);
        return;
    }

    console.log('Quantidade de linhas:', data.length);
    if (data.length > 0) {
        data.forEach(row => {
            console.log(`ID: ${row.id}`);
            console.log(`Commission Default Rate: ${row.commission_default_rate}`);
            console.log(`Has email_templates: ${!!row.email_templates}`);
            console.log(`Keys do email_templates:`, row.email_templates ? Object.keys(row.email_templates) : 'null');
            console.log(`Templates detail:`, JSON.stringify(row.email_templates, null, 2));
        });
    }
}

run();
