// QSAR Portal Interactive Scripts

// Register Service Worker for caching
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('Service Worker registered:', reg.scope))
            .catch(err => console.log('SW registration failed:', err));
    });
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("QSAR Portal Loaded");

    // Mobile Menu Toggle with Backdrop
    const menuToggle = document.querySelector('.menu-toggle');
    const mainNav = document.querySelector('.main-nav');

    // Create backdrop element
    const backdrop = document.createElement('div');
    backdrop.className = 'menu-backdrop';
    document.body.appendChild(backdrop);

    if (menuToggle && mainNav) {
        const toggleMenu = (open) => {
            if (open) {
                mainNav.classList.add('active');
                backdrop.classList.add('active');
                document.body.style.overflow = 'hidden';
            } else {
                mainNav.classList.remove('active');
                backdrop.classList.remove('active');
                document.body.style.overflow = '';
            }
            const icon = menuToggle.querySelector('i');
            if (open) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        };

        menuToggle.addEventListener('click', () => {
            toggleMenu(!mainNav.classList.contains('active'));
        });

        backdrop.addEventListener('click', () => toggleMenu(false));

        // Close menu on nav click (mobile)
        mainNav.addEventListener('click', (e) => {
            if (e.target.tagName === 'A' && !e.target.nextElementSibling) {
                toggleMenu(false);
            }
        });

        // Close button in nav (the ::before pseudo-element)
        mainNav.addEventListener('click', (e) => {
            if (e.target === mainNav) {
                const rect = mainNav.getBoundingClientRect();
                if (e.clientX > rect.right - 50 && e.clientY < 50) {
                    toggleMenu(false);
                }
            }
        });
    }

    // Dark Mode Toggle
    const themeToggle = document.querySelector('.theme-toggle');
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);

    if (themeToggle) {
        // Update icon based on current theme
        const icon = themeToggle.querySelector('i');
        if (savedTheme === 'dark') {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        }

        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);

            if (newTheme === 'dark') {
                icon.classList.remove('fa-moon');
                icon.classList.add('fa-sun');
            } else {
                icon.classList.remove('fa-sun');
                icon.classList.add('fa-moon');
            }
        });
    }

    // Quiz Logic
    const quizForm = document.getElementById('quizForm');
    const quizResult = document.getElementById('quizResult');

    if (quizForm) {
        quizForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const answers = {
                q1: 'c', // Количественная связь структура-активность
                q2: 'b', // LogP
                q3: 'a'  // Регрессия
            };

            let score = 0;
            const total = Object.keys(answers).length;

            for (let q in answers) {
                const selected = quizForm.querySelector(`input[name="${q}"]:checked`);
                if (selected && selected.value === answers[q]) {
                    score++;
                }
            }

            const percent = Math.round((score / total) * 100);
            let message = '';
            let className = '';

            if (percent >= 80) {
                message = `🎉 Отлично! ${score}/${total} (${percent}%)`;
                className = 'result-success';
            } else if (percent >= 50) {
                message = `📚 Неплохо! ${score}/${total} (${percent}%). Почитайте теорию.`;
                className = 'result-warning';
            } else {
                message = `❌ ${score}/${total} (${percent}%). Рекомендуем изучить раздел "Основы QSAR".`;
                className = 'result-error';
            }

            quizResult.innerHTML = message;
            quizResult.className = className;
            quizResult.style.display = 'block';
        });
    }

    // SMILES Validation Logic
    const smilesInput = document.getElementById('smilesInput');
    const checkBtn = document.getElementById('checkBtn');
    const resultBox = document.getElementById('resultBox');

    if (checkBtn && smilesInput) {
        checkBtn.addEventListener('click', () => {
            const smile = smilesInput.value.trim();
            validateSMILES(smile);
        });
    }

    function validateSMILES(smile) {
        if (!smile) {
            showResult("Введите SMILES строку!", "error");
            return;
        }

        // Basic Heuristic Check for SMILES characters
        // Allowed: Atoms (C,N,O,S,P,F,Cl,Br,I...), Bonds (-=#$), Brackets ([]), Parentheses (()), Digits
        const invalidChars = /[^A-Za-z0-9@\.\+\-\[\]\(\)\\=#\$%]/;

        if (invalidChars.test(smile)) {
            showResult("Ошибка: Обнаружены недопустимые символы.", "error");
            return;
        }

        // Check for balanced parentheses
        let balance = 0;
        for (let char of smile) {
            if (char === '(') balance++;
            if (char === ')') balance--;
            if (balance < 0) break;
        }

        if (balance !== 0) {
            showResult("Ошибка: Несбалансированные скобки.", "error");
        } else {
            showResult(`Корректный формат SMILES!<br>Длина: ${smile.length} симв.`, "success");
            // Simulate "Processing"
            setTimeout(() => {
                const molWeight = (smile.length * 12.5).toFixed(1); // Fake generic calculation
                resultBox.innerHTML += `<div style="margin-top:10px; font-size:0.9em; color:#555;">
                    Estimated MW: ~${molWeight} g/mol (Demo)<br>
                    <a href="http://www.swissadme.ch/index.php?smiles=${encodeURIComponent(smile)}" target="_blank" style="color:#007bff; text-decoration:underline;">
                        Открыть в SwissADME &rarr;
                    </a>
                </div>`;
            }, 500);
        }
    }

    function showResult(msg, type) {
        resultBox.style.display = 'block';
        resultBox.className = type === 'success' ? 'result-success' : 'result-error';
        resultBox.innerHTML = msg;
    }

    // ================================================
    // VISUAL IMPROVEMENTS - JavaScript Functions
    // ================================================

    // Scroll Progress Bar
    const scrollProgress = document.createElement('div');
    scrollProgress.className = 'scroll-progress';
    document.body.prepend(scrollProgress);

    window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrollPercent = (scrollTop / docHeight) * 100;
        scrollProgress.style.width = scrollPercent + '%';
    });

    // Intersection Observer for Scroll Animations
    const animateElements = document.querySelectorAll('.content-section, .result-card, .pipeline-step, .timeline-item, .flow-step, .stat-card, article');

    if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-on-scroll', 'visible');
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

        animateElements.forEach(el => {
            el.classList.add('animate-on-scroll');
            observer.observe(el);
        });
    }

    // Toast Notification Function (Global)
    window.showToast = function (message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = 'toast' + (type === 'error' ? ' error' : '');
        toast.innerHTML = `<i class="fas fa-${type === 'error' ? 'times-circle' : 'check-circle'}"></i> ${message}`;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    };

    // Hide Preloader (if exists)
    const preloader = document.querySelector('.preloader');
    if (preloader) {
        window.addEventListener('load', () => {
            preloader.classList.add('hidden');
        });
    }

    // Ripple Effect on Buttons
    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('click', function (e) {
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const ripple = document.createElement('span');
            ripple.style.cssText = `
                position: absolute;
                background: rgba(255,255,255,0.4);
                border-radius: 50%;
                transform: scale(0);
                animation: ripple 0.6s linear;
                left: ${x}px;
                top: ${y}px;
                width: 20px;
                height: 20px;
                margin-left: -10px;
                margin-top: -10px;
            `;

            this.appendChild(ripple);
            setTimeout(() => ripple.remove(), 600);
        });
    });

});
