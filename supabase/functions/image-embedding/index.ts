import { env, pipeline } from 'https://esm.sh/@xenova/transformers@2.17.0';

// Configuração do ambiente para rodar na nuvem do Supabase (Deno)
env.useBrowserCache = false;
env.allowLocalModels = false;

// Padrão Singleton Lazy: 
// Impede que o Deno destrua a função por demorar muito no "Cold Start"
let pipeInstance: any = null;

async function getPipeline() {
  if (!pipeInstance) {
    pipeInstance = await pipeline('image-feature-extraction', 'Xenova/clip-vit-base-patch32');
  }
  return pipeInstance;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  // Tratar erros de CORS para requisições do frontend
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { image } = await req.json() as { image: string };
    
    if (!image) {
      return new Response(JSON.stringify({ error: 'Nenhuma imagem foi recebida.' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const pipe = await getPipeline();
    const output = await pipe(image);
    
    // Converter de Tensor Float32Array para um Array comum de Javascript
    const embedding = Array.from(output.data);

    // Retorna o vetor da foto com 512 dimensões!
    return new Response(JSON.stringify({ embedding }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error("Erro no processamento da IA: ", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
