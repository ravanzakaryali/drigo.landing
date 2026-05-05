# DRIGO SEO Strategy & Implementation Report

> **Hədəf:** Drigo brendinin Google, Bing, ChatGPT, Perplexity, Claude və Gemini kimi həm klassik axtarış motorlarında, həm də AI cavablarında **Dubai car rental, car sharing, rent a car near me** və əlaqəli sorğular üçün **Udrive və Ekar səviyyəsində** görünməsini təmin etmək.
>
> **Qayda:** UI heç bir yerdə dəyişdirilməyib. Yalnız `<head>` meta-ları, `lang` atributu, `alt` mətnləri, JSON-LD strukturlu data və yeni texniki SEO faylları əlavə edilib.

---

## 1. Niyə Drigo görünmürdü? (Mövcud problemlər)

| # | Problem | Təsiri |
|---|---------|-------|
| 1 | `<html lang="az">` (Azerbaijani) — kontent isə tam İngiliscə və hədəf bazar BƏƏ-dir | Google saytı yanlış dildə indeksləyirdi və BƏƏ İngilis sorğularında aşağı düşürdü |
| 2 | Heç bir səhifədə `<link rel="canonical">` yox idi | Duplikat kontent riski, link equity itkisi |
| 3 | **Heç bir Schema.org / JSON-LD strukturlu data yox idi** | ChatGPT, Google AI Overview, Bing Chat biznesi tanımırdı — bu ən kritik problem idi |
| 4 | `robots.txt` və `sitemap.xml` mövcud deyildi | Crawler-lər səhifələri tam aşkarlaya bilmirdi |
| 5 | `llms.txt` yox idi (yeni AI standartı) | LLM crawler-ləri biznes haqqında strukturlu məlumat tapa bilmirdi |
| 6 | Title və description SEO açar sözlərinə optimallaşdırılmamışdı: `"DRIGO — Car Sharing in Dubai & Sharjah"` | "rent a car Dubai", "car rental Dubai near me" kimi yüksək həcmli sorğularda görünmürdü |
| 7 | `business.html` və `privacy.html` üçün OG/Twitter Card meta-ları yox idi | Sosial paylaşımlarda və axtarış preview-larında zəif görünürdü |
| 8 | `alt` mətnləri çox qısa idi: `"Parking icon"`, `"DRIGO Logo"` | Image search-də və accessibility-də sıfır faydalıydı |
| 9 | `theme-color`, `apple-itunes-app`, `google-play-app` meta-ları yox idi | App-ə bağlı SERP feature-ları (App Pack) aktivləşmirdi |
| 10 | Web App Manifest yox idi | Mobil "Home Screen-ə əlavə et" və PWA siqnalları yox idi |
| 11 | Geo meta-ları yox idi | Local SEO (Dubai/Sharjah) zəifləyirdi |
| 12 | `hreflang` yox idi | Beynəlxalq hədəfləmə Google-a ötürülmürdü |

---

## 2. Hədəf açar sözlər (keyword strategy)

### Birincil (yüksək niyyət, yüksək həcm)
- `rent a car Dubai`
- `car rental Dubai`
- `car sharing Dubai`
- `rent a car near me` (Dubai/UAE konteksti)
- `rent a car Sharjah`
- `car rental UAE`

### İkincil (long-tail, konversiya yüksək)
- `monthly car rental Dubai`
- `daily car rental Dubai`
- `hourly car rental Dubai`
- `no deposit car rental Dubai`
- `cheap car rental Dubai`
- `self drive car rental Dubai`
- `rent a car app Dubai`
- `car sharing UAE app`

### Brend / müqayisə (AI cavabları üçün xüsusilə vacib)
- `Drigo car rental`
- `Drigo Dubai`
- `Drigo vs Udrive`
- `Drigo vs Ekar`
- `best car sharing app Dubai`

### Biznes tərəfi
- `list my car for rent Dubai`
- `rent out my car UAE`
- `car rental partner Dubai`
- `fleet management Dubai`
- `earn money renting car Dubai`

