/**
 * ⚡ FotoClic - AWS S3 Direct Acceleration Service
 * Serviço de Upload e Download de Alta Velocidade via Presigned URLs da AWS S3
 */

export interface S3UploadResult {
  publicUrl: string;
  s3Key: string;
}

export const s3Service = {
  /**
   * Envia um arquivo diretamente para o Amazon S3 utilizando Presigned URL (Sem sobrecarregar o backend)
   */
  async uploadDirect(
    file: Blob | File,
    folder: 'previews' | 'thumbs' | 'originals',
    photographerId: string,
    eventId: string,
    fileName: string
  ): Promise<S3UploadResult> {
    const apiUrl = typeof window !== 'undefined' 
      ? `${window.location.protocol}//${window.location.host}/api/get-download-url`
      : '/api/get-download-url';

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    try {
      const rawSession = localStorage.getItem('supabase.auth.token') || localStorage.getItem('sb-' + window.location.hostname.split('.')[0] + '-auth-token');
      if (rawSession) {
        const parsed = JSON.parse(rawSession);
        const token = parsed?.currentSession?.access_token || parsed?.access_token;
        if (token) headers['Authorization'] = `Bearer ${token}`;
      }
    } catch (_) {}

    // 1. Solicita a URL pré-assinada de upload para a AWS
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        fileName,
        fileType: file.type || 'image/jpeg',
        folder,
        photographerId,
        eventId,
        action: 'getUploadUrl'
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Falha ao obter URL de upload da AWS S3 (${res.status})`);
    }

    const { uploadUrl, publicUrl, s3Key } = await res.json();

    // 2. Realiza o envio DIRETO do navegador para a AWS S3 com Retentativas Automáticas (Alta Performance e Resiliência)
    let s3UploadRes: Response | null = null;
    let lastError: any = null;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        s3UploadRes = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': file.type || 'image/jpeg'
          },
          body: file
        });

        if (s3UploadRes.ok) {
          break;
        } else {
          lastError = new Error(`Falha ao transferir arquivo para a AWS S3 (Tentativa ${attempt}/${maxRetries} - Status ${s3UploadRes.status})`);
        }
      } catch (networkErr: any) {
        lastError = networkErr;
      }

      if (attempt < maxRetries) {
        // Aguardar backoff exponencial antes de tentar novamente (500ms, 1000ms)
        await new Promise(r => setTimeout(r, attempt * 500));
      }
    }

    if (!s3UploadRes || !s3UploadRes.ok) {
      throw lastError || new Error(`Falha definitiva ao transferir arquivo para a AWS S3 após ${maxRetries} tentativas.`);
    }

    return { publicUrl, s3Key };
  },

  /**
   * Obtém URL assinada temporária para download seguro de fotos originais compradas
   */
  async getSecureDownloadUrl(s3Key: string, photographerId: string, eventId: string): Promise<string> {
    const apiUrl = typeof window !== 'undefined' 
      ? `${window.location.protocol}//${window.location.host}/api/get-download-url`
      : '/api/get-download-url';

    const fileName = s3Key.split('/').pop() || 'photo.jpg';

    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName,
        folder: 'originals',
        photographerId,
        eventId,
        action: 'getDownloadUrl'
      })
    });

    if (!res.ok) {
      throw new Error('Falha ao gerar link seguro de download da AWS');
    }

    const data = await res.json();
    return data.downloadUrl;
  }
};
