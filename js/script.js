// ============================================
// Header Navigation Script with Glass Slider
// ============================================

// Prevent browser from auto-scrolling to hash on page load
if (window.location.hash) {
    history.scrollRestoration = 'manual';
    // Immediately scroll to top before page renders
    window.scrollTo(0, 0);
}

// ============================================
// API Configuration
// ============================================
var API_BASE_URL =
    (location.hostname === '127.0.0.1' || location.hostname === 'localhost')
        ? 'http://127.0.0.1:8089/api'
        : 'https://api.drigo.com/api';

document.addEventListener('DOMContentLoaded', function() {
    initNavInteractions();
    fetchLandingData();

    var glassSlider = document.querySelector('.glass-slider');
    var prevIndex = sessionStorage.getItem('navSliderFromIndex');
    sessionStorage.removeItem('navSliderFromIndex');

    if (prevIndex !== null && glassSlider) {
        prevIndex = parseInt(prevIndex, 10);
        var navLinks = document.querySelectorAll('.nav-link');
        var sourceLink = navLinks[prevIndex];

        // Position slider at source link instantly (no animation)
        if (sourceLink) {
            glassSlider.style.transition = 'none';
            var navContainer = document.querySelector('.nav-container');
            var sourceRect = sourceLink.getBoundingClientRect();
            var containerRect = navContainer.getBoundingClientRect();
            glassSlider.style.width = sourceRect.width + 'px';
            glassSlider.style.transform = 'translateX(' + (sourceRect.left - containerRect.left) + 'px)';
            glassSlider.offsetHeight; // Force reflow
            glassSlider.style.transition = ''; // Re-enable transitions
        }

        // Now animate slider to the current active link
        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                updateGlassSlider();
            });
        });
    } else if (glassSlider) {
        // Normal page load — set slider instantly
        glassSlider.style.transition = 'none';
        updateGlassSlider();
        glassSlider.offsetHeight;
        glassSlider.style.transition = '';
    }

    initFAQ();
    initFilters();
    initMobileMenu();
    initCopyrightYear();
    initHeaderAutoHide();

    // Handle hash navigation after DOM is ready
    if (window.location.hash) {
        // Force scroll to top first
        window.scrollTo(0, 0);
        // Wait for full page load (images, fonts, etc.) before scrolling to section
        window.addEventListener('load', function() {
            // Small extra delay for layout to stabilize
            setTimeout(function() {
                scrollToHash(window.location.hash);
            }, 50);
        });
    }
});

// ============================================
// Scroll to a hash target with proper offset
// ============================================
function scrollToHash(hash) {
    if (!hash) return;
    var targetSection = document.querySelector(hash);
    if (!targetSection) return;

    var headerHeight = document.querySelector('.header').offsetHeight;
    var targetPosition = targetSection.getBoundingClientRect().top + window.scrollY - headerHeight;

    window.scrollTo({
        top: targetPosition,
        behavior: 'smooth'
    });

    // Update active nav link
    var navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(function(link) {
        link.classList.remove('active');
        var href = link.getAttribute('href');
        if (href === hash || href.endsWith(hash)) {
            link.classList.add('active');
        }
    });
    updateGlassSlider();
}

