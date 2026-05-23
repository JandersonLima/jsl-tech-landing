/* =========================================================
   JSL Tech — main.js
   ========================================================= */

/* ─── Helpers de segurança ──────────────────────────────── */
// Garante que um valor lido de atributo HTML seja um número
// dentro de um intervalo antes de usar em CSS/DOM
function safeNumber(value, min, max, fallback) {
    const n = parseFloat(value);
    if (isNaN(n) || n < min || n > max) return fallback;
    return n;
}

/* ─── Particles Canvas ─────────────────────────────────── */
(function initParticles() {
    const canvas = document.getElementById('particles-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let particles = [];
    let raf       = null;
    let mouse     = { x: -9999, y: -9999 };
    let hidden    = false;

    function resize() {
        canvas.width  = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function spawn() {
        particles = [];
        const count = Math.min(Math.floor((canvas.width * canvas.height) / 14000), 90);
        for (let i = 0; i < count; i++) {
            particles.push({
                x:  Math.random() * canvas.width,
                y:  Math.random() * canvas.height,
                vx: (Math.random() - .5) * .28,
                vy: (Math.random() - .5) * .28,
                r:  Math.random() * 1.8 + .4,
                a:  Math.random() * .45 + .08,
            });
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            if (p.x < 0)             p.x = canvas.width;
            if (p.x > canvas.width)  p.x = 0;
            if (p.y < 0)             p.y = canvas.height;
            if (p.y > canvas.height) p.y = 0;

            // Repel from mouse
            const dx = p.x - mouse.x;
            const dy = p.y - mouse.y;
            const d  = Math.sqrt(dx * dx + dy * dy);
            if (d < 80) {
                p.x += (dx / d) * 1.2;
                p.y += (dy / d) * 1.2;
            }

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(26,111,255,${p.a})`;
            ctx.fill();
        });

        // Connections
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx   = particles[i].x - particles[j].x;
                const dy   = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 110) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(26,111,255,${(1 - dist / 110) * .12})`;
                    ctx.lineWidth = .6;
                    ctx.stroke();
                }
            }
        }

        raf = hidden ? null : requestAnimationFrame(draw);
    }

    // Pausa animação quando aba está oculta (Page Visibility API)
    // evita consumo de CPU e vazamento de RAF quando o usuário troca de aba
    document.addEventListener('visibilitychange', () => {
        hidden = document.hidden;
        if (!hidden && !raf) draw();
    });

    window.addEventListener('resize', () => { resize(); spawn(); });
    document.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });

    resize();
    spawn();
    draw();
})();

/* ─── Custom Cursor ────────────────────────────────────── */
(function initCursor() {
    const cur = document.getElementById('cursor');
    const fol = document.getElementById('cursor-follower');
    if (!cur || !fol || window.innerWidth < 768) return;

    let mx = 0, my = 0, fx = 0, fy = 0;

    document.addEventListener('mousemove', e => {
        mx = e.clientX;
        my = e.clientY;
        cur.style.left = mx + 'px';
        cur.style.top  = my + 'px';
    });

    (function animateFol() {
        fx += (mx - fx) * .12;
        fy += (my - fy) * .12;
        fol.style.left = fx + 'px';
        fol.style.top  = fy + 'px';
        requestAnimationFrame(animateFol);
    })();

    const hoverEls = document.querySelectorAll('a, button, .service-card, .benefit-item, .stack-card');
    hoverEls.forEach(el => {
        el.addEventListener('mouseenter', () => { cur.classList.add('hovering'); fol.classList.add('hovering'); });
        el.addEventListener('mouseleave', () => { cur.classList.remove('hovering'); fol.classList.remove('hovering'); });
    });
})();

/* ─── Navbar scroll ────────────────────────────────────── */
(function initNavbar() {
    const nav = document.getElementById('navbar');
    if (!nav) return;

    function update() {
        nav.classList.toggle('scrolled', window.scrollY > 40);
    }

    window.addEventListener('scroll', update, { passive: true });
    update();
})();

