// ============================================================
// sudobyter portfolio — elite hacker edition
// ============================================================

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ===== DOM Elements =====
const navToggle = document.getElementById('nav-toggle');
const navMenu = document.getElementById('nav-menu');
const navLinks = document.querySelectorAll('.nav-link');
const typingText = document.getElementById('typing-text');
const navbar = document.getElementById('navbar');
const bootOverlay = document.getElementById('boot-overlay');
const bootLog = document.getElementById('boot-log');
const reticle = document.getElementById('reticle');
const termInput = document.getElementById('term-input');
const termLog = document.getElementById('term-log');
const matrixCanvas = document.getElementById('matrix-canvas');

// ============================================================
// BOOT SEQUENCE
// ============================================================
const bootLines = [
    { t: 0,    cls: 'dim',    text: '[BIOS] sudobyter SecureBoot v4.20 (c) 2026' },
    { t: 80,   cls: 'dim',    text: '[BIOS] POST ............................. [  \u001bOK  ]' },
    { t: 120,  cls: 'info',   text: '[KERN] mounting rootfs (ext4) on /dev/nvme0n1p2' },
    { t: 80,   cls: 'ok',     text: '[  OK  ] Reached target cryptsetup.target' },
    { t: 70,   cls: 'ok',     text: '[  OK  ] Started Load Kernel Modules' },
    { t: 60,   cls: 'info',   text: '[KERN] loading exploit primitives ................ done' },
    { t: 80,   cls: 'info',   text: '[NET ] acquiring IPv4 via DHCP ................... 10.10.14.42' },
    { t: 80,   cls: 'warn',   text: '[SEC ] firewall: LOOSE (pentest profile)' },
    { t: 70,   cls: 'info',   text: '[TLS ] pinning certs → hackerone.com, *.bugcrowd.com' },
    { t: 90,   cls: 'accent', text: '[ !! ] unauthorized access is not unauthorized here' },
    { t: 120,  cls: 'ok',     text: '[  OK  ] Started Sudobyter Portfolio Service' },
    { t: 100,  cls: 'ok',     text: '[  OK  ] Reached target Graphical Interface' },
    { t: 80,   cls: 'dim',    text: 'login: root' },
    { t: 100,  cls: 'dim',    text: 'password: ****************' },
    { t: 150,  cls: 'ok',     text: 'Access granted.' },
    { t: 120,  cls: 'accent', text: '$ ./sudobyter --portfolio --mode=full' },
];

function runBoot() {
    if (prefersReducedMotion) {
        bootOverlay.classList.add('done');
        setTimeout(() => bootOverlay.remove(), 600);
        return;
    }

    let i = 0;
    function step() {
        if (i >= bootLines.length) {
            setTimeout(() => {
                bootOverlay.classList.add('done');
                setTimeout(() => bootOverlay.remove(), 650);
            }, 400);
            return;
        }
        const line = bootLines[i];
        const span = document.createElement('div');
        span.className = line.cls;
        span.textContent = line.text;
        bootLog.appendChild(span);
        // auto-scroll
        bootLog.scrollTop = bootLog.scrollHeight;
        i++;
        setTimeout(step, line.t + Math.random() * 40);
    }
    // blinking cursor at end
    const cursor = document.createElement('span');
    cursor.className = 'boot-cursor';
    bootLog.appendChild(cursor);
    setTimeout(step, 300);
}

// Allow skip on any key / click
function skipBoot() {
    if (bootOverlay && !bootOverlay.classList.contains('done')) {
        bootOverlay.classList.add('done');
        setTimeout(() => bootOverlay.remove(), 600);
    }
}
document.addEventListener('keydown', (e) => {
    if (bootOverlay && !bootOverlay.classList.contains('done')) skipBoot();
});
bootOverlay && bootOverlay.addEventListener('click', skipBoot);

