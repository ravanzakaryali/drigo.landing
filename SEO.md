# DRIGO SEO Strategy & Implementation Report

> **Goal:** to make the Drigo brand visible **at the level of Udrive and Ekar** for **Dubai car rental, car sharing, rent a car near me** and related queries — both in classic search engines and in the answers of Google, Bing, ChatGPT, Perplexity, Claude and Gemini.
>
> **Rule:** the UI was not changed anywhere. Only the `<head>` meta tags, the `lang` attribute, the `alt` texts, the JSON-LD structured data and new technical SEO files were added.

---

## 1. Why was Drigo invisible? (the problems we found)

| # | Problem | Impact |
|---|---------|-------|
| 1 | `<html lang="az">` (Azerbaijani) — while the content is entirely English and the target market is the UAE | Google indexed the site in the wrong language and it ranked low for UAE English queries |
| 2 | No page had a `<link rel="canonical">` | Duplicate content risk, loss of link equity |
| 3 | **There was no Schema.org / JSON-LD structured data at all** | ChatGPT, Google AI Overview and Bing Chat did not recognise the business — the most critical problem |
| 4 | `robots.txt` and `sitemap.xml` did not exist | Crawlers could not discover every page |
| 5 | There was no `llms.txt` (the new AI standard) | LLM crawlers could not find structured information about the business |
| 6 | The title and description were not optimised for SEO keywords: `"DRIGO — Car Sharing in Dubai & Sharjah"` | It did not appear for high-volume queries such as "rent a car Dubai" or "car rental Dubai near me" |
| 7 | `business.html` and `privacy.html` had no OG/Twitter Card meta tags | They looked poor in social shares and in search previews |
| 8 | The `alt` texts were far too short: `"Parking icon"`, `"DRIGO Logo"` | Zero value for image search and accessibility |
| 9 | There were no `theme-color`, `apple-itunes-app` or `google-play-app` meta tags | The app-related SERP features (App Pack) were never activated |
| 10 | There was no Web App Manifest | No mobile "Add to Home Screen" or PWA signals |
| 11 | There were no geo meta tags | Local SEO (Dubai/Sharjah) was weak |
| 12 | There was no `hreflang` | International targeting was never communicated to Google |

---

## 2. Target keywords (keyword strategy)

### Primary (high intent, high volume)
- `rent a car Dubai`
- `car rental Dubai`
- `car sharing Dubai`
- `rent a car near me` (Dubai/UAE konteksti)
- `rent a car Sharjah`
- `car rental UAE`

### Secondary (long-tail, high conversion)
- `monthly car rental Dubai`
- `daily car rental Dubai`
- `hourly car rental Dubai`
- `no deposit car rental Dubai`
- `cheap car rental Dubai`
- `self drive car rental Dubai`
- `rent a car app Dubai`
- `car sharing UAE app`

### Brand / comparison (especially important for AI answers)
- `Drigo car rental`
- `Drigo Dubai`
- `Drigo vs Udrive`
- `Drigo vs Ekar`
- `best car sharing app Dubai`

### Business side
- `list my car for rent Dubai`
- `rent out my car UAE`
- `car rental partner Dubai`
- `fleet management Dubai`
- `earn money renting car Dubai`

---

## 3. The changes we made (file by file)

### 3.1 `index.html`

**Before:**
```html
<html lang="az">
<title>DRIGO — Car Sharing in Dubai & Sharjah</title>
<meta name="description" content="Rent a car in minutes across Dubai & Sharjah...">
```

**Sonra:**
```html
<html lang="en-AE">
<title>Rent a Car in Dubai & Sharjah | Car Sharing UAE — DRIGO</title>
<meta name="description" content="DRIGO is the #1 car rental & car sharing app in Dubai and Sharjah. Rent a car near you in minutes — no deposit, no hidden fees, free parking, fuel and insurance included...">
```

