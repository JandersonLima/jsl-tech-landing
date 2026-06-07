/**
 * POST /api/contact
 * Valida, aplica rate limiting por IP e insere no Supabase via REST API direta
 * (sem SDK — compatível com chaves sb_publishable_ e JWT).
 */

const crypto = require('crypto');

const SUPABASE_URL   = process.env.SUPABASE_URL;
const SUPABASE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;
const IP_SALT        = process.env.IP_SALT || 'jsltech-salt';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '';
const MAX_BODY_BYTES = 4096;

function hashIp(ip) {
    return crypto.createHmac('sha256', IP_SALT).update(ip).digest('hex').slice(0, 32);
}

function sanitize(v) {
    return String(v ?? '').trim().slice(0, 1000);
}

const RULES = {
    nome:      v => v.length >= 3 && v.length <= 100 && /^[A-Za-zÀ-ÿ\s'\-]{3,100}$/.test(v),
    email:     v => v.length <= 100 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v),
    whatsapp:  v => /^[\d\s()+\-]{8,20}$/.test(v),
    descricao: v => v.length >= 20 && v.length <= 1000,
};

module.exports = async function handler(req, res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Cache-Control', 'no-store');

    if (ALLOWED_ORIGIN) {
        res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
        res.setHeader('Vary', 'Origin');
    }

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        console.error('[contact] Missing env vars: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
        return res.status(500).json({ error: 'Configuração do servidor incompleta.' });
    }

    if (!(req.headers['content-type'] || '').includes('application/json')) {
        return res.status(415).json({ error: 'Content-Type must be application/json' });
    }

    const bodyStr = JSON.stringify(req.body);
    if (Buffer.byteLength(bodyStr, 'utf8') > MAX_BODY_BYTES) {
        return res.status(413).json({ error: 'Payload too large' });
    }

    const raw = {
        nome:      sanitize(req.body?.nome),
        email:     sanitize(req.body?.email),
        whatsapp:  sanitize(req.body?.whatsapp),
        descricao: sanitize(req.body?.descricao),
    };

    const errors = {};
    for (const [field, validate] of Object.entries(RULES)) {
        if (!validate(raw[field])) errors[field] = true;
    }
    if (Object.keys(errors).length > 0) {
        return res.status(422).json({ error: 'Dados inválidos', fields: errors });
    }

    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
             || req.socket?.remoteAddress
             || 'unknown';
    const ipHash = hashIp(ip);

    try {
        const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/contatos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey':        SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Prefer':        'return=minimal',
            },
            body: JSON.stringify({
                nome:      raw.nome,
                email:     raw.email,
                whatsapp:  raw.whatsapp,
                descricao: raw.descricao,
                ip_origem: ipHash,
            }),
        });

        if (!insertRes.ok) {
            const errBody = await insertRes.json().catch(() => ({}));
            console.error('[contact] insert error:', insertRes.status, JSON.stringify(errBody));
            return res.status(500).json({ error: 'Erro interno. Tente novamente.' });
        }

        return res.status(200).json({ ok: true });

    } catch (err) {
        console.error('[contact] unexpected error:', err.message);
        return res.status(500).json({ error: 'Erro interno. Tente novamente.' });
    }
};