// ============================================================
// MATRIX RAIN
// ============================================================
function initMatrixRain() {
    if (prefersReducedMotion || !matrixCanvas) return;

    const ctx = matrixCanvas.getContext('2d');
    const chars = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜ0123456789#$%<>?!@*[]{}+=';
    const fontSize = 14;
    let columns, drops;

    function resize() {
        matrixCanvas.width = window.innerWidth;
        matrixCanvas.height = window.innerHeight;
        columns = Math.floor(matrixCanvas.width / fontSize);
        drops = new Array(columns).fill(0).map(() => Math.random() * -50);
    }
    resize();
    window.addEventListener('resize', resize);

    let lastTime = 0;
    function draw(now) {
        if (now - lastTime < 55) { // ~18fps, keeps it subtle + performant
            requestAnimationFrame(draw);
            return;
        }
        lastTime = now;

        ctx.fillStyle = 'rgba(7, 7, 8, 0.08)';
        ctx.fillRect(0, 0, matrixCanvas.width, matrixCanvas.height);

        ctx.font = `${fontSize}px JetBrains Mono, monospace`;

        for (let i = 0; i < drops.length; i++) {
            const ch = chars[Math.floor(Math.random() * chars.length)];
            const x = i * fontSize;
            const y = drops[i] * fontSize;

            // lead character bright
            if (Math.random() > 0.975) {
                ctx.fillStyle = '#e6e6ea';
            } else {
                ctx.fillStyle = document.body.classList.contains('root-mode') ? '#00c2ff' : '#ff0040';
            }
            ctx.fillText(ch, x, y);

            if (y > matrixCanvas.height && Math.random() > 0.975) {
                drops[i] = 0;
            }
            drops[i]++;
        }
        requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
}

// ============================================================
// CROSSHAIR RETICLE (desktop only)
// ============================================================
function initReticle() {
    if (!reticle || window.matchMedia('(pointer: coarse)').matches) return;

    let tx = 0, ty = 0, cx = 0, cy = 0;

    document.addEventListener('mousemove', (e) => {
        tx = e.clientX;
        ty = e.clientY;
        const el = document.elementFromPoint(tx, ty);
        if (el && el.closest('a, button, input, .skill-tag, .cert-card, .project-card, .social-link')) {
            reticle.classList.add('lock');
        } else {
            reticle.classList.remove('lock');
        }
    });

    function anim() {
        cx += (tx - cx) * 0.22;
        cy += (ty - cy) * 0.22;
        reticle.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
        requestAnimationFrame(anim);
    }
    anim();

    document.addEventListener('mouseleave', () => reticle.style.opacity = '0');
    document.addEventListener('mouseenter', () => reticle.style.opacity = '1');
}

// ============================================================
// MOBILE NAV
// ============================================================
function toggleMobileMenu() {
    navToggle.classList.toggle('active');
    navMenu.classList.toggle('active');
}

navToggle.addEventListener('click', toggleMobileMenu);

navLinks.forEach(link => {
    link.addEventListener('click', () => {
        navToggle.classList.remove('active');
        navMenu.classList.remove('active');
    });
});

document.addEventListener('click', (e) => {
    if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) {
        navToggle.classList.remove('active');
        navMenu.classList.remove('active');
    }
});

// ============================================================
// SMOOTH SCROLL
// ============================================================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const href = this.getAttribute('href');
        if (!/^#[a-zA-Z0-9-]+$/.test(href)) return;
        const target = document.getElementById(href.substring(1));
        if (target) {
            const headerOffset = 80;
            const elementPosition = target.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
            window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
        }
    });
});

// ============================================================
// TYPING ANIMATION (hero title)
// ============================================================
const textToType = 'sudobyter';
let charIndex = 0;
let isDeleting = false;
const typingDelay = 130;
const deletingDelay = 80;
const pauseDelay = 2200;

function typeText() {
    const currentText = textToType.substring(0, charIndex);
    typingText.textContent = currentText;
    typingText.setAttribute('data-text', currentText);

    if (!isDeleting && charIndex < textToType.length) {
        charIndex++;
        setTimeout(typeText, typingDelay);
    } else if (!isDeleting && charIndex === textToType.length) {
        setTimeout(() => { isDeleting = true; typeText(); }, pauseDelay);
    } else if (isDeleting && charIndex > 0) {
        charIndex--;
        setTimeout(typeText, deletingDelay);
    } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        setTimeout(typeText, typingDelay);
    }
}