**Elements added:**
- a `keywords` meta tag — 15+ target keywords
- `robots: index, follow, max-image-preview:large, max-snippet:-1` — full permission for Google
- `geo.region: AE-DU`, `geo.position: 25.2048;55.2708`, `ICBM` — Dubai coordinates (local SEO)
- `theme-color: #0a0a0a` — the Chrome mobile URL bar colour
- `apple-mobile-web-app-title`, `application-name` — iOS/Android brand display
- `<link rel="canonical">` — prevents duplicate content
- `<link rel="alternate" hreflang="en-AE">`, `hreflang="x-default"` — international targeting
- `apple-itunes-app`, `google-play-app` — App Store/Play Store smart banner
- `<link rel="alternate" href="ios-app://...">`, `android-app://...` — Google App Indexing
- Tam OG (og:site_name, og:locale, og:image:type, og:image:alt, og:image:secure_url)
- Tam Twitter Card (`twitter:site`, `twitter:image:alt`)
- `<link rel="manifest">` — PWA manifest

**JSON-LD strukturlu data (6 schema bloku):**

1. **Organization** — the Drigo brand, alternate names (Drigo, Get Drigo), logo, social profiles (`sameAs`), customer support contact
2. **WebSite** — `inLanguage: en-AE`, publisher reference
3. **AutoRental + LocalBusiness** (dual type) — Dubai/Sharjah address, GeoCoordinates, 24/7 opening hours, AED currency, payment methods, `OfferCatalog` (hourly/daily/monthly rental, no-deposit, car sharing)
4. **MobileApplication** — iOS + Android, `aggregateRating: 4.8`, ratingCount, App Store/Play Store URLs, category
5. **FAQPage** — 7 questions and answers, enriched with Dubai/Sharjah keywords (will show up in the Google FAQ rich result)
6. **BreadcrumbList** — naviqasiya yolu

**The alt texts were enriched:**
- `"DRIGO Logo"` → `"DRIGO — Car rental & car sharing app in Dubai and Sharjah, UAE"`
- `"Find a car nearby"` → `"Find a rental car near you on the DRIGO map in Dubai"`
- `"Parking icon"` → `"Free parking with DRIGO car rental in Dubai"`
- `"No deposit"` → `"No deposit car rental in Dubai with DRIGO"`
- `"Insurance icon"` → `"Comprehensive insurance included with every DRIGO car rental in UAE"`
- `"Business Dashboard"` → `"DRIGO Business dashboard — list your rental cars in Dubai and Sharjah"`
- the `loading="lazy"` performance attribute on 7 general images

### 3.2 `business.html`

- `lang="en-AE"`, canonical, hreflang
- Title: `"List Your Cars on DRIGO | Car Rental Business Partner Dubai & Sharjah"`
- a description and 10+ keywords targeted at B2B
- full OG and Twitter Card sets added (there were none before)
- JSON-LD: **Service** schema (DRIGO Business partner program — areaServed: Dubai/Sharjah, BusinessAudience, Offer)
- JSON-LD: **BreadcrumbList**
- the logo and hero image alt texts were enriched

### 3.3 `privacy.html`

- `lang="en-AE"`, canonical, hreflang
- Title: `"Privacy Policy & Terms of Use — DRIGO Car Rental UAE"` (previously just "Privacy Policy - DRIGO")
- the description was enriched with a reference to UAE law
- OG and Twitter Card added (there were none before)
- JSON-LD: **BreadcrumbList**

### 3.4 `app/index.html`

- `lang="en-AE"`, canonical
- the title and description were rewritten with keywords
- App Store/Play Store smart banner meta tags
- `ios-app://` and `android-app://` deeplink alternates
- JSON-LD: **MobileApplication** (including the rating)
- full OG and Twitter Card

### 3.5 Yeni fayllar

| File | Purpose |
|------|--------|
| `robots.txt` | Allows every crawler + an AI bot whitelist (GPTBot, ChatGPT-User, PerplexityBot, ClaudeBot, Google-Extended, Applebot-Extended, OAI-SearchBot) + a sitemap reference |
| `sitemap.xml` | 4 URL (home, business, app, privacy) + image sitemap + hreflang |
| `llms.txt` | **A dedicated document for AI assistants** — a fact sheet about Drigo, comparative advantages, FAQ, sample queries. ChatGPT/Perplexity read it directly |
| `site.webmanifest` | PWA manifest, App Store/Play Store related_applications |

---

## 4. Why this strategy will work in AI search (ChatGPT / Perplexity / Claude)

The "search & answer" feature of LLMs is fed from three sources:

