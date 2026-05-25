/**
 * fix_file_sizes.js
 *
 * Corrige o campo file_size_bytes de todas as fotos existentes no banco,
 * consultando o tamanho real dos arquivos no Supabase Storage (bucket photos-original).
 *
 * Regra: fotos acima de 15MB foram comprimidas antes do upload, então o tamanho
 * armazenado pode estar incorreto (tamanho original ao invés do comprimido).
 * Este script busca o tamanho real do arquivo no Storage e atualiza o banco.
 *
 * Usage: node scripts/fix_file_sizes.js
 * Requer: VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local
 */

import 'dotenv/config';
import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

// Carrega o .env.local manualmente se dotenv nao encontrar
function loadEnvLocal() {
    try {
        const content = readFileSync('.env.local', 'utf8');
        for (const line of content.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const idx = trimmed.indexOf('=');
            if (idx === -1) continue;
            const key = trimmed.substring(0, idx).trim();
            const val = trimmed.substring(idx + 1).trim();
            if (!process.env[key]) process.env[key] = val;
        }
    } catch {
        // .env.local nao existe, continua com as variaveis ja carregadas
    }
}

loadEnvLocal();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Erro: VITE_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY nao encontrados.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log('=== Fix File Sizes - FotoClic ===\n');

    // 1. Busca todos os tamanhos reais dos arquivos no storage via SQL
    console.log('Buscando tamanhos dos arquivos no Supabase Storage...');
    const { data: storageFiles, error: storageError } = await supabase.rpc('get_storage_file_sizes');

    let storageSizeMap = new Map();

    if (storageError || !storageFiles) {
        // RPC nao existe, usa abordagem alternativa via query direta
        console.log('RPC nao disponivel, usando query SQL direta...');
        const { data: objects, error: objError } = await supabase
            .from('storage.objects')
            .select('name, metadata')
            .eq('bucket_id', 'photos-original');

        if (objError) {
            // Tenta via rpc raw sql
            console.log('Tentando via SQL raw...');
            const { data: rawData, error: rawError } = await supabase.rpc('exec_sql', {
                sql: "SELECT name, (metadata->>'size')::bigint as size FROM storage.objects WHERE bucket_id = 'photos-original'"
            });

            if (rawError || !rawData) {
                console.log('Usando listagem por pasta (mais lento)...');
                storageSizeMap = null; // sinaliza para usar list
            } else {
                for (const row of rawData) {
                    if (row.size) storageSizeMap.set(row.name, parseInt(row.size));
                }
            }
        } else if (objects) {
            for (const obj of objects) {
                const size = obj.metadata?.size;
                if (size) storageSizeMap.set(obj.name, parseInt(size));
            }
        }
    } else {
        for (const row of storageFiles) {
            if (row.size) storageSizeMap.set(row.name, parseInt(row.size));
        }
    }

    // 2. Busca todas as fotos (nao videos) do banco
    console.log('Buscando fotos no banco de dados...');
    let allPhotos = [];
    let page = 0;
    const pageSize = 1000;

    while (true) {
        const { data, error } = await supabase
            .from('photos')
            .select('id, file_url, file_size_bytes, media_type')
            .not('media_type', 'eq', 'video')
            .not('file_url', 'is', null)
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) {
            console.error('Erro ao buscar fotos:', error.message);
            process.exit(1);
        }
        if (!data || data.length === 0) break;
        allPhotos = allPhotos.concat(data);
        if (data.length < pageSize) break;
        page++;
    }

    // Filtra apenas fotos (nao videos do Cloudflare que tem URL externa)
    const photos = allPhotos.filter(p =>
        p.file_url &&
        !p.file_url.startsWith('http') &&
        !p.file_url.startsWith('https')
    );

    console.log(`Total de fotos para processar: ${photos.length}\n`);

    if (photos.length === 0) {
        console.log('Nenhuma foto encontrada para atualizar.');
        return;
    }

    // 3. Para cada foto, obtém o tamanho real e atualiza
    let updated = 0;
    let skipped = 0;
    let notFound = 0;
    let errors = 0;

    const BATCH_SIZE = 50;

    for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const fileUrl = photo.file_url; // ex: "user_id/event_id/filename-original.jpg"

        let realSize = null;

        if (storageSizeMap && storageSizeMap.has(fileUrl)) {
            // Achou no mapa de storage
            realSize = storageSizeMap.get(fileUrl);
        } else {
            // Fallback: consulta via storage list para este arquivo especificamente
            const lastSlash = fileUrl.lastIndexOf('/');
            const folder = lastSlash >= 0 ? fileUrl.substring(0, lastSlash) : '';
            const filename = lastSlash >= 0 ? fileUrl.substring(lastSlash + 1) : fileUrl;

            const { data: fileList, error: listError } = await supabase.storage
                .from('photos-original')
                .list(folder, { search: filename, limit: 5 });

            if (listError || !fileList || fileList.length === 0) {
                notFound++;
                if ((notFound + errors) <= 10) {
                    console.warn(`  [NAO ENCONTRADO] ${fileUrl}`);
                }
                continue;
            }

            const fileInfo = fileList.find(f => f.name === filename);
            if (!fileInfo) {
                notFound++;
                continue;
            }
            realSize = fileInfo.metadata?.size;
        }

        if (!realSize) {
            notFound++;
            continue;
        }

        // Verifica se o valor mudou (evita updates desnecessarios)
        if (photo.file_size_bytes === realSize) {
            skipped++;
            continue;
        }

        const { error: updateError } = await supabase
            .from('photos')
            .update({ file_size_bytes: realSize })
            .eq('id', photo.id);

        if (updateError) {
            errors++;
            console.error(`  [ERRO] Foto ${photo.id}: ${updateError.message}`);
        } else {
            updated++;
            const oldMB = photo.file_size_bytes ? (photo.file_size_bytes / 1024 / 1024).toFixed(2) : '?';
            const newMB = (realSize / 1024 / 1024).toFixed(2);
            if (updated <= 20 || oldMB !== newMB) {
                console.log(`  [OK] ${fileUrl} | antes: ${oldMB} MB → agora: ${newMB} MB`);
            }
        }

        // Progresso a cada BATCH_SIZE fotos
        if ((i + 1) % BATCH_SIZE === 0) {
            console.log(`  Progresso: ${i + 1}/${photos.length} fotos processadas...`);
        }
    }

    console.log('\n=== Resultado ===');
    console.log(`Atualizadas:    ${updated}`);
    console.log(`Sem mudanca:    ${skipped}`);
    console.log(`Nao encontradas: ${notFound}`);
    console.log(`Erros:          ${errors}`);
    console.log('\nConcluido!');
}

main().catch(err => {
    console.error('Erro fatal:', err);
    process.exit(1);
});