// ============================================================
// SCROLL-TRIGGERED FADE-INS
// ============================================================
function setupScrollAnimations() {
    const animatedElements = document.querySelectorAll(
        '.section-title, .terminal-card, .skill-category, .cert-card, .project-card'
    );

    animatedElements.forEach(el => el.classList.add('fade-in'));

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    animatedElements.forEach(el => observer.observe(el));
}

// ============================================================
// NAVBAR SCROLL + ACTIVE SECTION
// ============================================================
const sections = document.querySelectorAll('section[id]');

function onScroll() {
    const y = window.pageYOffset;
    if (y > 40) navbar.classList.add('scrolled');
    else navbar.classList.remove('scrolled');

    sections.forEach(section => {
        const top = section.offsetTop - 120;
        const bottom = top + section.offsetHeight;
        const id = section.getAttribute('id');
        const link = document.querySelector(`.nav-link[href="#${id}"]`);
        if (!link) return;
        if (y >= top && y < bottom) link.classList.add('active-section');
        else link.classList.remove('active-section');
    });
}
window.addEventListener('scroll', onScroll, { passive: true });

// ============================================================
// ESC closes mobile menu
// ============================================================
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        navToggle.classList.remove('active');
        navMenu.classList.remove('active');
    }
});

// ============================================================
// FOOTER YEAR
// ============================================================
document.getElementById('year').textContent = new Date().getFullYear();

// ============================================================
// EMAIL OBFUSCATION
// ============================================================
const __email = (function() {
    const u = 'sudobyter';
    const d = 'gmail.com';
    const addr = u + '@' + d;
    const el = document.getElementById('email-link');
    const txt = document.getElementById('email-text');
    if (el && txt) {
        el.href = 'mailto:' + addr;
        txt.textContent = addr;
    }
    return addr;
})();

// ============================================================
// INTERACTIVE TERMINAL
// ============================================================
const CMD_HISTORY_KEY = '__sbyt_hist';
let history = [];
try { history = JSON.parse(sessionStorage.getItem(CMD_HISTORY_KEY) || '[]'); } catch(_) {}
let histPtr = history.length;