/* ─── Mobile menu ──────────────────────────────────────── */
(function initMobileMenu() {
    const toggle = document.getElementById('nav-toggle');
    const links  = document.getElementById('nav-links');
    if (!toggle || !links) return;

    toggle.addEventListener('click', () => {
        const open = links.classList.toggle('open');
        toggle.classList.toggle('open', open);
        toggle.setAttribute('aria-expanded', String(open));
        document.body.style.overflow = open ? 'hidden' : '';
    });

    links.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', () => {
            links.classList.remove('open');
            toggle.classList.remove('open');
            toggle.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = '';
        });
    });
})();

/* ─── Active nav on scroll ─────────────────────────────── */
(function initActiveNav() {
    const sections = Array.from(document.querySelectorAll('section[id]'));
    const navLinks = document.querySelectorAll('.nav-link');

    function update() {
        const scrollY = window.scrollY + 120;
        let current = '';
        sections.forEach(sec => {
            if (sec.offsetTop <= scrollY) current = sec.id;
        });
        navLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === '#' + current);
        });
    }

    window.addEventListener('scroll', update, { passive: true });
    update();
})();

/* ─── Smooth scroll ────────────────────────────────────── */
document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
        const target = document.querySelector(a.getAttribute('href'));
        if (!target) return;
        e.preventDefault();
        const y = target.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top: y, behavior: 'smooth' });
    });
});

/* ─── Reveal on scroll (IntersectionObserver) ──────────── */
(function initReveal() {
    const items = document.querySelectorAll('.reveal');
    if (!items.length) return;

    const io = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('visible');

            // Animate progress bars — data-width validado (0-100) antes de aplicar em CSS
            entry.target.querySelectorAll('.benefit-progress-fill').forEach(bar => {
                const w = safeNumber(bar.getAttribute('data-width'), 0, 100, 0);
                setTimeout(() => { bar.style.width = w + '%'; }, 300);
            });

            io.unobserve(entry.target);
        });
    }, { threshold: .1, rootMargin: '0px 0px -48px 0px' });

    items.forEach(el => io.observe(el));
})();

