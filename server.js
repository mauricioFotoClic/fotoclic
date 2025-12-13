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
app.use(express.json());

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
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`- Stripe Mode: ${process.env.STRIPE_SECRET_KEY ? 'Active' : 'Missing Key'}`);
});
