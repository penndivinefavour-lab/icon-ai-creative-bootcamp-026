/*!
 * ICON STUDIOS — AI + Creative BootCAMP '26 — SITE CONFIGURATION
 * ============================================================================
 * SINGLE SOURCE OF TRUTH. The landing page reads this at runtime, so a change
 * here appears on the site immediately — no other file needs editing.
 *
 * Full documentation: docs/CONFIG_GUIDE.md  ·  Validator: scripts/check_prices.py
 *
 * BINDING RULES (enforced by the validator):
 *   • Prices are XAF/FCFA only — never NGN, USD, EUR, GBP.
 *   • Discount dates stay EMPTY until confirmed. Empty = not scheduled, so
 *     standard prices are shown and no discount is ever claimed.
 *   • Selar links stay EMPTY until a VERIFIED Selar product URL exists.
 *     Empty = the button falls back to "How payment works" and can never
 *     become a fake checkout link.
 *   • Never invent testimonials, student counts, facilitators or sponsors.
 *
 * Format: valid JSON once // comments are stripped. Use only // comments,
 * double quotes, no trailing commas.
 * ============================================================================
 */
window.SITE_CONFIG = {

  "site": {
    "name": "Icon AI and Creative Bootcamp",
    "badge": "ICON Studios AI + Creative Bootcamp '26",
    "headline": "30 Days. 5 Skills. Your Path.",
    "tagline": "A 30-day, mobile-first AI and creative skills programme built for a cohort of 500 creatives.",
    "description": "Icon AI and Creative Bootcamp is a 30-day, mobile-first programme covering five practical skills — graphic designing, prompt engineering, image generation, AI automation and AI video generation. Learn in 30 days, build a portfolio, and earn a certificate.",
    "url": "",
    "locale": "en",
    "defaultOgImage": "/assets/img/og-cover.png"
  },

  // Verified contacts. +237 672 536 260 and 67256260 are NOT approved.
  // phoneE164 must be a real dialable number (tel: links break otherwise).
  "contact": {
    "phoneDisplay": "+237 675 140 957",
    "phoneE164": "+237675140957",
    "email": "iconstudiosyde@gmail.com"
  },

  /* COMMUNITY DESTINATIONS — all EMPTY until the Founder verifies them.
   *   whatsappUrl  : verified WhatsApp contact/chat link. "" = fall back to the
   *                  verified email — never an invented deep link.
   *   waitlistUrl  : verified waitlist/group destination. "" = the same safe
   *                  email fallback. Never invent a group invite link.
   *   telegramUrl  : PRIVATE community link for registered participants only.
   *                  Never published publicly; "" = access explained, link
   *                  shared with enrolled participants.
   *   driveUrl     : PRIVATE Google Drive fallback for the learning materials.
   *                  Same rule — never a public link. */
  "community": {
    "whatsappUrl": "",
    "waitlistUrl": "",
    "waitlistLabel": "Join the waitlist group",
    "telegramUrl": "",
    "driveUrl": "",
    "deliveryNote": "Paid course materials are private to registered participants and are not for resale or redistribution.",
    "fallbackEmailSubject": "Free crash course — ICON Studios AI + Creative Bootcamp '26"
  },

  "announcement": {
    "enabled": true,
    "text": "Registration opens Saturday 10 October 2026 — the Bootcamp begins Saturday 7 November 2026. 10-day bootcamp, 5 skills, one cohort of 500 creatives.",
    "linkLabel": "See the packages",
    "linkHref": "#packages"
  },

  /* CAMPAIGN SCHEDULE — Founder-approved 2026 dates.
   *   campaignLaunch: registration/site campaign opens Sat 10 Oct 2026.
   *   bootcampStart : the programme begins Sat 7 Nov 2026.
   * The `iso` values carry an explicit UTC offset, so new Date(iso) resolves to
   * the same instant in every visitor timezone — the countdown is timezone-safe.
   * Change an iso here and the countdown follows. No date is invented anywhere
   * else in the site. */
  "campaign": {
    "launchDate": "2026-10-10",
    "bootcampStart": {
      "date": "2026-11-07",
      "time": "09:00",
      "tzOffset": "+01:00",
      "iso": "2026-11-07T09:00:00+01:00",
      "label": "Saturday 7 November 2026"
    },
    "countdown": {
      "enabled": true,
      "preLabel": "Bootcamp starts in",
      "liveLabel": "The Bootcamp has started",
      "endedLabel": "The 2026 cohort is underway"
    }
  },

  "programme": {
    "durationDays": 30,
    "bootcampDays": 10,
    "trackCount": 5,
    "cohortSize": 500,
    "format": "Recorded/structured learning sessions plus practical tasks every day",
    "certificate": true,
    // THE 10-DAY BOOTCAMP — concise structure. The final day-by-day timetable
    // is EMPTY until the Founder supplies it: `timetable` holds one entry per
    // day as { "title": "...", "focus": "..." } and the dates are derived from
    // bootcampStart, so nothing here is ever invented. When the array is empty
    // the section shows a clean "timetable coming soon" state.
    "tenDay": {
      "startDate": "2026-11-07",
      "rhythm": "Each day pairs a short recorded session with a practical task you finish and share.",
      "delivery": "Teaching materials, notes, recordings and updates are shared inside the private Telegram community — with a private Google Drive arrangement for anyone who cannot use Telegram.",
      "timetable": []
    }
  },

  /* PRICING — XAF (FCFA) only. Tracks are in the approved order.
   *
   * FOUNDER UPDATE (certificate-inclusive): the certificate is NO LONGER a
   * separate optional fee. Its cost is incorporated into every registration
   * price, so the approved individual-track prices are now:
   *   Graphic Designing 6,000 · Prompt Engineering 5,000 · Image Generation
   *   5,000 · AI Automation 7,000 · AI Video Generation 5,000
   * The earlier 5,000/4,000/4,000/6,000/4,000 figures are superseded — do not
   * revert to them. See docs/DECISION_LOG.md D-008.
   *
   * heroAnchor holds the two anchors DERIVED from the lowest track price:
   *   onStageActive = lowest track price with the deepest (20%) discount
   *   onStandard    = lowest track price
   * Both are recomputed from these approved prices: 5,000 - 20% = 4,000.
   * A stage is active only when BOTH start+end are set and today is inside
   * the window; windows must not overlap. Never invent dates. */
  "pricing": {
    "currency": "XAF",
    "currencyLabel": "FCFA",
    "standardLabel": "Standard price",
    "priceIncludesCertificate": true,
    "heroAnchor": { "onStageActive": 4000, "onStandard": 5000 },

    "tracks": [
      { "id": "graphic-design", "name": "Graphic Designing", "order": 1, "price": 6000,
        "blurb": "Design fundamentals, layout, colour and brand-ready visuals you can produce entirely on a phone or laptop.",
        "delivers": ["Design principles & composition", "Colour, type and hierarchy", "Poster, flyer & social-post workflow", "A polished portfolio piece"] },
      { "id": "prompt-engineering", "name": "Prompt Engineering", "order": 2, "price": 5000,
        "blurb": "Write precise, repeatable prompts that make AI tools produce exactly what you need, first try.",
        "delivers": ["Prompt structure & intent", "Controlling style and detail", "Iterating and fixing output", "Reusable prompt templates"] },
      { "id": "image-generation", "name": "Image Generation", "order": 3, "price": 5000,
        "blurb": "Generate, edit and refine high-quality images for clients, content and products with a clear editing pipeline.",
        "delivers": ["Model strengths & limits", "Editing and inpainting", "Consistent brand visuals", "A generated-image portfolio"] },
      { "id": "ai-automation", "name": "AI Automation", "order": 4, "price": 7000,
        "blurb": "Automate repetitive work and build simple no-code AI workflows. Mobile-first: Android/Termux is supported and a laptop is optional — not required.",
        "delivers": ["Automation fundamentals", "Connecting tasks into a workflow", "Running workflows from a phone", "A working automation project"] },
      { "id": "ai-video-generation", "name": "AI Video Generation", "order": 5, "price": 5000,
        "blurb": "Script, generate and edit short-form video with AI — from idea to a publishable reel.",
        "delivers": ["Scripting for short video", "Generation & editing pipeline", "Captions and packaging", "A finished short-form video"] }
    ],

    "stages": [
      { "id": "stage1", "label": "Stage 1 — Launch offer",     "pct": 20, "start": "2026-10-10", "end": "2026-10-23" },
      { "id": "stage2", "label": "Stage 2 — Early-bird offer", "pct": 10, "start": "2026-10-24", "end": "2026-10-30" },
      { "id": "stage3", "label": "Stage 3 — Closing offer",    "pct": 5,  "start": "2026-10-31", "end": "2026-11-06" }
    ]
  },

  /* PACKAGES — five Founder-approved bundles. Prices are LOCKED and confirmed
   * by the Founder: they must be displayed exactly as written and must never be
   * recalculated, rounded, substituted or derived from individual track prices.
   *
   * includedTrackIds holds the package composition. It follows directly from
   * each approved package name and is freely editable here; until the Founder
   * confirms a composition change, NO "you save X" claim is rendered anywhere
   * (savings depend on composition), so nothing unverified is ever published.
   *   Creative Starter    = the two foundational creative skills
   *   Automation Starter  = automation + the prompts that drive it
   *   Prompt Creator      = prompt craft + the media prompts produce
   *   Creative AI         = the three creative-AI tracks
   *   Full ICON           = all five tracks (the complete programme)
   */
  "packages": {
    // Founder-approved 5 Oct 2026. Show each price exactly as written;
    // never recalculate it from individual track prices.
    "enabled": true,
    "items": [
      { "id": "pkg-creative-starter", "name": "Creative Starter", "price": 8100,
        "positioning": "The essential creative pair — design fundamentals plus AI image generation.",
        "includedTrackIds": ["graphic-design", "image-generation"],
        "idealFor": "Beginners who want to start producing professional visuals and AI-generated artwork.",
        "benefits": ["Two complementary skills that reinforce each other", "A finished visual portfolio piece", "Works entirely on a phone"],
        "outcomes": ["Design and generate polished brand visuals", "A mini-portfolio of poster, post and generated-image work"] },
      { "id": "pkg-automation-starter", "name": "Automation Starter", "price": 9000,
        "positioning": "Automation plus the prompt engineering that makes AI workflows reliable.",
        "includedTrackIds": ["ai-automation", "prompt-engineering"],
        "idealFor": "People who want to save hours by automating repetitive work with AI.",
        "benefits": ["Automate real repetitive tasks", "Prompts that produce consistent results", "Mobile-first: Android/Termux supported, laptop optional"],
        "outcomes": ["A working automation project you control from your phone", "Reusable prompt templates for your workflow"] },
      { "id": "pkg-prompt-creator", "name": "Prompt Creator", "price": 9550,
        "positioning": "Master prompt craft across text, image and video generation.",
        "includedTrackIds": ["prompt-engineering", "image-generation", "ai-video-generation"],
        "idealFor": "Creators who want one prompt system that drives images, video and text.",
        "benefits": ["One repeatable prompt framework for every medium", "Image and video generation pipeline", "Templates you can reuse for client work"],
        "outcomes": ["Consistent, controllable output in three media", "A prompt library plus generated samples"] },
      { "id": "pkg-creative-ai", "name": "Creative AI", "price": 14450,
        "positioning": "The full creative-AI suite — graphic design, image generation and AI video.",
        "includedTrackIds": ["graphic-design", "image-generation", "ai-video-generation"],
        "idealFor": "Aspiring creative professionals who want to offer design, imagery and short video.",
        "benefits": ["Three skills that cover most client creative requests", "End-to-end production workflow", "A multi-format portfolio"],
        "outcomes": ["Produce a complete branded campaign: visuals, images and a short video", "A portfolio spanning three formats"] },
      { "id": "pkg-full-icon", "name": "Full ICON", "price": 18850,
        "positioning": "The complete Bootcamp — every one of the five tracks, start to finish.",
        "includedTrackIds": ["graphic-design", "prompt-engineering", "image-generation", "ai-automation", "ai-video-generation"],
        "idealFor": "Anyone who wants the full 30-day programme and all five skills.",
        "benefits": ["All five tracks in one enrolment", "The broadest skill set and portfolio", "The complete ICON experience"],
        "outcomes": ["Working skills across all five tracks", "A multi-track portfolio and a final project"] }
    ]
  },

  /* CERTIFICATES — TWO distinct certificates (Founder update, D-008).
   *
   * 1. bootcamp  — the 10-Day Bootcamp Completion Certificate. Its cost is
   *    INCORPORATED into every track and package registration price, so it is
   *    shown as included and never carries a separate fee.
   * 2. challenge — a SEPARATE certificate for successfully participating in /
   *    completing the limited 10-Day Challenge. It is NOT issued automatically
   *    to everyone who registers for the bootcamp; it is earned through the
   *    challenge, which has its own limited places.
   *
   * challengeFee is EMPTY (PRICE_PENDING_VERIFICATION): the Founder has not
   * supplied an approved figure, so no number is ever displayed for it. */
  "certificates": {
    "bootcamp": {
      "name": "10-Day Bootcamp Completion Certificate",
      "included": true,
      "note": "Issued when you complete the programme. Its cost is already included in every track and package price — there is no separate certificate fee to pay."
    },
    "challenge": {
      "name": "10-Day Challenge Certificate",
      "feeState": "PRICE_PENDING_VERIFICATION",
      "challengeFee": "",
      "note": "A separate certificate, earned by successfully participating in and completing the limited 10-Day Challenge. It is not issued automatically with bootcamp registration."
    }
  },

  /* FREE CRASH COURSE — genuinely free, never a disguised sales trial.
   * Placeholder wording until the Founder confirms the offer. ctaUrl "" =
   * safe fallback to the verified email or the verified WhatsApp link. */
  "crashCourse": {
    "enabled": true,
    "badge": "Free — no payment required",
    "title": "A free crash course to get you started",
    "detail": "A short, genuinely free introduction so you can try our teaching style before the bootcamp begins. No payment, no trial expiry, no obligation. The exact lessons are confirmed with the Founder and will be announced here.",
    "deliverables": [
      "A beginner-friendly practical lesson",
      "Works on a phone — no laptop needed",
      "No payment or card required"
    ],
    "ctaLabel": "Send me the free crash course",
    "ctaUrl": ""
  },

  /* PAYMENT — SELAR is the external payment authority. A link is published
   * ONLY when url is a real Selar product page (https://selar.co|com/...);
   * otherwise the button reads "Checkout link pending" and links to the
   * payment explainer. We never verify payments and never display a
   * converted amount — Selar shows the final currency and total at checkout.
   *
   * EXACTLY TEN PRODUCT SLOTS — five track products + five package products,
   * one each. The certificate is included in every registration price, so it
   * is NOT a separate product. The Founder supplies one verified Selar URL per
   * slot; paste it into the matching `url` field below and that product's CTA
   * goes live instantly. Nothing else needs to change. Every slot has an
   * explicit type so a URL can never be attached to the wrong product. */
  "payment": {
    "processorName": "Selar",
    "explainer": "International payments are processed through Selar. The final currency and the exact amount you pay are shown at Selar checkout, where Selar determines any conversion and fees. We do not see or store your card details, and this website does not verify payments — Selar confirms your enrolment.",
    "perTrackFallbackLabel": "Checkout link pending",
    "perPackageFallbackLabel": "Checkout link pending",
    "products": {
      "graphic-design":      { "type": "track",    "name": "Graphic Designing",     "price": 6000,  "url": "", "label": "Enrol — Graphic Designing" },
      "prompt-engineering":  { "type": "track",    "name": "Prompt Engineering",     "price": 5000,  "url": "", "label": "Enrol — Prompt Engineering" },
      "image-generation":    { "type": "track",    "name": "Image Generation",       "price": 5000,  "url": "", "label": "Enrol — Image Generation" },
      "ai-automation":       { "type": "track",    "name": "AI Automation",          "price": 7000,  "url": "", "label": "Enrol — AI Automation" },
      "ai-video-generation": { "type": "track",    "name": "AI Video Generation",    "price": 5000,  "url": "", "label": "Enrol — AI Video Generation" },
      "pkg-creative-starter":{ "type": "package", "name": "Creative Starter",       "price": 8100,  "url": "", "label": "Enrol — Creative Starter" },
      "pkg-automation-starter": { "type": "package", "name": "Automation Starter",   "price": 9000,  "url": "", "label": "Enrol — Automation Starter" },
      "pkg-prompt-creator":  { "type": "package", "name": "Prompt Creator",          "price": 9550,  "url": "", "label": "Enrol — Prompt Creator" },
      "pkg-creative-ai":     { "type": "package", "name": "Creative AI",             "price": 14450, "url": "", "label": "Enrol — Creative AI" },
      "pkg-full-icon":       { "type": "package", "name": "Full ICON",               "price": 18850, "url": "", "label": "Enrol — Full ICON" }
    }
  },

  /* IMAGE GENERATION GALLERY — dedicated showcase for the Image Generation
   * track. Items are EMPTY by design: the Founder supplies the real official
   * ICON examples. Add one entry per image:
   *   { "src": "/assets/img/gallery/<file>.webp", "w": 1080, "h": 1080,
   *     "alt": "<factual description>", "caption": "<short label>" }
   * Every image needs explicit w/h (prevents layout shift) and a factual alt.
   * Never present generated/stock imagery as participant work. */
  "gallery": {
    "enabled": true,
    "title": "Image Generation gallery",
    "emptyNote": "Official ICON generation examples land here during the campaign.",
    "items": []
  },

  /* SAMPLE PROJECTS / SHOWCASE — data-driven so the Founder can add real
   * campaign projects without touching markup. Add one entry per project:
   *   { "track": "image-generation", "title": "<name>",
   *     "blurb": "<what was built>", "img": "/assets/img/projects/<f>.webp",
   *     "w": 1200, "h": 800, "alt": "<factual alt>" }
   * Items are EMPTY until real projects exist — no invented student work. */
  "projects": {
    "enabled": true,
    "title": "Sample projects",
    "emptyNote": "Sample projects created during the campaign will be added here, track by track.",
    "items": []
  },

  /* 10-DAY CHALLENGE — a SEPARATE, limited-space practical opportunity that
   * runs with / after the Bootcamp, where selected participants build
   * something real. It is distinct from normal bootcamp registration.
   * EVERY rule below is EMPTY (pending the Founder's official terms): the
   * exact fee, the selection process, the number of spaces and the
   * application destination. Never invent any of them; the section shows a
   * "limited spaces" message with NO fabricated numbers. */
  "challenge": {
    "enabled": true,
    "badge": "Limited spaces",
    "title": "The 10-Day Challenge",
    "positioning": "A separate, practical 10-day build where selected participants turn what they have learned into a real, finished piece of work.",
    "benefits": [
      "Build one real project, end to end, with guidance",
      "A separate 10-Day Challenge certificate on successful completion",
      "Work that can anchor or lead your portfolio"
    ],
    "eligibility": "The challenge is separate from normal bootcamp registration, with its own limited places and its own entry requirements.",
    "feeState": "PRICE_PENDING_VERIFICATION",
    "challengeFee": "",
    "feeNote": "The exact challenge fee is announced with the official challenge rules.",
    "applyLabel": "Apply for the challenge",
    "applyUrl": ""
  },

  /* AFFILIATE / REFERRAL PROGRAM — you do not need to buy the bootcamp to
   * earn from referring qualified paying participants. The commission rate,
   * payout rules, eligibility, tracking system and payment schedule are ALL
   * EMPTY until the Founder supplies the official affiliate terms. Never
   * invent a percentage or a rule; the section shows a clear "details to be
   * confirmed" state. applyUrl: the official registration/application
   * destination for affiliates. */
  "affiliate": {
    "enabled": true,
    "badge": "Earn while you share",
    "title": "ICON Bootcamp Affiliate Program",
    "positioning": "Refer qualified paying participants and earn a commission — you do not need to enrol in the bootcamp yourself to take part.",
    "audience": "Open to students, creators, friends, marketers, community members and other eligible referrers.",
    "howItWorks": [
      "Share the bootcamp using your affiliate identity",
      "Someone you refer registers and pays through Selar",
      "You receive a commission according to the official affiliate terms"
    ],
    "terms": {
      "commissionPct": "",
      "payoutRules": "",
      "eligibility": "",
      "tracking": "",
      "paymentSchedule": ""
    },
    "termsNote": "The commission rate, payout rules, eligibility, tracking and payment schedule are published once the official affiliate terms are confirmed.",
    "separationNote": "The affiliate program is separate from normal bootcamp registration.",
    "applyLabel": "Become an ICON Affiliate",
    "applyUrl": ""
  },

  /* ASK ICON — deterministic local FAQ assistant. It answers ONLY from the
   * knowledge base below using keyword matching — no AI API, no backend, no
   * database, no hallucination. Any question without a confident match is
   * answered with the unknown state plus WhatsApp/email escalation. Never add
   * an answer that states an unverified price, date or Selar link. */
  "assistant": {
    "enabled": true,
    "title": "Ask ICON",
    "subtitle": "Instant answers about the Bootcamp",
    "greeting": "Ask me about the tracks, packages, prices, dates, certificates, the community or payment.",
    "unknownReply": "I don't have a confirmed answer for that yet. Message ICON directly and we'll help.",
    "escalationLabel": "Ask on WhatsApp",
    "kb": [
      { "q": "What is the Icon AI and Creative Bootcamp?", "a": "A 30-day, mobile-first programme covering five practical skills: graphic designing, prompt engineering, image generation, AI automation and AI video generation — built for a cohort of 500 creatives. The core bootcamp runs for 10 days from Saturday 7 November 2026.", "k": ["what is","what's the bootcamp","about","programme","course","overview","bootcamp about"], "w": 1 },
      { "q": "What are the five tracks?", "a": "Graphic Designing (6,000 FCFA), Prompt Engineering (5,000 FCFA), Image Generation (5,000 FCFA), AI Automation (7,000 FCFA) and AI Video Generation (5,000 FCFA). Every price includes the bootcamp completion certificate.", "k": ["tracks","skills","five","learn","subjects","modules","which tracks","graphic","prompt","image","video","automation"], "w": 2 },
      { "q": "What packages are available?", "a": "Five packages: Creative Starter (8,100 FCFA), Automation Starter (9,000 FCFA), Prompt Creator (9,550 FCFA), Creative AI (14,450 FCFA) and Full ICON (18,850 FCFA) — the last includes all five tracks.", "k": ["package","packages","bundle","bundles","combo","group","enrol multiple","creative starter","automation starter","prompt creator","creative ai","full icon","which package"], "w": 3 },
      { "q": "How much does it cost?", "a": "Individual tracks are 5,000–7,000 FCFA each. Packages range from 8,100 to 18,850 FCFA. All prices are in XAF (FCFA) and include the bootcamp completion certificate — there is no separate certificate fee.", "k": ["price","prices","pricing","cost","costs","how much","fee","fees","pay","amount","afafa","fcfa","xaf","how much does","price of","cost of","cheap","discount"], "w": 3 },
      { "q": "When does the Bootcamp start?", "a": "Registration opens Saturday 10 October 2026 and the Bootcamp begins Saturday 7 November 2026. The campaign runs from 10 October to 6 November 2026, and the core bootcamp is 10 days.", "k": ["when","start","starts","begin","date","dates","launch","time","month","november","october","campaign"] },
      { "q": "How long is the programme?", "a": "The full programme is 30 days; the core bootcamp itself runs for 10 days. Each day pairs a recorded session with a practical task, delivered through the private Telegram community (with a Google Drive fallback).", "k": ["how long","duration","30","days","length","period","weeks","10 day","ten day","timetable","schedule","daily"] },
      { "q": "Do I need a laptop?", "a": "No. Every workflow is taught mobile-first and runs on a phone. For AI Automation, Android/Termux is supported and a laptop is optional — never required.", "k": ["laptop","computer","phone","android","termux","device","pc","require","need","mobile"] },
      { "q": "How do I register and pay?", "a": "Choose a track or package, click its enrol button to open our verified Selar product page, and complete payment on Selar. Selar confirms your enrolment and sends your access details — this website does not process or verify payments.", "k": ["register","registration","enrol","enroll","sign up","join","how do i","payment","pay","selar","checkout","buy","purchase","how does payment"] },
      { "q": "What is the free crash course?", "a": "A short, genuinely free introduction to our teaching style — no payment, no trial expiry, no obligation. The exact lessons are confirmed with the Founder and announced on the site.", "k": ["free","crash","crash course","trial","freebie","introduction","starter lesson"] },
      { "q": "Is a certificate included?", "a": "Yes — the 10-Day Bootcamp Completion Certificate is included in every track and package price; there is no separate fee. There is also a separate 10-Day Challenge certificate, earned by successfully completing the limited 10-Day Challenge — it is not issued automatically with bootcamp registration. We don't promise jobs or job guarantees; the focus is on practical, portfolio-ready skills.", "k": ["certificate","certificates","certification","diploma","completion","included","get a certificate","certificate included","certificate fee","do i get a certificate","how do i get a certificate","job","jobs","guarantee","employment","employable","work"], "w": 4 },
      { "q": "What is the 10-Day Challenge?", "a": "A separate, limited-space practical challenge where selected participants build something real. It has its own entry requirements and its own fee, which is announced with the official challenge rules — spaces are limited and are not reserved by bootcamp registration alone.", "k": ["challenge","10 day challenge","ten day challenge","challenge fee","challenge cost","fee for the challenge","how much is the challenge","challenge certificate","build","selected","contest","competition","limited","spaces","apply"], "w": 4 },
      { "q": "Where does the learning happen?", "a": "Paid participants get access to a private Telegram community with dedicated sub-channels for each track, where teaching materials, notes, recordings, announcements and resources are shared. Anyone who cannot use Telegram receives the same essential materials through a private Google Drive arrangement. Access is restricted to registered participants, and the materials are not for resale or redistribution.", "k": ["telegram","drive","google drive","where","learn","learning","delivery","materials","recordings","notes","channel","sub channel","private","access"], "w": 3 },
      { "q": "Is there an affiliate or referral program?", "a": "Yes — the ICON Bootcamp Affiliate Program lets you refer qualified paying participants and earn a commission. You do not need to enrol in the bootcamp yourself to take part. The commission rate, payout rules and eligibility are published once the official affiliate terms are confirmed, and the program is separate from normal bootcamp registration.", "k": ["affiliate","affiliates","referral","refer","commission","earn","ambassador","partner program","refer and earn"], "w": 3 },
      { "q": "How do I contact ICON?", "a": "Call or WhatsApp +237 675 140 957, or email iconstudiosyde@gmail.com.", "k": ["contact","call","whatsapp","email","phone","reach","number","message","help","support","talk"] },
      { "q": "Is there a community or waitlist?", "a": "Yes — you can join the waitlist group to stay updated, and the free crash course is open to everyone.", "k": ["community","waitlist","group","newsletter","updates","follow"] },
      { "q": "Who are the facilitators and mentors?", "a": "Facilitators and mentors are announced closer to the launch date — no names are confirmed yet, so I can't share any. Message ICON directly and we'll help.", "k": ["facilitator","facilitators","mentor","mentors","teacher","teachers","instructor","instructors","tutor","tutors","coach","who teaches","who is teaching","credentials"], "w": 3 },
      { "q": "Is there a discount or early-bird price?", "a": "Launch discounts are planned in three stages — 20% for the first two weeks, then 10%, then 5% — but each stage only applies on its announced dates during the 10 October to 6 November 2026 campaign. Right now I can only confirm the standard prices: tracks 5,000–7,000 FCFA, packages 8,100–18,850 FCFA.", "k": ["discount","discounts","early bird","early-bird","off","sale","promo","promotion","coupon","reduce","cheaper","save","saving","percent","percentage"], "w": 3 }
    ]
  },

  // LEGACY BUNDLES — superseded by the five approved packages above. Kept
  // disabled permanently; the validator fails if any bundle price is ever
  // published while this is false.
  "bundles": { "enabled": false, "items": [] },

  // FACILITATORS — nobody confirmed yet; the section stays neutral. Add
  // verified people only: { "name","role","detail" }.
  "facilitators": { "announced": false, "people": [] },

  // SOCIAL PROOF — honest neutral state until genuine proof exists.
  "socialProof": { "hasProof": false, "testimonials": [] },

  // SPONSORS / PARTNERS — empty until real partners are confirmed.
  "partners": { "enabled": false, "list": [] }
};
