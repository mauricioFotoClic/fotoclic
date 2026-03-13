import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { env, pipeline } from '@xenova/transformers';
import fs from 'fs';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Setup for Xenova in NodeJS
env.allowLocalModels = true;
env.useBrowserCache = false;
env.backends.onnx.wasm.numThreads = 1;
// @ts-ignore
env.backends.onnx.wasm.simd = false;

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function startReindex() {
  console.log("Baixando Modelo de IA Local (CLIP) para processamento em lote pesado. Isso pode levar alguns segundos...");
  
  let extractor;
  try {
     extractor = await pipeline('image-feature-extraction', 'Xenova/clip-vit-base-patch32');
     console.log("✅ Modelo Carregado com Sucesso!");
  } catch (err) {
      console.error("Erro ao iniciar modelo local:", err);
      return;
  }

  // Select only photos that do NOT have the image_descriptor set
  const { data: photos, error } = await supabase
    .from('photos')
    .select('id, file_url, thumb_url, preview_url')
    .is('image_descriptor', null);

  if (error || !photos) {
    console.error("Erro ao buscar fotos para indexação:", error);
    return;
  }

  if (photos.length === 0) {
    console.log("Todas as fotos já possuem vetor de Similaridade Visual (IA), nada a fazer!");
    return;
  }

  console.log(`Encontradas ${photos.length} fotos sem o descritor visual. Iniciando processamento local...`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    // try thumb_url first for fastest download, then preview, then file.
    const url = photo.thumb_url || photo.preview_url || photo.file_url;

    if (!url) {
      console.log(`[${i + 1}/${photos.length}] Foto ${photo.id} não possui URL válida. Pulando...`);
      failCount++;
      continue;
    }

    process.stdout.write(`[${i + 1}/${photos.length}] Processando Imagem ${photo.id.slice(0, 8)}... `);

    try {
      // Passar a URL da Imagem diretamente para a Inteligência Artificial
      const output = await extractor(url);
      
      const embedding = Array.from(output.data);

      if (!embedding || !Array.isArray(embedding)) {
        throw new Error("Vetor corrompido ou invalido");
      }

      // Update o BD formatando o vetor para [1,2,3...]
      const vectorVal = `[${embedding.join(',')}]`;

      const { error: updErr } = await supabase
        .from('photos')
        .update({ image_descriptor: vectorVal })
        .eq('id', photo.id);

      if (updErr) throw updErr;

      console.log(`✅ OK`);
      successCount++;
    } catch (err: any) {
      console.log(`❌ Erro: ${err.message}`);
      failCount++;
    }
  }

  console.log(`\n--- REINDEXAÇÃO CONCLUÍDA ---`);
  console.log(`Sucesso: ${successCount}`);
  console.log(`Falhas: ${failCount}`);
}

startReindex();