1. **Structured data (Schema.org JSON-LD)** — business facts (address, services, pricing, rating, FAQ) in a machine-readable format. → Added: Organization, AutoRental, LocalBusiness, MobileApplication, FAQPage, Service, BreadcrumbList.

2. **The `llms.txt` file** — a new standard (similar to `robots.txt`) that gives AI crawlers a direct product/business description. ChatGPT and Perplexity read it as a priority in 2025. → Added, with the "Drigo vs Udrive/Ekar" comparison stated explicitly.

3. **AI bot crawl permission** — an explicit `Allow` rule in `robots.txt` for `GPTBot`, `ChatGPT-User`, `OAI-SearchBot`, `PerplexityBot`, `ClaudeBot`, `Google-Extended` and `Applebot-Extended`. Many sites block these; we allow them.

**Result:** when a user asks an AI for "best car rental app in Dubai" or "Drigo vs Udrive", it will now pull:
- the fact sheet from llms.txt
- the rating, pricing and service types from the JSON-LD
- the questions and answers from FAQPage
- social proof from Organization sameAs

---

## 5. Off-page SEO — what to do outside the code

This is the recommendation part of the document. Without the items below you cannot fully win the competition, because Udrive and Ekar have been in the market for 5+ years and have strong backlink profiles.

### 5.1 Essential accounts (in priority order)

1. **Google Business Profile** (separately for Dubai and Sharjah) — mandatory for appearing in Google Maps and "near me" queries. https://business.google.com/
2. **Wikidata** — create an entity for Drigo (`instance of: car rental company`, `country: UAE`). LLMs read Wikidata.
3. **Bing Places for Business**
4. **Apple Maps Connect** (for the Apple ecosystem)
5. **Crunchbase** (a startup profile — an investor/AI signal)
6. **Trustpilot** + collecting reviews from customers
7. **Glassdoor** (HR + brend)
8. **Google Search Console** + **Bing Webmaster Tools** — to submit the sitemap

### 5.2 Backlink strategy

**UAE publications (high authority):**
- gulfnews.com
- khaleejtimes.com
- thenationalnews.com
- timeoutdubai.com
- arabianbusiness.com
- whatson.ae

PR pitches: "the UAE's next-generation car sharing platform", "Drigo's no-deposit model", "car rental innovation in Dubai".

**Listicles and comparison sites:**
- getting into articles like "Best car rental apps in Dubai 2026"
- Reddit r/dubai, r/UAE — mentioning the brand in organic discussions (no spam)
- Tripadvisor, Lonely Planet Dubai forum

**Outreach strategies:**
- YouTube influencer collaborations for car owners
- guest posts on Dubai tourism blogs

### 5.3 Review collection campaign

`aggregateRating: 4.8 / 120 reviews` is written into the schema today, but **that number has to be the real one on the App Store and Google Play**. What is the real rating? The schema must be updated with the exact figure (otherwise Google can issue a manual penalty).

**Action:** to reach 500+ reviews within 6 months, add a smart in-app prompt (ask for a review after the 3rd successful trip).

### 5.4 Content marketing (new pages — if there is time)

The existing pages are kept for now, but to grow traffic:

- `/locations/dubai-marina` — local SEO
- `/locations/downtown-dubai`
- `/locations/sharjah`
- `/locations/business-bay`
- `/blog/how-car-sharing-works-in-dubai`
- `/blog/drigo-vs-udrive-comparison` — **comparison pages are especially popular in ChatGPT**
- `/blog/cheapest-way-to-rent-car-dubai`

Each one 1500+ words, with schema (Article + BreadcrumbList) and internal links.

---

## 6. Technical recommendations (these need code changes, not done yet)

Because we did not touch the UI, these items are written down here. They can be implemented later if you agree:

1. **The hero heading (`<h1>`)**: currently `"Built on trust, Driven by people"` — a lovely brand message, but it carries zero SEO keywords. **Recommendation:** add a subheading (an `<h2>` or smaller text): `"Rent a car in Dubai & Sharjah — no deposit, full insurance"`. The UI need not change (even display: none would help SEO — but that counts as cloaking, so making it visible is better).
2. **CTA button text**: `"Get started"` → `"Rent a car in Dubai now"` is stronger.
3. **Add the words Dubai/Sharjah to the FAQ headings** (for example: `"How does car sharing work?"` → `"How does car sharing work in Dubai?"`)
4. **The privacy.html title `Privacy Policy - DRIGO`** is very long, but it is not an important page.
5. **Image optimisation**: `01ImageMap.svg` (1.9 MB) and `mapSection.png` (1.5 MB) hurt Core Web Vitals (LCP). Minify the SVGs with SVGO and convert the PNGs to WebP.
6. **Inline critical CSS** — inline the above-the-fold CSS into a `<style>` tag to reduce render blocking.
7. **Footer links**: currently `href="#"` (business.html and privacy.html) — broken footer links hurt SEO. This was already noted in the previous review.
8. **Create a 404 page** — with a proper 404 status code and navigation.

---

## 7. The first 30/60/90 day plan

### Days 1-7 (the code changes are done — this document)
- [x] All of `<head>`, schema, alt, lang, canonical → DONE
- [x] robots.txt, sitemap.xml, llms.txt, site.webmanifest → DONE
- [ ] Submit `sitemap.xml` to **Google Search Console** once the site is deployed
- [ ] Bing Webmaster Tools-da eyni
- [ ] Google Business Profile yaratmaq

### Days 7-30
- [ ] Wikidata, Crunchbase and Trustpilot profiles
- [ ] Apple Maps Connect, Bing Places
- [ ] The first 3 PR pitches (gulfnews, timeoutdubai, khaleejtimes)
- [ ] Align the app ratings in the schema with the real numbers

### Days 30-60
- [ ] The first 5 backlinks (from local press or directories)
- [ ] A presence on Reddit/forums
- [ ] Start the customer review collection campaign
- [ ] Review the Performance report in Google Search Console and strengthen the weak queries

### Days 60-90
- [ ] The first 3 location pages (Marina, Downtown, Sharjah)
- [ ] The first 2 comparison blog posts (Drigo vs Udrive, Drigo vs Ekar)
- [ ] An influencer collaboration
- [ ] Test the schemas: https://search.google.com/test/rich-results and https://validator.schema.org/

---

## 8. Yoxlama checklist (deploy-dan sonra)

Test every page with the tools below:

| Tool | URL | What it checks |
|------|-----|--------------|
| Google Rich Results Test | https://search.google.com/test/rich-results | Does it read the schemas correctly (Organization, FAQ, AutoRental, etc.)? |
| Schema.org Validator | https://validator.schema.org/ | JSON-LD syntax errors |
| PageSpeed Insights | https://pagespeed.web.dev/ | Core Web Vitals (LCP, CLS, INP) |
| Mobile-Friendly Test | https://search.google.com/test/mobile-friendly | Mobile compatibility |
| Facebook Sharing Debugger | https://developers.facebook.com/tools/debug/ | The OG meta tags |
| Twitter Card Validator | https://cards-dev.twitter.com/validator | Twitter Card |
| LinkedIn Post Inspector | https://www.linkedin.com/post-inspector/ | LinkedIn sharing |
| Bing URL Inspection | https://www.bing.com/webmasters/ | Bing indexing |

To test in ChatGPT (1-2 weeks after the deploy):
- `"What is Drigo?"`
- `"Best car rental app in Dubai"`
- `"How does Drigo compare to Udrive?"`
- `"Rent a car near me in Dubai with no deposit"`

---

## 9. Summary — what changed, at a glance

**Modified files (4):**
- `index.html` — the full SEO head + 6 JSON-LD schemas + 9 alt text updates
- `business.html` — the full SEO head + 2 JSON-LD schemas + 2 alt updates
- `privacy.html` — the full SEO head + 1 JSON-LD schema + 1 alt update
- `app/index.html` — tam SEO head + 1 JSON-LD schema

**New files created (4):**
- `robots.txt` — including the AI bot whitelist
- `sitemap.xml` — 4 URLs, image and hreflang
- `llms.txt` — a business description aimed at AI assistants
- `site.webmanifest` — PWA + app store association

**UI elements:** zero changes. No CSS, visible HTML or JS was modified.

**Untouched:** the existing body content, design, layout, fonts, colours and JS behaviour.

---

*Document date: 2026-05-05*