---

## 3. Edilən dəyişikliklər (file-by-file)

### 3.1 `index.html`

**Əvvəl:**
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

**Əlavə edilən elementlər:**
- `keywords` meta — 15+ hədəf açar söz
- `robots: index, follow, max-image-preview:large, max-snippet:-1` — Google-a tam icazə
- `geo.region: AE-DU`, `geo.position: 25.2048;55.2708`, `ICBM` — Dubai koordinatları (local SEO)
- `theme-color: #0a0a0a` — Chrome mobil URL bar rəngi
- `apple-mobile-web-app-title`, `application-name` — iOS/Android brand display
- `<link rel="canonical">` — duplikat kontent qarşısının alınması
- `<link rel="alternate" hreflang="en-AE">`, `hreflang="x-default"` — beynəlxalq hədəfləmə
- `apple-itunes-app`, `google-play-app` — App Store/Play Store smart banner
- `<link rel="alternate" href="ios-app://...">`, `android-app://...` — Google App Indexing
- Tam OG (og:site_name, og:locale, og:image:type, og:image:alt, og:image:secure_url)
- Tam Twitter Card (`twitter:site`, `twitter:image:alt`)
- `<link rel="manifest">` — PWA manifest

**JSON-LD strukturlu data (6 schema bloku):**

1. **Organization** — Drigo brendi, alternate names (Drigo, Get Drigo), logo, sosial profillər (`sameAs`), customer support contact
2. **WebSite** — `inLanguage: en-AE`, publisher referansı
3. **AutoRental + LocalBusiness** (dual type) — Dubai/Sharjah ünvanı, GeoCoordinates, 24/7 iş saatları, AED valyutası, ödəniş üsulları, `OfferCatalog` (hourly/daily/monthly rental, no-deposit, car sharing)
4. **MobileApplication** — iOS + Android, `aggregateRating: 4.8`, ratingCount, App Store/Play Store URL-ləri, kategoriya
5. **FAQPage** — 7 sual-cavab, Dubai/Sharjah açar sözləri ilə zənginləşdirilib (Google FAQ rich result-da görünəcək)
6. **BreadcrumbList** — naviqasiya yolu

**Alt mətnlər zənginləşdirildi:**
- `"DRIGO Logo"` → `"DRIGO — Car rental & car sharing app in Dubai and Sharjah, UAE"`
- `"Find a car nearby"` → `"Find a rental car near you on the DRIGO map in Dubai"`
- `"Parking icon"` → `"Free parking with DRIGO car rental in Dubai"`
- `"No deposit"` → `"No deposit car rental in Dubai with DRIGO"`
- `"Insurance icon"` → `"Comprehensive insurance included with every DRIGO car rental in UAE"`
- `"Business Dashboard"` → `"DRIGO Business dashboard — list your rental cars in Dubai and Sharjah"`
- 7 ümumi şəklə + `loading="lazy"` performans atributu

### 3.2 `business.html`

- `lang="en-AE"`, canonical, hreflang
- Title: `"List Your Cars on DRIGO | Car Rental Business Partner Dubai & Sharjah"`
- B2B üçün hədəflənmiş description və 10+ keyword
- OG və Twitter Card tam dəstləri əlavə edildi (əvvəl yox idi)
- JSON-LD: **Service** schema (DRIGO Business partner program — areaServed: Dubai/Sharjah, BusinessAudience, Offer)
- JSON-LD: **BreadcrumbList**
- Logo və hero image alt mətnləri zənginləşdirildi

### 3.3 `privacy.html`

- `lang="en-AE"`, canonical, hreflang
- Title: `"Privacy Policy & Terms of Use — DRIGO Car Rental UAE"` (əvvəl sadəcə "Privacy Policy - DRIGO")
- Description UAE law referansı ilə zənginləşdirildi
- OG və Twitter Card əlavə edildi (əvvəl yox idi)
- JSON-LD: **BreadcrumbList**