const COMMANDS = {
    help: () => [
        '<span class="k">available commands:</span>',
        '  <span class="v">help</span>          list commands',
        '  <span class="v">whoami</span>        who is this guy',
        '  <span class="v">skills</span>        show skill matrix',
        '  <span class="v">certs</span>         list certifications',
        '  <span class="v">projects</span>      list projects',
        '  <span class="v">blog</span>          list blog posts',
        '  <span class="v">contact</span>       how to reach me',
        '  <span class="v">social</span>        social links',
        '  <span class="v">banner</span>        print ascii banner',
        '  <span class="v">date</span>          current date',
        '  <span class="v">uname</span>         system info',
        '  <span class="v">neofetch</span>      system report',
        '  <span class="v">ls</span>            list sections',
        '  <span class="v">cd &lt;section&gt;</span>   jump to section',
        '  <span class="v">clear</span>         clear terminal',
        '  <span class="v">exit</span>          close terminal',
        '',
        '<span class="k">recon tools (simulated):</span>',
        '  <span class="v">nmap [flags] &lt;target&gt;</span>  port scanner — try <span class="v">nmap -h</span>',
        '  <span class="v">targets</span>                list simulated scan targets',
        '',
        '<span class="hint">↑/↓ for history · tab to autocomplete</span>',
    ].join('\n'),
    whoami: () => 'sudobyter — pentester, bug bounty hunter, threat hunter.\nbreaking things to make them secure.',
    skills: () => [
        '<span class="k">offensive:</span> web pentesting, network pentesting, API security, OWASP Top 10, red teaming, social engineering',
        '<span class="k">tools:</span>     Burp Suite, Nmap, Metasploit, SQLMap, Wireshark, Nuclei, ffuf, Gobuster',
        '<span class="k">code:</span>      Python, Bash, JavaScript, Go, SQL',
        '<span class="k">stack:</span>     Linux, AWS, Docker, Kubernetes, Active Directory',
    ].join('\n'),
    certs: () => [
        '<span class="k">eJPT</span>   — eLearnSecurity Junior Penetration Tester',
        '<span class="k">eWPT</span>   — eLearnSecurity Web Application Penetration Tester',
        '<span class="k">eWPTX</span>  — eWPT eXtreme',
        '<span class="k">eCTHP</span>  — Certified Threat Hunting Professional',
    ].join('\n'),
    projects: () => [
        '<span class="k">[PROJ-0x01] Hun2race</span>',
        '  automated report generation tool for bug hunters & pentesters.',
        '  uses AI (ChatGPT/Bard) + LaTeX for professional PDF output.',
        '  → github.com/sudobyter-hub/hun2race',
    ].join('\n'),
    contact: () => [
        `<span class="k">email:</span>    ${__email}`,
        '<span class="k">twitter:</span>  @aliwaleedhum',
        '<span class="k">github:</span>   github.com/sudobyter-hub',
        '<span class="k">site:</span>     aliwaleed.xyz',
    ].join('\n'),
    social: () => COMMANDS.contact(),
    banner: () => [
        '<span class="k">',
        '   ▄▄▄▄    ██    ██  ██▀███▄    ▒█████   ██▄█▀▓█████',
        '  ▓█████▄  ██    ██  ▓██ ▒ ██▒  ▒██▒  ██▒ ▓███▄  ▓█   ▀',
        '  ▒██▒ ▄██ ██ ▄▄ ██  ▓██ ░▄█ ▒  ▒██░  ██▒▓███▄█▒▒███',
        '  ▒██░█▀   ▓█████▓   ▒██▀▀█▄    ▒██   ██░▓██▒ █▄▒▓█  ▄',
        '  ░▓█  ▀█▓ ▒██ ▒ ██▒ ░██▓ ▒██▒  ░ ████▓▒░▒██▒ █▄░▒████▒',
        '</span>',
        '<span class="hint">sudobyter — breaking things to make them secure.</span>',
    ].join('\n'),
    date: () => new Date().toString(),
    uname: () => 'sudobyter 6.6.6-exploit #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux',
    neofetch: () => [
        '<span class="k">os</span>     : sudobyter linux (rolling)',
        '<span class="k">host</span>   : aliwaleed.xyz',
        '<span class="k">kernel</span> : 6.6.6-exploit',
        '<span class="k">shell</span>  : zsh 5.9 (with \u001boh-my-zsh\u001b)',
        '<span class="k">term</span>   : xterm-hacker',
        '<span class="k">role</span>   : pentester · bug bounty · threat hunter',
        '<span class="k">mood</span>   : caffeinated ☕',
    ].join('\n'),
    ls: () => 'about/  skills/  certifications/  projects/  blog/  contact/',
    clear: () => { termLog.innerHTML = ''; return null; },
    sudo: () => '<span class="k">[sudo]</span> password for root: <span class="hint">nice try. try the konami code instead ↑↑↓↓←→←→BA</span>',
    exit: () => 'connection closed.',
    hack: () => 'deploying payload..... <span class="k">just kidding.</span> ethical hackers only.',
    'rm -rf /': () => '<span class="k">nope.</span> not on my watch.',
    ':q': () => 'this is not vim, but i respect the muscle memory.',
    vim: () => 'this is not vim. (but :q still works)',

    targets: () => [
        '<span class="k">simulated scan targets:</span>',
        '  <span class="v">scanme.nmap.org</span>      (45.33.32.156)    classic test target',
        '  <span class="v">testphp.vulnweb.com</span>  (44.228.249.3)    vulnerable web app',
        '  <span class="v">dc01.corp.local</span>      (10.10.14.10)     Active Directory DC',
        '  <span class="v">iot.local</span>            (192.168.1.100)   IoT / telnet box',
        '  <span class="v">webapp.dev</span>           (10.10.14.42)     CTF-style web + db',
        '',
        '<span class="hint">try: nmap -sV -sC -A dc01.corp.local</span>',
    ].join('\n'),

    blog: () => {
        const posts = window.BLOG_POSTS || [];
        if (!posts.length) return '<span class="hint">no posts yet.</span>';
        const lines = [
            '<span class="k">latest posts:</span>',
            ...posts.map(p => `  <span class="v">${p.date}</span>  [${p.category}]  <a href="#blog" data-blog-id="${p.id}" class="blog-inline-link">${p.title}</a>`),
            '',
            '<span class="hint">click a title above, or scroll to the blog section.</span>'
        ];
        return lines.join('\n');
    },
};

