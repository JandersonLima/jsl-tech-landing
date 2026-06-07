/**
 * POST /api/contact
 * Recebe o formulário, valida server-side, aplica rate limiting por IP
 * e insere no Supabase via service_role (chave nunca exposta ao browser).
 */

const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// ── Configuração ──────────────────────────────────────────────────────────────
const SUPABASE_URL      = process.env.SUPABASE_URL;
const SUPABASE_SRK      = process.env.SUPABASE_SERVICE_ROLE_KEY;
const IP_SALT           = process.env.IP_SALT || 'jsltech-salt';
const ALLOWED_ORIGIN    = process.env.ALLOWED_ORIGIN || '';
const RATE_LIMIT        = 3;
const RATE_WINDOW_MS    = 10 * 60 * 1000;
const MAX_BODY_BYTES    = 4096;

// ── Helpers ───────────────────────────────────────────────────────────────────
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

// ── Handler ───────────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
    // Log diagnóstico — mostra apenas prefixo das vars (nunca o valor completo)
    console.log('[contact] env:', {
        url_ok:  !!SUPABASE_URL,
        url_prefix: SUPABASE_URL  ? SUPABASE_URL.slice(0, 20)  : 'MISSING',
        key_ok:  !!SUPABASE_SRK,
        key_prefix: SUPABASE_SRK ? SUPABASE_SRK.slice(0, 10) : 'MISSING',
    });

    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Cache-Control', 'no-store');

    // CORS restrito à origem configurada
    if (ALLOWED_ORIGIN) {
        res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
        res.setHeader('Vary', 'Origin');
    }

    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

    // Validação de variáveis de ambiente obrigatórias
    if (!SUPABASE_URL || !SUPABASE_SRK) {
        console.error('[contact] Variáveis de ambiente ausentes: SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY');
        return res.status(500).json({ error: 'Configuração do servidor incompleta.' });
    }

    // Content-Type obrigatório
    if (!(req.headers['content-type'] || '').includes('application/json')) {
        return res.status(415).json({ error: 'Content-Type must be application/json' });
    }

    // Tamanho máximo do body
    const bodyStr = JSON.stringify(req.body);
    if (Buffer.byteLength(bodyStr, 'utf8') > MAX_BODY_BYTES) {
        return res.status(413).json({ error: 'Payload too large' });
    }

    // ── Validação server-side ────────────────────────────────────────────────
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

    // ── Rate limiting por IP (hash, não o IP real) ────────────────────────────
    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
             || req.socket?.remoteAddress
             || 'unknown';
    const ipHash = hashIp(ip);

    try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SRK);

        const { data: rl } = await supabase
            .from('rate_limits')
            .select('attempts, window_start')
            .eq('ip_hash', ipHash)
            .maybeSingle();

        if (rl) {
            const windowAge = Date.now() - new Date(rl.window_start).getTime();
            if (windowAge < RATE_WINDOW_MS && rl.attempts >= RATE_LIMIT) {
                return res.status(429).json({ error: 'Muitas tentativas. Aguarde alguns minutos.' });
            }
        }

        // ── Inserção ──────────────────────────────────────────────────────────────
        const { error: insertErr } = await supabase.from('contatos').insert({
            nome:      raw.nome,
            email:     raw.email,
            whatsapp:  raw.whatsapp,
            descricao: raw.descricao,
            ip_origem: ipHash,
        });

        if (insertErr) {
            console.error('[contact] insert error:', insertErr.message);
            return res.status(500).json({ error: 'Erro interno. Tente novamente.' });
        }

        // ── Atualiza rate limit ───────────────────────────────────────────────────
        const now = new Date().toISOString();
        const windowExpired = !rl || (Date.now() - new Date(rl.window_start).getTime() >= RATE_WINDOW_MS);

        await supabase.from('rate_limits').upsert(
            windowExpired
                ? { ip_hash: ipHash, attempts: 1, window_start: now, last_attempt: now }
                : { ip_hash: ipHash, attempts: (rl.attempts || 0) + 1, window_start: rl.window_start, last_attempt: now },
            { onConflict: 'ip_hash' }
        );

        return res.status(200).json({ ok: true });

    } catch (err) {
        console.error('[contact] unexpected error:', err.message);
        return res.status(500).json({ error: 'Erro interno. Tente novamente.' });
    }
};