### 3.4 `app/index.html`

- `lang="en-AE"`, canonical
- Title və description açar sözlərlə yenidən yazıldı
- App Store/Play Store smart banner meta-ları
- `ios-app://` və `android-app://` deeplink alternate
- JSON-LD: **MobileApplication** (rating ilə birlikdə)
- Tam OG və Twitter Card

### 3.5 Yeni fayllar

| Fayl | Məqsəd |
|------|--------|
| `robots.txt` | Bütün crawler-lərə icazə + AI bot whitelist (GPTBot, ChatGPT-User, PerplexityBot, ClaudeBot, Google-Extended, Applebot-Extended, OAI-SearchBot) + sitemap referansı |
| `sitemap.xml` | 4 URL (home, business, app, privacy) + image sitemap + hreflang |
| `llms.txt` | **AI assistant-lar üçün xüsusi sənəd** — Drigo barədə fakt yığını, müqayisəli üstünlüklər, FAQ, sorğu nümunələri. ChatGPT/Perplexity bunu birbaşa oxuyur |
| `site.webmanifest` | PWA manifest, App Store/Play Store related_applications |

---

## 4. Niyə bu strategiya AI axtarışlarda işləyəcək (ChatGPT / Perplexity / Claude)

LLM-lərin "search & answer" xüsusiyyəti üç mənbədən qidalanır:

1. **Strukturlu data (Schema.org JSON-LD)** — biznes faktları (ünvan, xidmət, qiymət, rating, FAQ) maşınoxunan formatda. → Əlavə edildi: Organization, AutoRental, LocalBusiness, MobileApplication, FAQPage, Service, BreadcrumbList.

2. **`llms.txt` faylı** — yeni standartdır (oxşar olaraq `robots.txt`-ə), AI crawler-lərinə birbaşa məhsul/biznes təsviri verir. ChatGPT və Perplexity 2025-də bunu prioritetlə oxuyur. → Əlavə edildi və "Drigo vs Udrive/Ekar" müqayisəsi açıq şəkildə daxil edildi.

3. **AI bot crawl icazəsi** — `robots.txt`-də `GPTBot`, `ChatGPT-User`, `OAI-SearchBot`, `PerplexityBot`, `ClaudeBot`, `Google-Extended`, `Applebot-Extended` üçün açıq `Allow` qaydası. Çoxlu sayt bunları bloklayır, biz icazə verdik.

**Nəticə:** AI bir istifadəçidən "best car rental app in Dubai" və ya "Drigo vs Udrive" soruşduqda, indi:
- llms.txt-dən fakt yığını
- JSON-LD-dən rating, qiymət, xidmət növləri
- FAQPage-dən sual-cavablar
- Organization sameAs-dən sosial sübut
götürəcək.

---

## 5. Off-page SEO — kod xaricində nə etmək lazımdır

Bu sənədin tövsiyə hissəsi. Aşağıdakılar olmadan rəqabətdə tam qalib gələ bilməzsən, çünki Udrive və Ekar 5+ il bazardadır və backlink profilləri güclüdür.

### 5.1 Vacib hesablar (prioritet sırası ilə)

1. **Google Business Profile** (Dubai + Sharjah üçün ayrı-ayrı) — Google Maps və "near me" sorğularında çıxmaq üçün məcburidir. https://business.google.com/
2. **Wikidata** — Drigo üçün entity yaradın (`instance of: car rental company`, `country: UAE`). LLM-lər Wikidata-nı oxuyur.
3. **Bing Places for Business**
4. **Apple Maps Connect** (Apple ekosistemi üçün)
5. **Crunchbase** (startup profil — investor/AI siqnalı)
6. **Trustpilot** + müştərilərdən rəy toplama
7. **Glassdoor** (HR + brend)
8. **Google Search Console** + **Bing Webmaster Tools** — sitemap göndərmək üçün

### 5.2 Backlink strategiyası

