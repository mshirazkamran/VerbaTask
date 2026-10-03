import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  WidthType,
  ShadingType,
} from 'docx';
import fs from 'fs';
import path from 'path';

const THEME_PRIMARY = '059669'; // Emerald Green
const THEME_DARK = '0F172A';    // Slate Dark
const THEME_LIGHT_BG = 'F0FDF4';// Mint Light
const THEME_MUTED = '64748B';   // Gray Muted
const BORDER_COLOR = 'CBD5E1';  // Light border

function createHeading1(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 150 },
    run: {
      bold: true,
      color: THEME_PRIMARY,
      size: 32, // 16pt
      font: 'Arial',
    },
  });
}

function createHeading2(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 100 },
    run: {
      bold: true,
      color: THEME_DARK,
      size: 26, // 13pt
      font: 'Arial',
    },
  });
}

function createHeading3(text) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 80 },
    run: {
      bold: true,
      color: '334155',
      size: 22, // 11pt
      font: 'Arial',
    },
  });
}

function createParagraph(text, options = {}) {
  return new Paragraph({
    spacing: { after: 120, line: 276 }, // 1.15 line spacing
    children: [
      new TextRun({
        text,
        size: 20, // 10pt
        font: 'Arial',
        color: options.color || '334155',
        bold: options.bold || false,
        italics: options.italics || false,
      }),
    ],
  });
}

function createBullet(text, boldPrefix = '') {
  const children = [];
  if (boldPrefix) {
    children.push(
      new TextRun({
        text: boldPrefix + ' ',
        bold: true,
        size: 20,
        font: 'Arial',
        color: THEME_DARK,
      })
    );
  }
  children.push(
    new TextRun({
      text,
      size: 20,
      font: 'Arial',
      color: '334155',
    })
  );

  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 80 },
    children,
  });
}

function createCallout(title, text) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 8, color: THEME_PRIMARY },
      bottom: { style: BorderStyle.SINGLE, size: 8, color: THEME_PRIMARY },
      left: { style: BorderStyle.SINGLE, size: 24, color: THEME_PRIMARY },
      right: { style: BorderStyle.SINGLE, size: 8, color: THEME_PRIMARY },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: THEME_LIGHT_BG, type: ShadingType.CLEAR },
            margins: { top: 120, bottom: 120, left: 160, right: 160 },
            children: [
              new Paragraph({
                spacing: { after: 60 },
                children: [
                  new TextRun({
                    text: title,
                    bold: true,
                    size: 20,
                    font: 'Arial',
                    color: THEME_PRIMARY,
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text,
                    size: 19,
                    font: 'Arial',
                    color: '1E293B',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function createStyledTable(headers, rows, colWidths = []) {
  const headerRow = new TableRow({
    children: headers.map((h, i) =>
      new TableCell({
        shading: { fill: THEME_PRIMARY, type: ShadingType.CLEAR },
        margins: { top: 100, bottom: 100, left: 120, right: 120 },
        width: colWidths[i] ? { size: colWidths[i], type: WidthType.PERCENTAGE } : undefined,
        children: [
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [
              new TextRun({
                text: h,
                bold: true,
                color: 'FFFFFF',
                size: 19,
                font: 'Arial',
              }),
            ],
          }),
        ],
      })
    ),
  });

  const bodyRows = rows.map((r, rowIdx) =>
    new TableRow({
      children: r.map((cellText, i) =>
        new TableCell({
          shading: {
            fill: rowIdx % 2 === 0 ? 'F8FAFC' : 'FFFFFF',
            type: ShadingType.CLEAR,
          },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          width: colWidths[i] ? { size: colWidths[i], type: WidthType.PERCENTAGE } : undefined,
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: cellText,
                  size: 18,
                  font: 'Arial',
                  color: '334155',
                }),
              ],
            }),
          ],
        })
      ),
    })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
      left: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
      right: { style: BorderStyle.SINGLE, size: 4, color: BORDER_COLOR },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: 'E2E8F0' },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [headerRow, ...bodyRows],
  });
}