let nmapRunning = false;

async function runCommand(raw) {
    const cmd = raw.trim();
    if (!cmd) return;

    // echo the input
    const echo = document.createElement('div');
    echo.className = 'echo';
    echo.innerHTML = '<span class="prompt">$</span> ' + escapeHtml(cmd);
    termLog.appendChild(echo);

    // nmap — async streaming
    if (cmd === 'nmap' || cmd.startsWith('nmap ') || cmd.startsWith('nmap\t')) {
        await runNmapCommand(cmd);
        pushHistory(cmd);
        return;
    }

    // cd
    if (cmd.startsWith('cd ')) {
        const target = cmd.slice(3).trim().replace(/\/$/, '').toLowerCase();
        const valid = ['about','skills','certifications','certs','projects','blog','contact'];
        if (valid.includes(target)) {
            const id = target === 'certs' ? 'certifications' : target;
            const el = document.getElementById(id);
            if (el) {
                const offset = el.getBoundingClientRect().top + window.pageYOffset - 80;
                window.scrollTo({ top: offset, behavior: 'smooth' });
                appendResult(`navigating to /${id}/ ...`);
            }
        } else {
            appendResult(`<span class="k">cd:</span> no such section: ${escapeHtml(target)}`);
        }
    } else if (cmd in COMMANDS) {
        const out = COMMANDS[cmd]();
        if (out !== null && out !== undefined) appendResult(out);
    } else {
        appendResult(`<span class="k">command not found:</span> ${escapeHtml(cmd)}. try <span class="v">help</span>.`);
    }

    pushHistory(cmd);
    termLog.scrollTop = termLog.scrollHeight;
}

function pushHistory(cmd) {
    if (history[history.length - 1] !== cmd) {
        history.push(cmd);
        if (history.length > 50) history.shift();
        try { sessionStorage.setItem(CMD_HISTORY_KEY, JSON.stringify(history)); } catch(_) {}
    }
    histPtr = history.length;
    termLog.scrollTop = termLog.scrollHeight;
}

async function runNmapCommand(cmd) {
    if (nmapRunning) {
        appendResult('<span class="k">nmap:</span> already running. please wait…');
        return;
    }
    if (!window.NmapEngine) {
        appendResult('<span class="k">nmap:</span> engine not loaded.');
        return;
    }
    nmapRunning = true;

    // parse argv (respect simple quoting)
    const argv = splitArgs(cmd).slice(1);

    // container for all nmap lines
    const wrap = document.createElement('div');
    wrap.className = 'result nmap-output';
    termLog.appendChild(wrap);

    // "running" indicator + Ctrl+C hint
    const indicator = document.createElement('div');
    indicator.className = 'nmap-running';
    indicator.innerHTML = '<span class="spin"></span> scanning… <span class="hint">(press Ctrl+C to abort)</span>';
    wrap.appendChild(indicator);

    let aborted = false;
    const abortHandler = (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
            aborted = true;
        }
    };
    document.addEventListener('keydown', abortHandler);

    const emit = (line, cls = '') => {
        if (aborted) return;
        const el = document.createElement('div');
        el.className = 'nmap-line' + (cls ? ' ' + cls : '');
        el.textContent = line;  // textContent = safe, no HTML injection
        wrap.insertBefore(el, indicator);
        termLog.scrollTop = termLog.scrollHeight;
    };

    try {
        // prefers-reduced-motion → render all output at once
        await window.NmapEngine.run(argv, emit, { fast: prefersReducedMotion });
    } catch (err) {
        emit('nmap: ' + (err && err.message || 'internal error'), 'err');
    }

    if (aborted) {
        const a = document.createElement('div');
        a.className = 'nmap-line err';
        a.textContent = '^C';
        wrap.insertBefore(a, indicator);
        const b = document.createElement('div');
        b.className = 'nmap-line warn';
        b.textContent = 'Nmap aborted.';
        wrap.insertBefore(b, indicator);
    }
    document.removeEventListener('keydown', abortHandler);
    indicator.remove();
    nmapRunning = false;
    termLog.scrollTop = termLog.scrollHeight;
}