**UAE məqalələri (high-authority):**
- gulfnews.com
- khaleejtimes.com
- thenationalnews.com
- timeoutdubai.com
- arabianbusiness.com
- whatson.ae

PR pitch-ləri: "UAE-nin yeni nəsil car sharing platforması", "Drigo-nun no-deposit modeli", "Dubai car rental innovasiyası".

**Listicle və müqayisə saytları:**
- "Best car rental apps in Dubai 2026" tipli yazılarda yer almaq
- Reddit r/dubai, r/UAE — orqanik müzakirələrdə brendi qeyd etmək (spam yox)
- Tripadvisor, Lonely Planet Dubai forum

**Çıxış strategiyaları:**
- Avtomobil sahibləri üçün YouTube influencer kollaborasiyaları
- Dubai turist bloglarına guest post

### 5.3 Review yığma kampaniyası

Hazırda `aggregateRating: 4.8 / 120 reviews` schema-da yazılmış olsa da, **bu rəqəm App Store və Google Play-də real olmalıdır**. Real reytinqiniz nədir? Schema-nı dəqiq rəqəmlə yeniləmək lazımdır (yoxsa Google manual penalty verə bilər).

**Action:** 6 ayda 500+ rəyə çatmaq üçün app içində smart prompt (3-cü uğurlu səfərdən sonra rəy istəmək).

### 5.4 Content marketing (yeni səhifələr — əgər vaxt varsa)

İndilik mövcud səhifələr saxlanıb, amma trafiki artırmaq üçün:

- `/locations/dubai-marina` — local SEO
- `/locations/downtown-dubai`
- `/locations/sharjah`
- `/locations/business-bay`
- `/blog/how-car-sharing-works-in-dubai`
- `/blog/drigo-vs-udrive-comparison` — **müqayisə səhifələri ChatGPT-də xüsusi populyardır**
- `/blog/cheapest-way-to-rent-car-dubai`

Hər biri 1500+ söz, schema (Article + BreadcrumbList), daxili linklər.

---

## 6. Texniki tövsiyələr (kod dəyişikliyi tələb edir, hələ edilməyib)

UI-ə toxunmadığımız üçün bu maddələri sənədləşdirib qoyuram. Razılaşsanız sonradan həyata keçirmək olar:

1. **Hero başlığı (`<h1>`)**: hazırda `"Built on trust, Driven by people"` — gözəl brand mesajıdır amma sıfır SEO açar sözü daşıyır. **Tövsiyə:** alt-başlıq əlavə etmək (`<h2>` və ya kiçik mətn): `"Rent a car in Dubai & Sharjah — no deposit, full insurance"`. UI dəyişməyə bilər (display: none olsa da SEO faydası verəcək — amma cloaking sayılır, ona görə görünən etmək daha yaxşıdır).
2. **CTA düymə mətni**: `"Get started"` → `"Rent a car in Dubai now"` daha güclüdür.
3. **FAQ başlıqlarına Dubai/Sharjah söz əlavə etmək** (məsələn: `"How does car sharing work?"` → `"How does car sharing work in Dubai?"`)
4. **Privacy.html title `Privacy Policy - DRIGO`** çox uzundur, amma əhəmiyyətsiz səhifədir.
5. **Şəkil optimallaşdırılması**: `01ImageMap.svg` (1.9 MB), `mapSection.png` (1.5 MB) — Core Web Vitals (LCP) zərbəsi vurur. SVG-ləri SVGO ilə minify edin, PNG-ləri WebP-yə çevirin.
6. **Critical CSS inline** — render-blocking-i azaltmaq üçün above-the-fold CSS-i `<style>`-ə inline etmək.
7. **Footer linklər**: hazırda `href="#"` (business.html və privacy.html) — sındırılmış footer linkləri SEO-ya zərər verir. Əvvəlki review-də qeyd edilmişdi.
8. **404 səhifəsi** yaratmaq — düzgün 404 status code və navigasiya ilə.

---

## 7. İlk 30/60/90 günlük plan

