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
    console.log('=== Testando Inserção Direta na Tabela sales ===');
    
    const saleData = {
        photo_id: 'b8b0ead7-9347-4942-aa2e-e71db61d8a58',
        buyer_id: '353f7b67-98a1-429e-98f1-7908ea06d85a',
        buyer_name: 'Daian Cliente',
        price: 1.00,
        commission: 0.56,
        photographer_id: '394d208c-07b3-49aa-a04b-63630cb85bb7',
        commission_rate: 0.06,
        sale_date: new Date().toISOString(),
        billing_id: 'bill_xarNnNx6aHpLdTnPKTFfS5ba'
    };

    console.log('Dados a serem inseridos:', JSON.stringify(saleData, null, 2));

    const { data, error } = await supabase
        .from('sales')
        .insert(saleData)
        .select();

    if (error) {
        console.error('ERRO ao inserir na tabela sales:', error);
    } else {
        console.log('SUCESSO ao inserir na tabela sales:', JSON.stringify(data, null, 2));
        
        // Remove a venda inserida no teste para não bagunçar o banco
        const { error: delError } = await supabase
            .from('sales')
            .delete()
            .eq('id', data[0].id);
        
        if (delError) {
            console.error('Erro ao deletar venda de teste:', delError);
        } else {
            console.log('Venda de teste limpa do banco com sucesso.');
        }
    }
}

run();
