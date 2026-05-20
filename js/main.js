/* =========================================================
   JSL Tech — main.js
   ========================================================= */

/* ─── Particles Canvas ─────────────────────────────────── */
(function initParticles() {
    const canvas = document.getElementById('particles-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let particles = [];
    let raf;
    let mouse = { x: -9999, y: -9999 };

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

        raf = requestAnimationFrame(draw);
    }

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

            // Animate progress bars inside benefit items
            entry.target.querySelectorAll('.benefit-progress-fill').forEach(bar => {
                const w = bar.getAttribute('data-width');
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
        statsEl.querySelectorAll('.stat-number').forEach(el => {
            countUp(el, parseInt(el.getAttribute('data-target'), 10), 1800);
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
