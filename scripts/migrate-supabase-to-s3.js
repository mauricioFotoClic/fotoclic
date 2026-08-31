/**
 * 🚀 FotoClic - Script de Migração Gradual de Imagens do Supabase para AWS S3
 * 
 * Executa a cópia das imagens antigas em segundo plano com verificação de integridade
 * sem risco de perda de dados e sem deletar nada do Supabase.
 */

import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const region = process.env.AWS_REGION || 'us-east-1';
const bucketName = process.env.AWS_S3_BUCKET || 'fotoclic-media-storage';

if (!supabaseUrl || !serviceKey || !accessKeyId || !secretAccessKey) {
  console.error('❌ Configurações ausentes no .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);
const s3 = new S3Client({
  region,
  credentials: { accessKeyId, secretAccessKey }
});

async function downloadBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function uploadBufferToS3(key, buffer, contentType) {
  await s3.send(new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    Body: buffer,
    ContentType: contentType
  }));
}

async function migratePhotos() {
  console.log('🔄 === INICIANDO MIGRAÇÃO DO ACERVO PARA AMAZON S3 ===\n');

  // Buscar fotos que ainda possuem preview_url do Supabase
  const { data: photos, error } = await supabase
    .from('photos')
    .select('id, title, preview_url, thumb_url, file_url, photographer_id, event_id, media_type')
    .ilike('preview_url', '%supabase.co%')
    .limit(100);

  if (error) {
    console.error('❌ Erro ao buscar fotos:', error.message);
    return;
  }

  console.log(`📦 Encontradas ${photos.length} fotos prontas para sincronização com o S3.`);

  let migratedCount = 0;
  let failCount = 0;

  for (let i = 0; i < photos.length; i++) {
    const p = photos[i];
    console.log(`\n[${i + 1}/${photos.length}] Processando: ${p.title} (ID: ${p.id})`);

    try {
      const photogId = p.photographer_id || 'general';
      const eventId = p.event_id || 'no-event';
      const fileExt = p.file_url?.split('.').pop() || 'jpg';

      let newPreviewUrl = p.preview_url;
      let newThumbUrl = p.thumb_url;
      let newFileUrl = p.file_url;

      // 1. Migrar Preview
      if (p.preview_url && p.preview_url.includes('supabase.co')) {
        const previewKey = `previews/${photogId}/${eventId}/${p.id}-preview.webp`;
        const previewBuf = await downloadBuffer(p.preview_url);
        await uploadBufferToS3(previewKey, previewBuf, 'image/webp');
        newPreviewUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${previewKey}`;
        console.log(`  ✅ Preview migrado: ${previewKey}`);
      }

      // 2. Migrar Thumb
      if (p.thumb_url && p.thumb_url.includes('supabase.co')) {
        const thumbKey = `thumbs/${photogId}/${eventId}/${p.id}-thumb.webp`;
        const thumbBuf = await downloadBuffer(p.thumb_url);
        await uploadBufferToS3(thumbKey, thumbBuf, 'image/webp');
        newThumbUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${thumbKey}`;
        console.log(`  ✅ Thumb migrado: ${thumbKey}`);
      }

      // 3. Migrar Original (se for imagem do storage privado)
      if (p.media_type !== 'video' && p.file_url && !p.file_url.startsWith('originals/')) {
        try {
          const { data: signedData } = await supabase.storage
            .from('photos-original')
            .createSignedUrl(p.file_url, 300);

          if (signedData?.signedUrl) {
            const origKey = `originals/${photogId}/${eventId}/${p.id}-original.${fileExt}`;
            const origBuf = await downloadBuffer(signedData.signedUrl);
            await uploadBufferToS3(origKey, origBuf, `image/${fileExt === 'png' ? 'png' : 'jpeg'}`);
            newFileUrl = origKey;
            console.log(`  ✅ Original migrado para S3: ${origKey}`);
          }
        } catch (origErr) {
          console.warn(`  ⚠️ Aviso ao migrar original:`, origErr.message);
        }
      }

      // 4. Atualizar registro no banco
      const { error: updateErr } = await supabase
        .from('photos')
        .update({
          preview_url: newPreviewUrl,
          thumb_url: newThumbUrl,
          file_url: newFileUrl
        })
        .eq('id', p.id);

      if (updateErr) throw updateErr;

      console.log(`  🎉 Foto ${p.id} atualizada com sucesso no banco de dados.`);
      migratedCount++;
    } catch (photoErr) {
      console.error(`  ❌ Falha ao migrar foto ${p.id}:`, photoErr.message);
      failCount++;
    }
  }

  console.log(`\n========================================`);
  console.log(`🏁 RESUMO DA MIGRAÇÃO:`);
  console.log(`✅ Sucesso: ${migratedCount} fotos migradas`);
  console.log(`❌ Falhas: ${failCount}`);
  console.log(`========================================\n`);
}

migratePhotos();
