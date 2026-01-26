// ===== DOM Elements =====
const navToggle = document.getElementById('nav-toggle');
const navMenu = document.getElementById('nav-menu');
const navLinks = document.querySelectorAll('.nav-link');
const typingText = document.getElementById('typing-text');

// ===== Mobile Navigation Toggle =====
function toggleMobileMenu() {
    navToggle.classList.toggle('active');
    navMenu.classList.toggle('active');
}

navToggle.addEventListener('click', toggleMobileMenu);

// Close mobile menu when clicking a link
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        navToggle.classList.remove('active');
        navMenu.classList.remove('active');
    });
});

// Close mobile menu when clicking outside
document.addEventListener('click', (e) => {
    if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) {
        navToggle.classList.remove('active');
        navMenu.classList.remove('active');
    }
});

// ===== Smooth Scroll for Navigation Links =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            const headerOffset = 80;
            const elementPosition = target.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// ===== Typing Animation =====
const textToType = 'sudobyter';
let charIndex = 0;
let isDeleting = false;
let typingDelay = 150;
let deletingDelay = 100;
let pauseDelay = 2000;

function typeText() {
    const currentText = textToType.substring(0, charIndex);
    typingText.textContent = currentText;

    if (!isDeleting && charIndex < textToType.length) {
        // Still typing
        charIndex++;
        setTimeout(typeText, typingDelay);
    } else if (!isDeleting && charIndex === textToType.length) {
        // Finished typing, pause before deleting
        setTimeout(() => {
            isDeleting = true;
            typeText();
        }, pauseDelay);
    } else if (isDeleting && charIndex > 0) {
        // Deleting
        charIndex--;
        setTimeout(typeText, deletingDelay);
    } else if (isDeleting && charIndex === 0) {
        // Finished deleting, start typing again
        isDeleting = false;
        setTimeout(typeText, typingDelay);
    }
}

// Start typing animation when page loads
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(typeText, 500);
});

// ===== Scroll-triggered Animations =====
function setupScrollAnimations() {
    const animatedElements = document.querySelectorAll(
        '.section-title, .terminal-card, .skill-category, .cert-card, .project-card'
    );

    animatedElements.forEach(el => {
        el.classList.add('fade-in');
    });

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        },
        {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        }
    );

    animatedElements.forEach(el => {
        observer.observe(el);
    });
}

// Initialize scroll animations
setupScrollAnimations();

// ===== Navbar Background on Scroll =====
const navbar = document.getElementById('navbar');
let lastScroll = 0;

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;

    // Add shadow when scrolled
    if (currentScroll > 50) {
        navbar.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
    } else {
        navbar.style.boxShadow = 'none';
    }

    lastScroll = currentScroll;
});

// ===== Active Navigation Link Highlighting =====
const sections = document.querySelectorAll('section[id]');

function highlightNavLink() {
    const scrollY = window.pageYOffset;

    sections.forEach(section => {
        const sectionHeight = section.offsetHeight;
        const sectionTop = section.offsetTop - 100;
        const sectionId = section.getAttribute('id');

        if (scrollY > sectionTop && scrollY <= sectionTop + sectionHeight) {
            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === '#' + sectionId) {
                    link.style.color = '#ff0040';
                } else {
                    link.style.color = '';
                }
            });
        }
    });
}

window.addEventListener('scroll', highlightNavLink);

// ===== Keyboard Navigation Support =====
document.addEventListener('keydown', (e) => {
    // ESC closes mobile menu
    if (e.key === 'Escape') {
        navToggle.classList.remove('active');
        navMenu.classList.remove('active');
    }
});

// ===== Console Easter Egg =====
console.log('%c[sudobyter]', 'color: #ff0040; font-size: 20px; font-weight: bold;');
console.log('%cWelcome, fellow hacker! Looking for bugs? Try my website.', 'color: #888; font-size: 12px;');
console.log('%cHappy hunting!', 'color: #00ff00; font-size: 12px;');
