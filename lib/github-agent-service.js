/**
 * GitHub API Service for Autonomous Telegram Developer Agent
 * Handles reading and writing files directly to the repository (mauricioFotoClic/fotoclic)
 */

const GITHUB_API_URL = 'https://api.github.com';
const REPO_OWNER = process.env.GITHUB_OWNER || 'mauricioFotoClic';
const REPO_NAME = process.env.GITHUB_REPO || 'fotoclic';
const DEFAULT_BRANCH = process.env.GITHUB_BRANCH || 'main';

function getHeaders() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('GITHUB_TOKEN não configurado nas variáveis de ambiente.');
  }
  return {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'FotoClic-Telegram-Dev-Agent',
    'Content-Type': 'application/json'
  };
}

/**
 * Lê o conteúdo de um arquivo do repositório
 */
export async function getFileContent(filePath, branch = DEFAULT_BRANCH) {
  const cleanPath = filePath.replace(/^\/+/, '');
  const url = `${GITHUB_API_URL}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${cleanPath}?ref=${branch}`;

  const res = await fetch(url, { headers: getHeaders() });
  if (res.status === 404) {
    return { exists: false, content: null, sha: null };
  }
  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Erro ao ler arquivo ${cleanPath}: ${err.message || res.statusText}`);
  }

  const data = await res.json();
  const content = Buffer.from(data.content, 'base64').toString('utf8');
  return {
    exists: true,
    content,
    sha: data.sha,
    size: data.size,
    path: data.path
  };
}

/**
 * Cria ou atualiza um arquivo no repositório (faz commit)
 */
export async function commitFile(filePath, newContent, commitMessage, sha = null, branch = DEFAULT_BRANCH) {
  const cleanPath = filePath.replace(/^\/+/, '');

  // Se o SHA não foi passado, tenta buscar o arquivo para obter o SHA atual
  let targetSha = sha;
  if (!targetSha) {
    const existing = await getFileContent(cleanPath, branch);
    if (existing.exists) {
      targetSha = existing.sha;
    }
  }

  const url = `${GITHUB_API_URL}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${cleanPath}`;
  const base64Content = Buffer.from(newContent, 'utf8').toString('base64');

  const payload = {
    message: commitMessage || `Update ${cleanPath} via Telegram Agent`,
    content: base64Content,
    branch
  };

  if (targetSha) {
    payload.sha = targetSha;
  }

  const res = await fetch(url, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Erro ao fazer commit em ${cleanPath}: ${err.message || res.statusText}`);
  }

  const data = await res.json();
  return {
    success: true,
    commitSha: data.commit.sha,
    commitUrl: data.commit.html_url,
    path: cleanPath
  };
}

/**
 * Lista arquivos em um diretório do repositório
 */
export async function listDirectory(dirPath = '', branch = DEFAULT_BRANCH) {
  const cleanPath = dirPath.replace(/^\/+/, '');
  const url = `${GITHUB_API_URL}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${cleanPath}?ref=${branch}`;

  const res = await fetch(url, { headers: getHeaders() });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Erro ao listar diretório ${cleanPath}: ${err.message || res.statusText}`);
  }

  const data = await res.json();
  if (!Array.isArray(data)) {
    return [{ name: data.name, path: data.path, type: data.type, size: data.size }];
  }

  return data.map(item => ({
    name: item.name,
    path: item.path,
    type: item.type, // 'file' ou 'dir'
    size: item.size
  }));
}

/**
 * Obtém os últimos commits da branch principal
 */
export async function getLatestCommits(limit = 5, branch = DEFAULT_BRANCH) {
  const url = `${GITHUB_API_URL}/repos/${REPO_OWNER}/${REPO_NAME}/commits?sha=${branch}&per_page=${limit}`;
  const res = await fetch(url, { headers: getHeaders() });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Erro ao buscar commits: ${err.message || res.statusText}`);
  }
  const data = await res.json();
  return data.map(c => ({
    sha: c.sha.substring(0, 7),
    message: c.commit.message,
    author: c.commit.author.name,
    date: c.commit.author.date,
    url: c.html_url
  }));
}