function splitArgs(s) {
    // supports "quoted strings" and 'single-quoted', trims, collapses whitespace
    const out = [];
    let cur = '', q = null;
    for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (q) {
            if (c === q) q = null;
            else cur += c;
        } else if (c === '"' || c === "'") {
            q = c;
        } else if (/\s/.test(c)) {
            if (cur) { out.push(cur); cur = ''; }
        } else {
            cur += c;
        }
    }
    if (cur) out.push(cur);
    return out;
}

function appendResult(html) {
    const div = document.createElement('div');
    div.className = 'result';
    div.innerHTML = html;
    termLog.appendChild(div);

    // wire inline blog links (from `blog` command)
    div.querySelectorAll('a[data-blog-id]').forEach(a => {
        a.addEventListener('click', (e) => {
            e.preventDefault();
            openBlogPost(a.getAttribute('data-blog-id'));
        });
    });
}

function escapeHtml(s) {
    return s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

if (termInput) {
    termInput.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const val = termInput.value;
            termInput.value = '';
            await runCommand(val);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (histPtr > 0) { histPtr--; termInput.value = history[histPtr] || ''; }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (histPtr < history.length) { histPtr++; termInput.value = history[histPtr] || ''; }
        } else if (e.key === 'Tab') {
            e.preventDefault();
            const partial = termInput.value.trim();
            if (partial) {
                const names = Object.keys(COMMANDS);
                const match = names.find(n => n.startsWith(partial));
                if (match) termInput.value = match;
            }
        } else if (e.key === 'l' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            termLog.innerHTML = '';
        }
    });
}

// ============================================================
// KONAMI CODE — ROOT MODE
// ============================================================
const konami = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
let konamiIdx = 0;

document.addEventListener('keydown', (e) => {
    const expected = konami[konamiIdx];
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (key === expected.toLowerCase()) {
        konamiIdx++;
        if (konamiIdx === konami.length) {
            konamiIdx = 0;
            activateRootMode();
        }
    } else {
        konamiIdx = 0;
    }
});

function activateRootMode() {
    document.body.classList.toggle('root-mode');
    const on = document.body.classList.contains('root-mode');
    if (termLog) {
        appendResult(on
            ? '<span class="k">[!]</span> root mode <span class="v">ENABLED</span> — privileges escalated.'
            : '<span class="k">[i]</span> root mode disabled. back to normal user.');
        termLog.scrollTop = termLog.scrollHeight;
    }
}

// ============================================================
// BLOG — grid render + modal
// ============================================================
const blogGrid = document.getElementById('blog-grid');
const blogModal = document.getElementById('blog-modal');
const blogModalTitle   = document.getElementById('blog-modal-title');
const blogModalCategory= document.getElementById('blog-modal-category');
const blogModalDate    = document.getElementById('blog-modal-date');
const blogModalRead    = document.getElementById('blog-modal-read');
const blogModalTags    = document.getElementById('blog-modal-tags');
const blogModalContent = document.getElementById('blog-modal-content');
const blogModalFile    = document.getElementById('blog-modal-file');

