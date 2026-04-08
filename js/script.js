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
var API_BASE_URL = 'https://api.drigo.com/api';

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
            if (href && (href.endsWith('.html') || href.includes('.html#'))) {
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
            if (href && href !== '#') {
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
                if (href === '#' + sectionId || href === 'index.html#' + sectionId) {
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
        var priceText = '';
        if (car.price && car.currency) {
            var formattedPrice = Number(car.price).toLocaleString('en-US');
            var timeLabel = car.timeUnit ? car.timeUnit.toLowerCase() : 'monthly';
            priceText = car.currency + ' ' + formattedPrice + ' / ' + timeLabel;
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
                '<span class="car-price-value">' + (priceText || '--') + '</span>' +
            '</div>';

        grid.appendChild(card);
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
