import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: '.env.local' });

const app = express();
const PORT = 4242;

// Middleware
app.use(cors());
// We need rawBody for webhook signature verification
app.use(express.json({ 
    limit: '15mb',
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));

// 🛡️ FOTOCLIC SENTINEL SHIELD - ACTIVE THREAT INTERCEPTOR
const SQLI_REGEX = /(\b(UNION(\s+ALL)?|SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|EXEC|EXECUTE)\b\s+.*?\b(FROM|INTO|TABLE|DATABASE|WHERE)\b)|('(\s*OR\s*|\s*AND\s*)'?[^']+'?=')|(--|\/\*|\*\/|;\s*$)/i;
const SENSITIVE_PATHS_REGEX = /(\.env|\.git|wp-admin|wp-login|config\.php|phpmyadmin|administrator|\.aws|\.ssh)/i;

app.use(async (req, res, next) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const path = req.originalUrl || req.url || '';

    // 1. Detect Sensitive Path Scanner
    if (SENSITIVE_PATHS_REGEX.test(path)) {
        console.warn(`[Sentinel Shield] Blocked vulnerability scan from IP ${ip} on path ${path}`);
        return res.status(403).json({ error: 'Access Denied by FotoClic Sentinel AI' });
    }

    // 2. Detect SQL Injection in Query or Body
    const queryString = decodeURIComponent(req.url || '');
    if (SQLI_REGEX.test(queryString)) {
        console.warn(`[Sentinel Shield] Intercepted SQL Injection attempt from IP ${ip}`);
        return res.status(403).json({ error: 'Malicious payload intercepted by FotoClic Sentinel AI' });
    }

    next();
});

// Helper to load Vercel API functions locally
const apiDir = join(dirname(fileURLToPath(import.meta.url)), 'api');

// Generic Route handler for all files in /api
app.all('/api/:functionName', async (req, res) => {
    const { functionName } = req.params;
    const handlerPath = join(apiDir, `${functionName}.js`);

    console.log(`[Server] Request to /api/${functionName}`);

    if (fs.existsSync(handlerPath)) {
        try {
            // Invalidate cache to allow hot-reloading of API files
            const fileUrl = `file://${handlerPath}?update=${Date.now()}`;
            const module = await import(fileUrl);

            if (module.default) {
                await module.default(req, res);
            } else {
                res.status(500).json({ error: 'Module does not export default handler' });
            }
        } catch (error) {
            console.error(`[Server] Error executing ${functionName}:`, error);
            res.status(500).json({ error: `Internal Server Error: ${error.message}` });
        }
    } else {
        console.warn(`[Server] Function not found: ${functionName}`);
        res.status(404).json({ error: 'Function not found' });
    }
});

app.listen(PORT, () => {
    console.log(`[Server] Server running on http://localhost:${PORT}`);
    console.log(`[Server] - Stripe Mode: ${process.env.STRIPE_SECRET_KEY ? 'Active' : 'Missing Key'}`);
    console.log(`[Server] - Resend Mode: ${process.env.RESEND_API_KEY ? 'Active' : 'Missing Key'}`);
});