async function buildDocument() {
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 }, // 1 inch
          },
        },
        children: [
          // Title Banner
          new Paragraph({
            text: 'VerbaTask: Retail Voice OS',
            spacing: { after: 60 },
            run: {
              bold: true,
              size: 44, // 22pt
              font: 'Arial',
              color: THEME_PRIMARY,
            },
          }),
          new Paragraph({
            text: 'Comprehensive Cost-Benefit Analysis (CBA), Low-Price Unit Economics & Strategic Execution Roadmap',
            spacing: { after: 200 },
            run: {
              bold: true,
              size: 24, // 12pt
              font: 'Arial',
              color: THEME_MUTED,
            },
          }),
          createParagraph('Prepared for: Founders & Strategic Leadership | Currency Base: 1 USD = 280 PKR | Date: October 2026', { italics: true, color: '64748B' }),

          new Paragraph({ spacing: { after: 200 } }),

          // ==========================================
          // SECTION 1: COST-BENEFIT ANALYSIS & FINANCIAL FEASIBILITY
          // ==========================================
          createHeading1('SECTION 1: Cost-Benefit Analysis (CBA) & Low-Price Feasibility'),

          createHeading2('1.1 Executive Summary & Core Premise'),
          createParagraph(
            'VerbaTask is designed to disrupt Pakistani informal retail (kiryana, general stores, pharmacies, bakeries, wholesalers) by replacing expensive, rigid POS hardware with a frictionless Voice Operating System running on WhatsApp. Instead of buying a desktop computer, UPS, barcode scanner, and software license, the merchant speaks in natural Urdu, Roman Urdu, or English to record sales, manage inventory, check stock, and receive automated financial reports.'
          ),
          createParagraph(
            'To achieve rapid, monopolistic adoption across suburban and urban bazaars, the business model hinges on a 14-Day Free Trial followed by an accessible startup subscription model starting at PKR 499/month (or PKR 299/month for micro-merchants). This analysis proves the exact financial viability, profit margins, and cost safety nets at scale.'
          ),

          createHeading2('1.2 Granular Cost Breakdown: Every API & Infrastructure Component'),
          createParagraph(
            'Below is the exact, unbundled breakdown of every single cost component required to run VerbaTask per month, both on a fixed platform level and a per-transaction variable level.'
          ),

          createHeading3('A. Fixed Infrastructure Costs (Platform Level)'),
          createStyledTable(
            ['Cost Component', 'Provider & Specification', 'Monthly Cost (USD)', 'Monthly Cost (PKR)', 'Capacity / Notes'],
            [
              ['Backend VPS', 'Hetzner Cloud CPX21 (3 vCPU, 4GB RAM, 80GB NVMe)', '$6.00', 'Rs. 1,680', 'Handles 250+ active concurrent merchants easily via Node.js cluster.'],
              ['Frontend Hosting', 'Netlify / Vercel (Hobby Tier)', '$0.00', 'Rs. 0', '100GB bandwidth included free; static SPA dashboard has negligible bandwidth.'],
              ['Primary Database', 'MongoDB Atlas (Shared M0 ➔ Serverless M2)', '$0.00', 'Rs. 0', 'Free tier stores ~50,000 orders/items. Dedicated M2 ($9/mo) needed only after 30+ paying shops.'],
              ['Domain Registration', 'Cloudflare Registrar (.com domain)', '$0.82', 'Rs. 230', '$9.77/year billed annually; zero markup wholesale pricing.'],
              ['SSL & DDoS Protection', 'Cloudflare Universal SSL & Edge CDN', '$0.00', 'Rs. 0', 'Enterprise-grade edge encryption and caching at zero charge.'],
              ['Total Fixed Overhead', 'Base Infrastructure Baseline', '$6.82 / mo', 'Rs. 1,910 / mo', 'Total platform running cost is under PKR 2,000/month for the whole company.'],
            ],
            [22, 30, 16, 16, 16]
          ),

          new Paragraph({ spacing: { after: 150 } }),

          createHeading3('B. Variable Costs (Per Transaction & Per Merchant)'),
          createParagraph('Assumptions: Average merchant processes 35 voice notes/day = ~1,000 voice transactions/month. Average voice note duration = 6 seconds (~80 words of spoken Urdu/English).'),

          createStyledTable(
            ['Service Layer', 'Provider & Model', 'Unit Pricing (USD)', 'Cost Per 1,000 Orders (PKR)', 'Cost Optimization Strategy'],
            [
              [
                'Speech-to-Text (STT)',
                'Groq Cloud Whisper (whisper-large-v3)',
                '$0.000185 / second (Free tier: 2,000 req/day)',
                'Rs. 0 (Free) or Rs. 310 (Paid)',
                'First 60,000 audio files/month free on Groq. Paid rate is only ~Rs. 0.31 per 6s voice note.',
              ],
              [
                'LLM Intent Parsing',
                'Gemini 2.0 Flash / Groq Qwen-2.5 70B',
                '$0.10 / 1M input tokens, $0.40 / 1M output tokens',
                'Rs. 12.60 / month',
                'Average request uses 250 input and 50 output tokens. Negligible fractional cent cost.',
              ],
              [
                'Spoken Audio Replies (TTS)',
                'Microsoft Edge Neural TTS (ur-PK-UzmaNeural)',
                '$0.00 (Free unlimited WebSocket synthesis)',
                'Rs. 0 / month',
                'Zero cost streaming natural Pakistani Urdu voice. Fallback to Google TTS is free.',
              ],
              [
                'WhatsApp Cloud API (Meta)',
                'Meta Graph API v20.0 (User-Initiated Service)',
                'First 1,000 Service Conversations/mo FREE; then $0.019 / 24h session',
                'Rs. 0 (Within 1,000 free) or Rs. 159 (Paid)',
                'Meta only charges once per 24h window regardless of message count. 1,000 free sessions/month pooled.',
              ],
              [
                'Total Variable Cost',
                'Blended Cost Per Active Merchant',
                '~$1.15 - $1.70 / merchant / mo',
                'Rs. 322 - Rs. 482 / merchant / mo',
                'With free tier credits, early unit cost drops to under Rs. 15 per merchant/month.',
              ],
            ],
            [18, 24, 24, 18, 16]
          ),

          new Paragraph({ spacing: { after: 150 } }),

          createHeading2('1.3 The Startup Low-Price Strategy: Viability of PKR 499 & PKR 299/mo'),
          createParagraph(
            'Can VerbaTask survive, grow, and remain highly profitable if we price at PKR 499 or even PKR 299 per month?'
          ),
          createBullet(
            'At PKR 499/month ($1.78): A small merchant generates ~500 transactions/month (costing ~PKR 160 in APIs). Net gross profit is PKR 339/month per shop (68% Gross Margin).',
            'Financial Viability at PKR 499:'
          ),
          createBullet(
            'At PKR 299/month ($1.07): For micro-kiosks and roadside vendors (capped at 250 transactions/mo, API cost ~PKR 80). Net profit is PKR 219/month per shop (73% Gross Margin).',
            'Financial Viability at PKR 299:'
          ),
          createBullet(
            'Zero Risk Free Trial: A 14-day free trial consumes ~250 voice notes. Total out-of-pocket cost burned by VerbaTask during the 2-week trial is only PKR 40 to 80 (cheaper than a single cup of tea).',
            'Free Trial Cost Exposure:'
          ),

          new Paragraph({ spacing: { after: 100 } }),
          createCallout(
            'KEY STRATEGIC TAKEAWAY ON LOW PRICING',
            'Pricing at PKR 499 removes all psychological barriers to entry. In Pakistan, local kiryana stores happily spend PKR 500-1,000/month on mobile scratch cards and load. At PKR 499/month, the value of saving 2 hours of daily bookkeeping manual labor delivers an instant 10x Return on Investment (ROI).'
          ),

          new Paragraph({ spacing: { after: 150 } }),

          createHeading2('1.4 Value Metrics & Charging Factors: Big Stores vs Small Stores'),
          createParagraph(
            'A flat price model creates an imbalance: a mega cash & carry doing 400 sales/day costs significantly more in API tokens and database I/O than a corner milk shop doing 15 transactions/day. To maximize revenue while protecting margins, VerbaTask must charge based on specific Value Metrics.'
          ),

          createStyledTable(
            ['Pricing Tier', 'Monthly Fee (PKR)', 'Target Merchant Profile', 'Transaction Cap', 'Catalog / SKU Limit', 'Multi-User & Features'],
            [
              ['Dukan Lite (Micro)', 'Rs. 299 / month', 'Milk shops, fruit vendors, pan kiosks', '300 voice notes / mo (~10/day)', 'Up to 50 items', 'Single WhatsApp phone, basic stock tracking.'],
              ['Kiryana Starter', 'Rs. 499 / month', 'Standard corner grocer, boutique, salon', '750 voice notes / mo (~25/day)', 'Up to 250 items', 'WhatsApp receipts, stock alerts, voice replies.'],
              ['Retail Pro (Growth)', 'Rs. 999 / month', 'Busy mini-mart, pharmacy, auto parts', '2,000 voice notes / mo (~65/day)', 'Up to 1,000 items', 'Instant PDF reports, real-time web dashboard, price updates.'],
              ['Superstore / Mart', 'Rs. 2,499 - 4,999 / mo', 'Multi-counter mart, wholesale distributor', 'Unlimited voice notes', 'Unlimited SKUs', 'Multiple cashier phones, thermal printer integration, API sync.'],
            ],
            [16, 16, 22, 18, 14, 14]
          ),

          new Paragraph({ spacing: { after: 150 } }),

          createHeading2('1.5 How to Win Against Traditional PC + Bluetooth Thermal Printer Setups'),
          createParagraph(
            'A common objection when pitching to larger retail stores is: "Humare paas pehle se desktop computer, barcode scanner aur Bluetooth thermal receipt printer laga hua hai. Hum aapka software kyun lein?"'
          ),
          createParagraph(
            'Here is the complete competitive positioning matrix showing how VerbaTask wins, differentiates, and coexists:'
          ),

          createBullet(
            'A desktop setup requires PKR 60,000 - 120,000 upfront (PC, monitor, barcode gun, thermal printer, UPS battery inverter). VerbaTask requires zero hardware capex — it runs on the smartphone the merchant already carries in their pocket.',
            'Zero Hardware Capex vs Heavy Upfront Cost:'
          ),
          createBullet(
            'Pakistani urban and rural markets face 2-6 hours of daily electricity load shedding. Desktop PCs shut down or drain UPS batteries quickly. VerbaTask works on 4G mobile battery uninterrupted.',
            'Load Shedding & Power Outage Resiliency:'
          ),
          createBullet(
            'During 6:00 PM - 9:00 PM peak bazaar rush, scanning 8 barcodes takes 45 seconds while customers crowd the counter. With VerbaTask, the cashier speaks "2 chawal 1 daal 3 ghee cash" in 2 seconds while bagging items. Order is logged hands-free.',
            'Peak Hour Rush Velocity:'
          ),
          createBullet(
            'Paper rolls cost PKR 80-120 per roll; a busy shop burns PKR 2,000 - 3,500 every month just on thermal paper! Furthermore, 90% of customers throw the paper slip away. VerbaTask delivers a clean WhatsApp digital receipt directly to the customer’s phone.',
            'Thermal Paper Cost Elimination:'
          ),
          createBullet(
            'Traditional desktop POS systems keep business data locked inside the shop hard drive. If the owner is at home or traveling, they have zero idea of today’s cash drawer balance. VerbaTask’s cloud dashboard provides real-time Socket.IO sales telemetry anywhere in the world on any phone or browser.',
            'Remote Owner Visibility (Zero-Blindspot Telemetry):'
          ),
          createBullet(
            'We don’t even have to replace their thermal printer! Through the Web Bluetooth API / ESC-POS browser bridge, VerbaTask can trigger instant thermal paper printing on their existing 58mm/80mm Bluetooth printer if an elderly customer insists on a physical paper receipt.',
            'Thermal Printer Hybrid Coexistence:'
          ),

          new Paragraph({ spacing: { after: 200 } }),

          // ==========================================
          // SECTION 2: DEVELOPMENT & EXECUTION PLAN (STEPS 1 & 2)
          // ==========================================
          createHeading1('SECTION 2: Development & Execution Plan (Steps 1 & 2)'),

          createHeading2('2.1 Step 1: Dynamic AI Workflow (Eliminating the Urdu Jugaarr)'),
          createParagraph(
            'The current prototype relied on hardcoded grocery string dictionaries (`BILINGUAL_GROUPS`, static Whisper prompts, and regex keyword stripping). This broke when applied to medical stores, auto parts, clothing, or non-standard dialects. Today’s refactor replaces all heuristic hacks with a generalized, catalog-aware AI engine.'
          ),

          createHeading3('Architecture of the Clean AI Workflow:'),
          createBullet(
            'When audio arrives, the backend fetches the merchant’s top 100 active inventory item names from MongoDB and injects them dynamically into the Whisper STT vocabulary prompt. Whisper transcribes the shop’s specific inventory terms with extreme precision.',
            '1. Dynamic Context-Aware Transcription:'
          ),
          createBullet(
            'A unified, single-pass system prompt instructs the LLM (Qwen-2.5 / Gemini) to extract structured JSON (action, item, quantity, unit, price, payment channel). The prompt is domain-agnostic and natively processes Urdu script, Roman Urdu, and English simultaneously.',
            '2. Domain-Agnostic Intent Parsing:'
          ),
          createBullet(
            'Eliminates all hardcoded word arrays. Instead, it matches spoken names against the merchant’s database using phonetic string similarity (Levenshtein + phonetic normalization) and falls back to a second-stage LLM semantic resolver only when ambiguous.',
            '3. Smart Catalog Resolver:'
          ),
          createBullet(
            'When a merchant confirms a disambiguation (e.g. "daal mash" = "Maash Pulse 1kg"), the system saves an alias directly in the item’s document in MongoDB for instant O(1) matching next time.',
            '4. Merchant Self-Learning Aliases:'
          ),

          new Paragraph({ spacing: { after: 150 } }),

          createHeading2('2.2 Step 2: 14-Day Free Trial Engine & Tiered Subscription Architecture'),
          createParagraph(
            'To enable the 2-week free trial pitch and automated conversion to paying plans, we implement the complete subscription and quota lifecycle directly into the core engine.'
          ),

          createHeading3('Core Technical Deliverables for Step 2:'),
          createBullet(
            'Extend the Merchant model with `subscriptionPlan` (trial, starter_499, pro_999, mart_2499), `subscriptionStatus` (trialing, active, past_due, expired), `trialStartDate`, `trialEndDate` (Date.now() + 14 days), `monthlyTransactionCount`, and `monthlyTransactionLimit`.',
            '1. Merchant Schema Upgrades:'
          ),
          createBullet(
            'Middleware intercepts incoming WhatsApp voice/text messages. If `subscriptionStatus === "expired"`, it gently replies: "Aapka 14-day free trial mukammal ho chuka hai. Service jari rakhne ke liye package select karein: [Link]".',
            '2. Automated Trial Guard Middleware:'
          ),
          createBullet(
            'Add a top countdown banner on the web dashboard: "11 days remaining in your free trial". On Day 12 and Day 14, automated WhatsApp alerts prompt the merchant to renew.',
            '3. Dashboard Trial Telemetry & Alerts:'
          ),
          createBullet(
            'For Phase 1 (instant zero-friction launch): Generate a dedicated Billing page on the web dashboard showing JazzCash / EasyPaisa / Raast QR codes and account details. Merchant uploads proof or transaction ID, which activates the account instantly. For Phase 2: Safepay / PayMob automated recurring checkout.',
            '4. Localized Payment Activation Engine:'
          ),

          new Paragraph({ spacing: { after: 150 } }),

          createHeading2('2.3 Summary of Today’s Implementation Roadmap'),
          createStyledTable(
            ['Stage', 'Focus Area', 'Files Affected', 'Deliverables'],
            [
              [
                'Stage 1',
                'Dynamic Catalog-Aware AI Pipeline',
                'backend/src/agent/transcribeAndParse.js\nbackend/src/services/qwen.service.js\nbackend/src/crm/item-matching.js',
                'Remove hardcoded grocery dictionaries. Inject live inventory vocabulary into Whisper. Generalized LLM extraction for any retail vertical.',
              ],
              [
                'Stage 2',
                '14-Day Free Trial & Subscription Engine',
                'backend/src/models/Merchant.js\nbackend/src/controllers/whatsapp.controller.js\nfrontend/src/pages/Dashboard.jsx\nfrontend/src/pages/BillingPage.jsx',
                'Trial countdowns, usage meters, expired account barriers, WhatsApp reminders, and localized EasyPaisa/JazzCash activation screen.',
              ],
            ],
            [15, 25, 30, 30]
          ),

          new Paragraph({ spacing: { after: 200 } }),
          createCallout(
            'NEXT STEP CONFIRMATION',
            'This Cost-Benefit Analysis and Execution Plan is fully compiled into this Word document. Once reviewed, provide the development kickoff signal to begin implementing Stage 1 (Dynamic AI Workflow) and Stage 2 (14-Day Trial & Subscription Engine).'
          ),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);

  const paths = [
    '/home/soban-iftikhar/Projects/VerbaTask/VerbaTask_Cost_Benefit_Analysis_and_Plan.docx',
    '/home/soban-iftikhar/Projects/VerbaTask/frontend/public/VerbaTask_Cost_Benefit_Analysis_and_Plan.docx',
    '/home/soban-iftikhar/.gemini/antigravity/brain/eb63d097-f8e8-4baf-8604-99c53610e29a/VerbaTask_Cost_Benefit_Analysis_and_Plan.docx',
  ];

  paths.forEach((p) => {
    fs.writeFileSync(p, buffer);
    console.log(`Document written to: ${p}`);
  });
}

buildDocument().catch((err) => {
  console.error('Error generating docx:', err);
  process.exit(1);
});