/* ─── Counter animation ────────────────────────────────── */
(function initCounters() {
    const statsEl = document.querySelector('.hero-stats');
    if (!statsEl) return;

    function countUp(el, target, duration) {
        const start = performance.now();
        function tick(now) {
            const elapsed = Math.min((now - start) / duration, 1);
            const eased   = 1 - Math.pow(1 - elapsed, 3);
            el.textContent = Math.round(eased * target);
            if (elapsed < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
    }

    const io = new IntersectionObserver(entries => {
        if (!entries[0].isIntersecting) return;
        // data-target clampado a [0, 100000] antes de usar
        statsEl.querySelectorAll('.stat-number').forEach(el => {
            const target = safeNumber(el.getAttribute('data-target'), 0, 100000, 0);
            countUp(el, target, 1800);
        });
        io.disconnect();
    }, { threshold: .6 });

    io.observe(statsEl);
})();

/* ─── Card shine (mouse-tracking gradient) ─────────────── */
(function initCardShine() {
    document.querySelectorAll('.service-card').forEach(card => {
        card.addEventListener('mousemove', e => {
            const rect = card.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width  * 100).toFixed(1) + '%';
            const y = ((e.clientY - rect.top)  / rect.height * 100).toFixed(1) + '%';
            card.style.setProperty('--mouse-x', x);
            card.style.setProperty('--mouse-y', y);
        });
    });
})();

/* ─── Parallax orb on mouse ────────────────────────────── */
(function initOrbParallax() {
    const scene = document.getElementById('orb-scene');
    if (!scene) return;

    document.addEventListener('mousemove', e => {
        const xRot = ((e.clientY / window.innerHeight) - .5) * 14;
        const yRot = ((e.clientX / window.innerWidth)  - .5) * -14;
        scene.style.transform = `rotateX(${xRot}deg) rotateY(${yRot}deg)`;
    });
})();

/* ─── Modal de Contato ──────────────────────────────────── */
(function initContactModal() {

    /* ── Referências DOM ── */
    const overlay      = document.getElementById('modal-overlay');
    const box          = document.getElementById('modal-box');
    const btnOpen      = document.getElementById('btn-open-modal');
    const btnClose     = document.getElementById('modal-close');
    const form         = document.getElementById('contact-form');
    const btnSubmit    = document.getElementById('btn-submit');
    const formState    = document.getElementById('modal-form-state');
    const successState = document.getElementById('modal-success-state');
    const btnSuccClose = document.getElementById('btn-success-close');
    const charCount    = document.getElementById('char-count');
    const textarea     = document.getElementById('f-desc');

    if (!overlay || !form) return;

    /* ── Sanitização: remove qualquer HTML antes de usar valores ── */
    function sanitize(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .trim();
    }

    /* ── Rate limiting: máximo 3 envios por 10 minutos (localStorage) ── */
    const RATE_KEY      = 'jsl_form_attempts';
    const RATE_LIMIT    = 3;
    const RATE_WINDOW   = 10 * 60 * 1000; // 10 min em ms

    function getRateData() {
        try {
            return JSON.parse(localStorage.getItem(RATE_KEY)) || { count: 0, first: 0 };
        } catch { return { count: 0, first: 0 }; }
    }

    function isRateLimited() {
        const d = getRateData();
        if (Date.now() - d.first > RATE_WINDOW) return false;
        return d.count >= RATE_LIMIT;
    }

    function registerAttempt() {
        const d = getRateData();
        const now = Date.now();
        if (now - d.first > RATE_WINDOW) {
            localStorage.setItem(RATE_KEY, JSON.stringify({ count: 1, first: now }));
        } else {
            localStorage.setItem(RATE_KEY, JSON.stringify({ count: d.count + 1, first: d.first }));
        }
    }

    /* ── Regras de validação por campo ── */
    const rules = {
        'f-name': {
            validate: v => v.length >= 3 && v.length <= 100 && /^[A-Za-zÀ-ÿ\s'-]{3,100}$/.test(v),
            msg: 'Informe seu nome completo (mín. 3 letras, sem números).'
        },
        'f-email': {
            validate: v => v.length <= 100 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v),
            msg: 'Informe um e-mail válido (ex: nome@empresa.com.br).'
        },
        'f-whatsapp': {
            validate: v => /^[\d\s\(\)\+\-]{8,20}$/.test(v),
            msg: 'Informe um número válido (ex: (11) 99999-9999).'
        },
        'f-desc': {
            validate: v => v.length >= 20 && v.length <= 1000,
            msg: 'Descreva seu desafio (mín. 20, máx. 1000 caracteres).'
        }
    };

    function validateField(id) {
        const input = document.getElementById(id);
        const errEl = document.getElementById('err-' + id.replace('f-', ''));
        if (!input || !errEl) return false;

        const val  = input.value.trim();
        const rule = rules[id];
        const ok   = rule.validate(val);

        input.classList.toggle('invalid', !ok);
        input.classList.toggle('valid',    ok);
        // usa textContent (nunca innerHTML) para evitar XSS
        errEl.textContent = ok ? '' : rule.msg;
        return ok;
    }

    /* ── Contador de caracteres na textarea ── */
    if (textarea && charCount) {
        textarea.addEventListener('input', () => {
            const len = textarea.value.length;
            charCount.textContent = `${len} / 1000`;
            charCount.classList.toggle('near-limit', len >= 800 && len < 1000);
            charCount.classList.toggle('at-limit',   len >= 1000);
        });
    }

    /* ── Validação em tempo real (blur) ── */
    Object.keys(rules).forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('blur', () => validateField(id));
            el.addEventListener('input', () => {
                if (el.classList.contains('invalid')) validateField(id);
            });
        }
    });

    /* ── Abrir/fechar modal ── */
    function openModal() {
        overlay.classList.add('open');
        overlay.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        // foco acessível no primeiro campo
        setTimeout(() => {
            const first = form.querySelector('input:not([tabindex="-1"])');
            if (first) first.focus();
        }, 350);
    }

    function closeModal() {
        overlay.classList.remove('open');
        overlay.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    function resetModal() {
        form.reset();
        formState.hidden    = false;
        successState.hidden = true;
        form.querySelectorAll('input, textarea').forEach(el => {
            el.classList.remove('invalid', 'valid');
        });
        form.querySelectorAll('.field-error').forEach(el => el.textContent = '');
        if (charCount) charCount.textContent = '0 / 1000';
    }

    if (btnOpen)      btnOpen.addEventListener('click', openModal);
    if (btnClose)     btnClose.addEventListener('click', () => { closeModal(); setTimeout(resetModal, 400); });
    if (btnSuccClose) btnSuccClose.addEventListener('click', () => { closeModal(); setTimeout(resetModal, 400); });

    // Fecha ao clicar fora do box
    overlay.addEventListener('click', e => {
        if (e.target === overlay) { closeModal(); setTimeout(resetModal, 400); }
    });

    // Fecha com Escape
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && overlay.classList.contains('open')) {
            closeModal();
            setTimeout(resetModal, 400);
        }
    });

    /* ── Submit ── */
    form.addEventListener('submit', e => {
        e.preventDefault();

        /* 1. Honeypot: se preenchido → bot detectado, rejeita silenciosamente */
        const hp = document.getElementById('hp-name');
        if (hp && hp.value.length > 0) {
            closeModal();
            return;
        }

        /* 2. Validar todos os campos */
        const allOk = Object.keys(rules).every(id => validateField(id));
        if (!allOk) {
            const firstInvalid = form.querySelector('.invalid');
            if (firstInvalid) {
                firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
                firstInvalid.focus({ preventScroll: true });
            }
            return;
        }

        /* 3. Rate limiting */
        if (isRateLimited()) {
            const errEl = document.getElementById('err-desc');
            if (errEl) errEl.textContent = 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
            return;
        }

        /* 4. Sanitizar valores antes de qualquer uso */
        const name  = sanitize(document.getElementById('f-name').value);
        const email = sanitize(document.getElementById('f-email').value);
        const phone = sanitize(document.getElementById('f-whatsapp').value);
        const desc  = sanitize(document.getElementById('f-desc').value);

        /* 5. Simular envio (spinner) */
        btnSubmit.disabled = true;
        btnSubmit.classList.add('loading');
        btnSubmit.querySelector('span').textContent = 'Enviando…';

        // Monta mailto: com dados codificados de forma segura via URLSearchParams
        const body = [
            `Nome: ${name}`,
            `E-mail: ${email}`,
            `WhatsApp: ${phone}`,
            ``,
            `Mensagem:`,
            desc
        ].join('\n');

        const mailtoUrl = `mailto:contato@jsltech.com.br`
            + `?subject=${encodeURIComponent('Contato via Site - ' + name)}`
            + `&body=${encodeURIComponent(body)}`;

        setTimeout(() => {
            registerAttempt();

            // Abre cliente de e-mail com dados pré-preenchidos
            window.location.href = mailtoUrl;

            // Exibe tela de sucesso
            btnSubmit.disabled = false;
            btnSubmit.classList.remove('loading');
            btnSubmit.querySelector('span').textContent = 'Enviar mensagem';
            formState.hidden    = true;
            successState.hidden = false;
        }, 1200);
    });

})();

/* ─── Stagger reveal for service cards ─────────────────── */
(function initGridStagger() {
    const grid = document.querySelector('.services-grid');
    if (!grid) return;

    const io = new IntersectionObserver(entries => {
        if (!entries[0].isIntersecting) return;
        grid.querySelectorAll('.service-card').forEach((card, i) => {
            setTimeout(() => card.classList.add('visible'), i * 80);
        });
        io.disconnect();
    }, { threshold: .1 });

    io.observe(grid);
})();
