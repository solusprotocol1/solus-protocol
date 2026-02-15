// S4 Ledger — Shared Scripts

// Scroll progress bar
window.addEventListener('scroll', () => {
    const scroll = window.scrollY;
    const height = document.documentElement.scrollHeight - window.innerHeight;
    const bar = document.getElementById('scrollProgress');
    if (bar) bar.style.width = (height > 0 ? (scroll / height * 100) : 0) + '%';
    const btn = document.getElementById('backToTop');
    if (btn) { scroll > 400 ? btn.classList.add('visible') : btn.classList.remove('visible'); }
});

// Reveal on scroll
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('visible'); });
}, { threshold: 0.1 });
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// Particles
if (typeof particlesJS !== 'undefined' && document.getElementById('particles-js')) {
    particlesJS('particles-js', {
        particles: {
            number: { value: 35 },
            color: { value: '#00aaff' },
            opacity: { value: 0.12 },
            size: { value: 2 },
            line_linked: { enable: true, distance: 150, color: '#00aaff', opacity: 0.06, width: 1 },
            move: { enable: true, speed: 0.7 }
        },
        interactivity: {
            events: { onhover: { enable: true, mode: 'grab' } },
            modes: { grab: { distance: 130, line_linked: { opacity: 0.15 } } }
        }
    });
}

// ── Persistent Auth State (cross-page login awareness) ──
document.addEventListener('DOMContentLoaded', () => {
    try {
        const user = JSON.parse(localStorage.getItem('s4_user') || 'null');
        if (user && Date.now() - user.loginTime < 86400000) { // 24 hour session
            // Find login link in navbar and update to show logged-in state
            const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
            navLinks.forEach(link => {
                if (link.href && link.href.includes('s4-login')) {
                    link.innerHTML = '<i class="fas fa-user-circle"></i> ' + user.name;
                    link.style.color = '#14f195';
                    link.style.fontWeight = '700';
                }
            });
        }
    } catch(e) { /* ignore parse errors */ }
});
