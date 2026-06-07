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
    console.log('=== Buscando Usuários cadastrados com Daian ou Felipe ===');
    
    const { data: users, error } = await supabase
        .from('users')
        .select('id, name, email, role, created_at')
        .or('email.ilike.%daian%,email.ilike.%felipe%');

    if (error) {
        console.error('Erro ao buscar usuários:', error);
        return;
    }

    console.log(`Encontrados ${users.length} usuários:`);
    users.forEach(u => {
        console.log(`- ID: ${u.id} | Nome: ${u.name} | Email: ${u.email} | Role: ${u.role} | Criado em: ${u.created_at}`);
    });
}

run();