// ============================================
// Navigation Link Interactions
// ============================================
function initNavInteractions() {
    var navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(function(link) {
        link.addEventListener('click', function(e) {
            var href = this.getAttribute('href');

            // If link goes to another page (cross-page navigation), save current active tab index
            if (href && !href.startsWith('#')) {
                // Find the index of the currently active link
                var activeLink = document.querySelector('.nav-link.active');
                if (activeLink) {
                    var allLinks = document.querySelectorAll('.nav-link');
                    for (var i = 0; i < allLinks.length; i++) {
                        if (allLinks[i] === activeLink) {
                            sessionStorage.setItem('navSliderFromIndex', i);
                            break;
                        }
                    }
                }
                return;
            }

            e.preventDefault();

            // Remove active class from all links
            navLinks.forEach(function(l) { l.classList.remove('active'); });

            // Add active class to clicked link
            this.classList.add('active');

            // Update glass slider position
            updateGlassSlider();

            // Smooth scroll to section if hash exists
            if (href && href.startsWith('#') && href !== '#') {
                var targetSection = document.querySelector(href);
                if (targetSection) {
                    var headerHeight = document.querySelector('.header').offsetHeight;
                    var targetPosition = targetSection.getBoundingClientRect().top + window.scrollY - headerHeight;

                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });

    // Set active link based on scroll position
    window.addEventListener('scroll', throttle(updateActiveLink, 100));

    // Update slider on window resize
    window.addEventListener('resize', throttle(updateGlassSlider, 100));
}

// ============================================
// Update Glass Slider Position
// ============================================
function updateGlassSlider() {
    var activeLink = document.querySelector('.nav-link.active');
    var glassSlider = document.querySelector('.glass-slider');
    var navContainer = document.querySelector('.nav-container');
    var navMenu = document.querySelector('.nav-menu');

    if (!activeLink || !glassSlider || !navContainer || !navMenu) return;

    var activeLinkRect = activeLink.getBoundingClientRect();
    var navContainerRect = navContainer.getBoundingClientRect();

    var left = activeLinkRect.left - navContainerRect.left;
    var width = activeLinkRect.width;

    glassSlider.style.width = width + 'px';
    glassSlider.style.transform = 'translateX(' + left + 'px)';
}

// ============================================
// Update Active Link on Scroll
// ============================================
function updateActiveLink() {
    var sections = document.querySelectorAll('section[id]');
    var navLinks = document.querySelectorAll('.nav-link');
    var scrollPosition = window.scrollY + 150;

    sections.forEach(function(section) {
        var sectionTop = section.offsetTop;
        var sectionHeight = section.offsetHeight;
        var sectionId = section.getAttribute('id');

        if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
            navLinks.forEach(function(link) {
                link.classList.remove('active');
                var href = link.getAttribute('href');
                if (href === '#' + sectionId || href === '/#' + sectionId) {
                    link.classList.add('active');
                    updateGlassSlider();
                }
            });
        }
    });
}

// ============================================
// FAQ Accordion Functionality
// ============================================
function initFAQ() {
    var faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(function(item) {
        var question = item.querySelector('.faq-question');

        question.addEventListener('click', function() {
            var isActive = item.classList.contains('active');

            // Close all FAQ items
            faqItems.forEach(function(faqItem) {
                faqItem.classList.remove('active');
            });

            // Open clicked item if it wasn't active
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });
}

// ============================================
// Filter Functionality
// ============================================
function initFilters() {
    var filterButtons = document.querySelectorAll('.filter-btn');
    var faqItems = document.querySelectorAll('.faq-item');

    filterButtons.forEach(function(button) {
        button.addEventListener('click', function() {
            var filter = this.getAttribute('data-filter');

            filterButtons.forEach(function(btn) { btn.classList.remove('active'); });
            this.classList.add('active');

            faqItems.forEach(function(item) {
                var category = item.getAttribute('data-category');
                if (filter === 'all' || category === filter) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    });
}

// ============================================
// Mobile Menu Toggle
// ============================================
function initMobileMenu() {
    var mobileToggle = document.querySelector('.mobile-menu-toggle');
    var navContainer = document.querySelector('.nav-container');

    if (mobileToggle && navContainer) {
        mobileToggle.addEventListener('click', function() {
            navContainer.classList.toggle('mobile-open');
            mobileToggle.classList.toggle('active');
        });

        document.addEventListener('click', function(event) {
            if (!navContainer.contains(event.target) && !mobileToggle.contains(event.target)) {
                navContainer.classList.remove('mobile-open');
                mobileToggle.classList.remove('active');
            }
        });

        var navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(function(link) {
            link.addEventListener('click', function() {
                navContainer.classList.remove('mobile-open');
                mobileToggle.classList.remove('active');
            });
        });
    }
}

// ============================================
// Copyright Year
// ============================================
// ============================================
// Header auto-hide on scroll down, show on scroll up
// ============================================
function initHeaderAutoHide() {
    var header = document.querySelector('.header');
    if (!header) return;
    var lastY = window.scrollY;
    var ticking = false;
    var threshold = 80; // px from top — never hide above this

    function update() {
        var y = window.scrollY;
        var delta = y - lastY;
        if (y <= threshold) {
            header.classList.remove('header--hidden');
        } else if (delta > 4) {
            // scrolling down
            header.classList.add('header--hidden');
        } else if (delta < -4) {
            // scrolling up
            header.classList.remove('header--hidden');
        }
        lastY = y;
        ticking = false;
    }

    window.addEventListener('scroll', function() {
        if (!ticking) {
            window.requestAnimationFrame(update);
            ticking = true;
        }
    }, { passive: true });
}

function initCopyrightYear() {
    var el = document.querySelector('.footer-copyright');
    if (el) {
        el.textContent = '\u00A9 ' + new Date().getFullYear() + ' Drigo. All rights reserved';
    }
}

// ============================================
// Utility Functions
// ============================================
function throttle(func, limit) {
    var inThrottle;
    return function() {
        var args = arguments;
        var context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(function() { inThrottle = false; }, limit);
        }
    };
}

// ============================================
// Landing Page API Data
// ============================================
function fetchLandingData() {
    fetch(API_BASE_URL + '/landing', {
        headers: { 'Accept': 'application/json' }
    })
    .then(function(response) {
        if (!response.ok) throw new Error('API request failed');
        return response.json();
    })
    .then(function(data) {
        renderStatistics(data.statistics);
        renderCars(data.cars);
        renderHeroMarkers(data.cars);
    })
    .catch(function(error) {
        console.error('Failed to load landing data:', error);
    });
}

// ============================================
// Render Statistics
// ============================================
function renderStatistics(stats) {
    if (!stats) return;

    var carModels = document.getElementById('stat-car-models');
    var availableCars = document.getElementById('stat-available-cars');
    var tariffPackages = document.getElementById('stat-tariff-packages');
    var parkingZones = document.getElementById('stat-parking-zones');

    if (carModels) carModels.textContent = stats.carModels;
    if (availableCars) availableCars.textContent = stats.availableCars + '+';
    if (tariffPackages) tariffPackages.textContent = stats.tariffPackages;
    if (parkingZones) parkingZones.textContent = stats.freeParkingZones + '+';
}

// ============================================
// Render Cars
// ============================================
function renderCars(cars) {
    var grid = document.getElementById('cars-grid');
    if (!grid || !cars || cars.length === 0) return;

    grid.innerHTML = '';

    cars.forEach(function(car) {
        var card = document.createElement('div');
        card.className = 'car-card';

        var fullName = car.brandName + ' ' + car.modelName;

        // Mirror the hero markers: show the discounted price when the backend
        // sends one, with the original struck through beside it.
        var cardDiscount = car.originalPrice != null && car.discountedPrice != null
            && Number(car.discountedPrice) < Number(car.originalPrice);
        var cardPrice = cardDiscount ? Number(car.discountedPrice) : Number(car.price);

        var priceText = '';
        var origText = '';
        if (!isNaN(cardPrice) && cardPrice > 0 && car.currency) {
            var timeLabel = car.timeUnit ? car.timeUnit.toLowerCase() : 'monthly';
            priceText = car.currency + ' ' + formatPrice(cardPrice) + ' / ' + timeLabel;
            if (cardDiscount) origText = formatPrice(Number(car.originalPrice));
        }

        var imageUrl = car.mediaId
            ? API_BASE_URL + '/image/' + car.mediaId + '?w=500&q=80&f=webp'
            : (car.imageUrl || 'assets/images/carMercedes.svg');

        card.innerHTML =
            '<h3 class="car-name">' + escapeHtml(fullName) + '</h3>' +
            '<div class="car-tags">' +
                '<span class="car-tag">' + car.manufactureYear + '</span>' +
                '<span class="car-tag">' + escapeHtml(car.bodyTypeName) + '</span>' +
                '<span class="car-tag">' + escapeHtml(car.fuelTypeName) + '</span>' +
            '</div>' +
            '<div class="car-image">' +
                '<img src="' + escapeHtml(imageUrl) + '" alt="' + escapeHtml(fullName) + '" class="car-img" loading="lazy">' +
            '</div>' +
            '<div class="car-details">' +
                '<div class="car-detail-box">' +
                    '<img src="assets/images/SpeedIcon.svg" alt="Speed" class="car-detail-icon">' +
                    '<span class="car-detail-label">distance</span>' +
                    '<span class="car-detail-value">' + Math.round(Number(car.distance) / 1000).toLocaleString('en-US') + ' km</span>' +
                '</div>' +
                '<div class="car-detail-box">' +
                    '<img src="assets/images/UsersIcon.svg" alt="Users" class="car-detail-icon">' +
                    '<span class="car-detail-label">capacity</span>' +
                    '<span class="car-detail-value">' + car.seats + ' seats</span>' +
                '</div>' +
            '</div>' +
            '<div class="car-price">' +
                '<span class="car-price-label">starting from</span>' +
                '<span class="car-price-value">' +
                    (origText ? '<span class="car-price-orig">' + origText + '</span> ' : '') +
                    (priceText || '--') +
                '</span>' +
            '</div>';

        grid.appendChild(card);
    });
}

// ============================================
// Hero Map Markers — drigo-mobile style price pills on the hero image
// ============================================
// Designer-placed coords are percentages of .hero box (left%, top%).
// Tiers control perspective scaling/blur. Designed against current
// hero-dubai.jpg framing (bearing -94, pitch 58, looking WSW from
// Business Bay) — adjust if hero image is re-rendered.
var HERO_MARKER_SLOTS = [
    { left: 56, top: 62, tier: 'mid' },
    { left: 68, top: 50, tier: 'near' },
    { left: 84, top: 38, tier: 'far' },
    { left: 78, top: 78, tier: 'mid' },
    { left: 62, top: 30, tier: 'far' },
    { left: 92, top: 58, tier: 'far' },
    { left: 72, top: 72, tier: 'near' },
    { left: 88, top: 80, tier: 'mid' }
];

function renderHeroMarkers(cars) {
    var host = document.getElementById('hero-markers');
    if (!host || !cars || !cars.length) return;
    // Dedup by car id (avoid showing the exact same car twice),
    // then fill as many slots as we have unique cars for.
    var seen = {};
    var picks = [];
    cars.forEach(function (c) {
        if (!seen[c.id]) { seen[c.id] = 1; picks.push(c); }
    });
    picks = picks.slice(0, HERO_MARKER_SLOTS.length);

    host.innerHTML = '';
    picks.forEach(function (car, i) {
        var slot = HERO_MARKER_SLOTS[i];
        var node = document.createElement('div');
        node.className = 'hero-marker tier-' + slot.tier;
        node.style.left = slot.left + '%';
        node.style.top = slot.top + '%';
        node.style.animationDelay = (0.1 + i * 0.12) + 's';

        // Transparent cutout only. The scenic SideCard (car.mediaId) shrinks to a
        // dark rectangle at marker size, so a car without a cutout shows the pill alone.
        var carImg = car.carImageMediaId
            ? API_BASE_URL + '/image/' + car.carImageMediaId + '?w=250&q=80&f=webp'
            : '';

        var hasDiscount = car.originalPrice != null && car.discountedPrice != null
            && Number(car.discountedPrice) < Number(car.originalPrice);
        var displayPrice = hasDiscount ? Number(car.discountedPrice) : Number(car.price);
        var priceText = formatPrice(displayPrice);
        var cur = escapeHtml(car.currency || 'AED');
        var per = escapeHtml(car.timeUnit ? '/ ' + car.timeUnit : '');

        var origInline = '';
        if (hasDiscount) {
            origInline = '<span class="orig">' + formatPrice(car.originalPrice) + '</span> ';
            node.classList.add('has-discount');
        }

        node.innerHTML =
            '<div class="hero-marker-card">' +
                '<div class="hero-marker-brand">' + escapeHtml(car.brandName + ' ' + car.modelName) + '</div>' +
                '<div class="hero-marker-price">' +
                    origInline +
                    '<span class="now">' + priceText + '</span>' +
                    ' <span class="cur">' + cur + '</span> ' +
                    '<span class="per">' + per + '</span>' +
                '</div>' +
            '</div>' +
            '<div class="hero-marker-arrow"></div>' +
            (carImg ? '<img class="hero-marker-car" src="' + escapeHtml(carImg) + '" alt="" loading="lazy">' : '');
        host.appendChild(node);
    });
}

// ============================================
// Price Formatting Utility
// ============================================
// Backend sends decimals (186.25, 159.20). Show whole prices without a
// trailing ".00", and keep exactly two decimals otherwise so 159.20 does
// not render as "159.2".
function formatPrice(value) {
    var num = Number(value);
    if (isNaN(num)) return '';
    var decimals = Number.isInteger(num) ? 0 : 2;
    return num.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

// ============================================
// HTML Escape Utility
// ============================================
function escapeHtml(text) {
    if (!text) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
}

// ============================================
// Meta Pixel + CAPI — App Download Tracking
// ============================================
(function initAppDownloadTracking() {
    function generateEventId() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    }

    function getFbp() {
        var match = document.cookie.match(/_fbp=([^;]+)/);
        return match ? match[1] : null;
    }

    function getFbc() {
        var match = document.cookie.match(/_fbc=([^;]+)/);
        if (match) return match[1];
        var urlMatch = window.location.search.match(/fbclid=([^&]+)/);
        return urlMatch ? 'fb.1.' + Date.now() + '.' + urlMatch[1] : null;
    }

    function sendCapiEvent(eventName, eventId) {
        try {
            fetch(API_BASE_URL + '/landing/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    eventName: eventName,
                    eventId: eventId,
                    sourceUrl: window.location.href,
                    fbp: getFbp(),
                    fbc: getFbc()
                }),
                keepalive: true
            }).catch(function() {});
        } catch (e) {}
    }

    function trackAppDownloadClick(store) {
        var eventId = generateEventId();
        var props = { content_name: store, currency: 'USD', value: 0 };

        // Browser-side (Pixel)
        if (typeof fbq === 'function') {
            fbq('track', 'Lead', props, { eventID: eventId });
        }

        // Server-side (CAPI)
        sendCapiEvent('Lead', eventId);
    }

    document.addEventListener('click', function(e) {
        var btn = e.target.closest('.app-download-btn');
        if (!btn) return;
        var href = btn.getAttribute('href') || '';
        var store = href.indexOf('apple') !== -1 ? 'App Store' : 'Google Play';
        trackAppDownloadClick(store);
    });
})();

// ============================================
// Business Inquiry Form
// ============================================
(function() {
    var form = document.getElementById('biz-contact-form');
    if (!form) return;

    var phoneCodeSelect = document.getElementById('biz-phone-code');
    if (phoneCodeSelect) {
        fetch('https://api.drigo.com/api/countries')
            .then(function(res) { return res.json(); })
            .then(function(countries) {
                phoneCodeSelect.innerHTML = '';
                countries.forEach(function(c) {
                    var opt = document.createElement('option');
                    opt.value = c.phoneCode;
                    opt.textContent = c.flag + ' ' + c.phoneCode + ' ' + c.name;
                    if (c.phoneCode === '+971') opt.selected = true;
                    phoneCodeSelect.appendChild(opt);
                });
            })
            .catch(function() {});
    }

    form.addEventListener('submit', function(e) {
        e.preventDefault();

        var message = document.getElementById('biz-form-message');
        var submitBtn = form.querySelector('.biz-form-submit');

        var companyName = document.getElementById('biz-company-name').value.trim();
        var companyType = document.getElementById('biz-company-type').value;
        var personName = document.getElementById('biz-person-name').value.trim();
        var email = document.getElementById('biz-email').value.trim();
        var phoneCode = document.getElementById('biz-phone-code').value;
        var phoneNumber = document.getElementById('biz-phone-number').value.trim();

        if (!companyName || !personName || !email || !phoneNumber) {
            message.textContent = 'Please fill in all fields.';
            message.className = 'biz-form-message biz-form-error';
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';

        fetch('https://api.drigo.com/api/landing/business-inquiry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                companyName: companyName,
                companyType: companyType,
                personName: personName,
                email: email,
                phoneCode: phoneCode,
                phoneNumber: phoneNumber
            })
        })
        .then(function(response) {
            if (!response.ok) throw new Error('Request failed');
            message.textContent = 'Thank you! We will contact you soon.';
            message.className = 'biz-form-message biz-form-success';
            form.reset();
        })
        .catch(function() {
            message.textContent = 'Something went wrong. Please try again.';
            message.className = 'biz-form-message biz-form-error';
        })
        .finally(function() {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Start earning';
        });
    });
})();
