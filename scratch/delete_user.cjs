const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Erro: VITE_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não definidos em .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteEmail(targetEmail) {
    console.log(`\n--- Iniciando remoção do usuário: ${targetEmail} ---`);

    // 1. Buscar usuário na tabela 'users' para obter o ID
    const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('id, email, name')
        .eq('email', targetEmail)
        .maybeSingle();

    if (profileError) {
        console.error('Erro ao buscar perfil do usuário:', profileError);
    }

    let userId = userProfile ? userProfile.id : null;

    // 2. Se não encontrou na tabela 'users', tentar buscar na auth.users (usando API Admin)
    if (!userId) {
        console.log('Usuário não localizado na tabela users. Buscando via API Admin do Supabase Auth...');
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) {
            console.error('Erro ao listar usuários no Auth:', listError);
        } else {
            const foundUser = users.find(u => u.email === targetEmail);
            if (foundUser) {
                userId = foundUser.id;
                console.log(`Usuário encontrado no Auth. ID: ${userId}`);
            }
        }
    } else {
        console.log(`Usuário localizado. ID: ${userId}, Nome: ${userProfile.name}`);
    }

    if (!userId) {
        console.log('Usuário não foi encontrado na base de dados (nem no Auth nem em users).');
        return;
    }

    // 3. Deletar do perfil users
    console.log(`Removendo registro da tabela 'users' para o ID: ${userId}...`);
    const { error: deleteProfileError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

    if (deleteProfileError) {
        console.warn('Erro ao deletar da tabela users (pode ser que não exista mais):', deleteProfileError);
    } else {
        console.log('Remoção da tabela users concluída.');
    }

    // 4. Deletar do Auth do Supabase
    console.log(`Removendo usuário do Supabase Auth para o ID: ${userId}...`);
    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
        console.error('Erro ao deletar usuário do Supabase Auth:', deleteAuthError);
    } else {
        console.log(`Usuário ${targetEmail} deletado com sucesso do Supabase Auth!`);
    }
}

async function run() {
    const emails = ['mentorcrm@gmail.com', 'mentorcrm26@gmail.com'];
    for (const email of emails) {
        await deleteEmail(email);
    }
}

run();