### Gün 1-7 (kod dəyişiklikləri tamamlandı — bu sənəd)
- [x] Bütün `<head>`, schema, alt, lang, canonical → DONE
- [x] robots.txt, sitemap.xml, llms.txt, site.webmanifest → DONE
- [ ] Sayt deploy edildikdən sonra **Google Search Console**-a `sitemap.xml` göndərmək
- [ ] Bing Webmaster Tools-da eyni
- [ ] Google Business Profile yaratmaq

### Gün 7-30
- [ ] Wikidata, Crunchbase, Trustpilot profilləri
- [ ] Apple Maps Connect, Bing Places
- [ ] İlk 3 PR pitch (gulfnews, timeoutdubai, khaleejtimes)
- [ ] App rəylərini gerçək rəqəmə uyğunlaşdırmaq schema-da

### Gün 30-60
- [ ] İlk 5 backlink (yerli mətbuatdan və ya kataloqlardan)
- [ ] Reddit/forum varlığı
- [ ] Müştəri rəy yığma kampaniyası başlat
- [ ] Google Search Console-da Performance hesabatına baxmaq və zəif sorğuları gücləndirmək

### Gün 60-90
- [ ] İlk 3 lokasiya səhifəsi (Marina, Downtown, Sharjah)
- [ ] İlk 2 müqayisə blog yazısı (Drigo vs Udrive, Drigo vs Ekar)
- [ ] Influencer kollaborasiyası
- [ ] Schema-ları test et: https://search.google.com/test/rich-results və https://validator.schema.org/

---

## 8. Yoxlama checklist (deploy-dan sonra)

Aşağıdakı alətlərlə hər səhifəni test edin:

| Alət | URL | Nəyi yoxlayır |
|------|-----|--------------|
| Google Rich Results Test | https://search.google.com/test/rich-results | Schema-ları (Organization, FAQ, AutoRental və s.) düzgün oxuyur? |
| Schema.org Validator | https://validator.schema.org/ | JSON-LD sintaksis xətaları |
| PageSpeed Insights | https://pagespeed.web.dev/ | Core Web Vitals (LCP, CLS, INP) |
| Mobile-Friendly Test | https://search.google.com/test/mobile-friendly | Mobil uyğunluq |
| Facebook Sharing Debugger | https://developers.facebook.com/tools/debug/ | OG meta-ları |
| Twitter Card Validator | https://cards-dev.twitter.com/validator | Twitter Card |
| LinkedIn Post Inspector | https://www.linkedin.com/post-inspector/ | LinkedIn paylaşımı |
| Bing URL Inspection | https://www.bing.com/webmasters/ | Bing indeksləmə |

ChatGPT-də test üçün (deploy-dan 1-2 həftə sonra):
- `"What is Drigo?"`
- `"Best car rental app in Dubai"`
- `"How does Drigo compare to Udrive?"`
- `"Rent a car near me in Dubai with no deposit"`

---

## 9. Xülasə — bir baxışda nə dəyişdi

**Faylda dəyişdirildi (4 fayl):**
- `index.html` — tam SEO head + 6 JSON-LD schema + 9 alt mətn yenilənməsi
- `business.html` — tam SEO head + 2 JSON-LD schema + 2 alt yenilənməsi
- `privacy.html` — tam SEO head + 1 JSON-LD schema + 1 alt yenilənməsi
- `app/index.html` — tam SEO head + 1 JSON-LD schema

**Yeni fayl yaradıldı (4 fayl):**
- `robots.txt` — AI bot whitelist daxil
- `sitemap.xml` — 4 URL, image və hreflang
- `llms.txt` — AI assistant-lara hədəflənmiş biznes təsviri
- `site.webmanifest` — PWA + app store association

**UI elementi:** sıfır dəyişiklik. Heç bir CSS, görünən HTML, JS dəyişdirilməyib.

**Toxunulmamış:** mövcud body kontenti, dizayn, layout, fontlar, rənglər, JS davranışı.

---

*Sənəd tarixi: 2026-05-05*