function renderBlogGrid() {
    if (!blogGrid) return;
    const posts = window.BLOG_POSTS || [];
    blogGrid.innerHTML = '';
    posts.forEach(post => {
        const card = document.createElement('article');
        card.className = 'blog-card fade-in';
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.setAttribute('aria-label', `Read: ${post.title}`);
        card.dataset.blogId = post.id;

        card.innerHTML = `
            <div class="blog-card-header">
                <span class="blog-category">${escHtml(post.category)}</span>
                <span class="blog-date">${escHtml(post.date)}</span>
                <span class="blog-read">${post.readMin || 5} min read</span>
            </div>
            <h3 class="blog-title">${escHtml(post.title)}</h3>
            <p class="blog-excerpt">${escHtml(post.excerpt)}</p>
            <div class="blog-tags">
                ${post.tags.map(t => `<span class="blog-tag">${escHtml(t)}</span>`).join('')}
            </div>
            <span class="blog-card-foot">cat post.md <span class="arrow">→</span></span>
        `;

        card.addEventListener('click', () => openBlogPost(post.id));
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openBlogPost(post.id);
            }
        });
        blogGrid.appendChild(card);
    });

    // observe newly-added cards for fade-in
    const io = new IntersectionObserver(entries => {
        entries.forEach(en => {
            if (en.isIntersecting) {
                en.target.classList.add('visible');
                io.unobserve(en.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    blogGrid.querySelectorAll('.blog-card').forEach(el => io.observe(el));
}

function openBlogPost(id) {
    const post = (window.BLOG_POSTS || []).find(p => p.id === id);
    if (!post || !blogModal) return;

    blogModalTitle.textContent = post.title;
    blogModalCategory.textContent = post.category;
    blogModalDate.textContent = post.date;
    blogModalRead.textContent = `${post.readMin || 5} min read`;
    blogModalTags.innerHTML = post.tags.map(t => `<span class="blog-tag">${escHtml(t)}</span>`).join('');
    blogModalFile.textContent = post.id + '.md';

    const rendered = (window.renderMarkdown || (x => x))(post.body);
    blogModalContent.innerHTML = rendered;

    // annotate <pre> blocks with their lang for the corner label
    blogModalContent.querySelectorAll('pre > code[class^="lang-"]').forEach(code => {
        const lang = code.className.replace(/^lang-/, '');
        code.parentElement.setAttribute('data-lang', lang);
    });

    blogModal.classList.add('active');
    blogModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    // focus the close button for a11y
    const closeBtn = blogModal.querySelector('.modal-close');
    if (closeBtn) setTimeout(() => closeBtn.focus(), 100);
}

function closeBlogPost() {
    if (!blogModal) return;
    blogModal.classList.remove('active');
    blogModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    blogModalContent.innerHTML = '';
}

if (blogModal) {
    blogModal.addEventListener('click', (e) => {
        if (e.target.dataset.close === '1' || e.target.closest('[data-close="1"]')) {
            closeBlogPost();
        }
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && blogModal.classList.contains('active')) {
            closeBlogPost();
        }
    });
}

function escHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// ============================================================
// CONSOLE BANNER
// ============================================================
console.log('%c[sudobyter]', 'color:#ff0040; font-size:22px; font-weight:700; text-shadow:0 0 6px #ff0040;');
console.log('%cwelcome, fellow hacker.', 'color:#9a9aa5; font-size:12px;');
console.log('%ctry the konami code. ↑↑↓↓←→←→ba', 'color:#00ffaa; font-size:12px;');
console.log('%chiring? looking for a talented pentester? → sudobyter@gmail.com', 'color:#00c2ff; font-size:12px;');

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    runBoot();
    initMatrixRain();
    initReticle();
    setTimeout(typeText, prefersReducedMotion ? 0 : 500);
    renderBlogGrid();
    setupScrollAnimations();
    onScroll();
});
