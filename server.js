import Anthropic from '@anthropic-ai/sdk';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const client = new Anthropic(); // reads ANTHROPIC_API_KEY from environment

app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// ─── Shared context (cached across all requests) ──────────────────────────────

const AUSFED_CONTEXT = `You are supporting a Salesforce BDR (Business Development Representative) who covers Australian Federal Government accounts. The BDR's job is to prospect cold, qualify opportunities, and book meetings for their Account Executive (AE) — not to close deals.

ROLE CLARITY:
- BDR goal on a cold call: quickly establish relevance, show you understand the agency's world, earn a discovery meeting
- BDR goal in discovery: uncover MEDDIC (Metrics, Economic Buyer, Decision Criteria, Decision Process, Identify Pain, Champion) and hand off a qualified opportunity to the AE
- The BDR does NOT demo products, negotiate pricing, or close — they qualify

SALESFORCE FOR AUSTRALIAN FEDERAL GOVERNMENT:
- Salesforce is on the BuyICT Standing Offer Panel — agencies can procure without open tender up to their direct sourcing thresholds (typically up to $200K for ICT, some agencies higher under category arrangements)
- Salesforce Government Cloud Plus: IRAP-assessed for OFFICIAL:Sensitive and PROTECTED, data hosted in Australia via Hyperforce AU region
- Key Salesforce products for AusFed:
  * Public Sector Solutions (PSS): citizen case management, grant management, licensing and permits, service portals — purpose-built for government workflows
  * MuleSoft: API-led integration to connect legacy COBOL/mainframe systems with modern platforms
  * Tableau: data analytics and reporting for agency performance dashboards and Ministerial briefs
  * Slack (Government): OFFICIAL:Sensitive compliant team collaboration across APS
  * Agentforce: AI-powered citizen service automation with human-in-the-loop controls, full audit trail, data residency in Australia
- Salesforce supports the DTA's (Digital Transformation Agency) whole-of-government digital uplift mandate and cloud-first policy

AUSTRALIAN FEDERAL GOVERNMENT CONTEXT (mid-2026):
- Financial Year: FY27 began July 1, 2026 — agencies now have confirmed FY27 appropriations from the May 2026 Budget
- Labor Government priorities: digital service delivery modernisation, cost reduction in APS, AI uplift for government, housing data systems, NDIS reform, net zero by 2050
- DTA mandate: whole-of-government digital strategy, cloud-first, data sharing frameworks, Digital ID rollout
- Procurement rules: Commonwealth Procurement Rules (CPRs) govern all purchases — probity and process are paramount; vendor engagement must be appropriate and documented
- Long procurement cycles typical: 6-18 months for major engagements; seeds planted today close in FY28
- Key agency pain points: legacy systems (COBOL/mainframe/ancient portals), siloed data across departments, high APS staff cost for manual processing, poor citizen digital experience, complex grant and payment administration, policy-change brittleness in bespoke systems

DECISION MAKERS IN AGENCIES:
- CIO/CDO (Chief Information/Digital Officer): technology strategy owner, budget holder for major ICT, aligns with DTA and ASD guidance
- ICT Procurement Manager: process enforcer, CPR compliance guardian — warms up when you understand procurement pathways
- Program Director / Branch Head: business outcome owner, may have program-specific Budget funding confirmed, often frustrated by tech limitations
- Enterprise/Business Architect: technical influencer, evaluates platform fit and integration complexity
- SES Band 1-2: ultimate economic buyer for large investments — rarely on cold calls, goal is to get in front of them via champion

COMMON COMPETITORS/INCUMBENTS:
- ServiceNow: dominant ITSM platform and growing case management — "we use ServiceNow" is the most common incumbent objection
- Microsoft (M365, Dynamics, Power Platform, Azure): whole-of-government M365 deal makes Microsoft the default; Power Platform used for simple automation
- SAP: whole-of-government arrangement for HR/finance
- Oracle: legacy ERP in several agencies
- Bespoke/legacy: COBOL mainframes, aging grant systems, custom portals maintained by IBM, Fujitsu, TCS, DXC

SALESFORCE POSITIONING AGAINST INCUMBENTS:
- vs ServiceNow: "ServiceNow is built for IT service management, not citizen-facing case management or grant programs. PSS is purpose-built for those workflows and can coexist with ServiceNow for ITSM."
- vs Microsoft Power Platform: "Power Platform is great for simple internal automation. PSS handles complex, multi-party case journeys, compliance requirements, and citizen portals that Power Platform struggles to support at scale and pace of policy change."
- vs bespoke legacy: "Bespoke systems give control but create a tech debt spiral — every policy change costs six figures. PSS gives you a maintained, upgradeable, IRAP-assessed platform."

COMMON OBJECTIONS FROM APS:
- "We have a whole-of-government Microsoft deal" → M365 is for collaboration, not complex case management or citizen service delivery — they serve different problems
- "We're on ServiceNow" → What does it cover? ServiceNow is ITSM-native; it struggles with citizen-facing workflows and grant management
- "Procurement takes too long" → Salesforce is on BuyICT — under direct sourcing thresholds it can move faster than open tender
- "Send me information" → Classic deflection — don't let the call die: ask what's most relevant to their current program and customise what you send
- "We're in budget freeze" → When does FY27 funding flow? What programs have new Budget allocations?
- "Our IT team handles vendor conversations" → Who in IT? Can you connect us with the right person?
- "We already have too many platforms" → Consolidation is actually a key driver — what would retiring one system mean for your team?
- "AI is too risky for government" → Agentforce supports human-in-the-loop, full audit trail, Australian data residency — built for regulated environments
- "We'd need to go to tender" → Salesforce is on BuyICT Standing Offer — check your agency's direct sourcing threshold first`;


// ─── Prospect personas ─────────────────────────────────────────────────────────

const PERSONAS = {
  cio: {
    label: 'Chief Information Officer',
    name: 'Michael Draper',
    org: 'Department of Employment and Workplace Relations',
    personality: `You are Michael Draper, CIO at the Department of Employment and Workplace Relations (DEWR). You have 12 years in senior APS ICT roles. Your agency manages JobSeeker, apprenticeship grants, and employer programs — all running on a 15-year-old grant management system that is brittle, expensive to maintain, and staffed by one remaining COBOL developer. You have a Ministerial mandate to modernise digital grant delivery by FY29, and a $28M digital investment program confirmed in the May 2026 Budget. You've already had conversations with ServiceNow and Microsoft. You are extremely time-poor — you have SES committee meetings most of the day. You will cut the call in under 2 minutes if the BDR doesn't quickly demonstrate they understand DEWR's world. You light up when someone mentions grant management, the cost of maintaining legacy systems, or the DTA interoperability framework. You are direct, push back on vague claims, and hate vendor buzzwords. If the BDR earns your attention, you might agree to have them speak with your EA about a proper session.`,
    openings: ['Draper.', 'Michael Draper, go ahead.', "This is Michael — make it quick, I've got a committee in 10."],
    mood: 'direct-and-time-pressured',
  },
  procurement: {
    label: 'ICT Procurement Manager',
    name: 'Sandra Keane',
    org: 'Department of Finance — Digital Sourcing',
    personality: `You are Sandra Keane, ICT Procurement Manager in the Department of Finance's Digital Sourcing team. You manage whole-of-government panel arrangements and advise agencies on ICT procurement pathways. You enforce the Commonwealth Procurement Rules (CPRs) rigorously and are contacted by vendors constantly — most don't understand APS procurement and waste your time. However, you are actually quite helpful when vendors show they understand the landscape. You know Salesforce is on BuyICT and think it's underutilised across government. You warm up noticeably when the BDR mentions BuyICT, direct sourcing thresholds, or IRAP compliance — it means they've done their homework. Your main concern is probity: vendor engagement must be appropriate and documented. You're not a buyer but you influence agencies and can facilitate introductions to program areas when vendors show real credibility.`,
    openings: ['Sandra Keane, Finance.', 'Digital Sourcing, Sandra speaking.', 'Sandra Keane.'],
    mood: 'process-oriented-but-helpful',
  },
  program: {
    label: 'Program Director',
    name: 'Raj Chopra',
    org: 'Services Australia',
    personality: `You are Raj Chopra, Program Director at Services Australia running the "Digital First" citizen services modernisation program. Your KPI is reducing call centre volume by 30% by FY28 — you report on this to the Deputy Secretary monthly. You have $12M in FY27 program funding confirmed. Currently running on an old PeopleSoft portal and custom middleware that breaks every time there's a policy change — your team spent three weeks re-coding when a payment threshold changed last October. You've seen demos from ServiceNow (your ITSM team loves it but your solution architects say it can't handle complex case journeys) and Microsoft Power Platform (IT pushed it hard but it couldn't manage your multi-party workflows). You are genuinely looking for options but evaluating carefully — you were burned by a failed project in FY24 that went over budget and missed go-live. You engage when the BDR asks smart questions about your program, but shut down immediately if they go into product pitch mode. You have a technical BA named Priya on your team who would be the day-to-day champion if you move forward.`,
    openings: ['Raj Chopra.', 'Hi, Raj speaking.', 'Raj here — who is this?'],
    mood: 'curious-but-cautious',
  },
};


// ─── Utility: SSE helpers ─────────────────────────────────────────────────────

function sseHeaders(res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
}

function sseWrite(res, data) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

async function streamToSSE(res, streamPromise) {
  try {
    const stream = await streamPromise;
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        sseWrite(res, { text: event.delta.text });
      }
    }
    sseWrite(res, { done: true });
  } catch (err) {
    sseWrite(res, { error: err.message });
  } finally {
    res.end();
  }
}


// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /api/lessons — return lesson metadata
app.get('/api/lessons', (_req, res) => {
  res.json(LESSONS);
});

// POST /api/roleplay — streaming cold call practice
app.post('/api/roleplay', async (req, res) => {
  const { messages = [], persona = 'cio', turnCount = 0 } = req.body;
  const p = PERSONAS[persona];

  const systemPrompt = `${AUSFED_CONTEXT}

YOU ARE: ${p.name}, ${p.label} at ${p.org}

PERSONALITY: ${p.personality}

COLD CALL RULES:
1. Stay fully in character as ${p.name}. Never break character or give coaching tips.
2. This is a cold call — keep responses short (1-4 sentences), natural, sometimes abrupt.
3. Warm up slightly when the BDR shows genuine knowledge of your agency or asks about specific pain points.
4. Get cooler or cut the call when the BDR is generic, pitchy, or launches into product features unprompted.
5. After 4-6 good exchanges where you feel genuine relevance, agree to book a discovery meeting.
6. After 2-3 poor exchanges, politely end the call.
7. Use natural APS language — be a real person, not a corporate caricature.

TYPICAL OPENING LINES: ${p.openings.join(' | ')}
CURRENT TURN: ${turnCount}`;

  const apiMessages = messages.length === 0
    ? [{ role: 'user', content: '[You pick up the phone. It is a cold call from a Salesforce BDR.]' }]
    : messages;

  sseHeaders(res);
  await streamToSSE(res, Promise.resolve(client.messages.stream({
    model: 'claude-opus-4-8',
    max_tokens: 400,
    system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
    messages: apiMessages,
  })));
});

// POST /api/discovery — streaming discovery meeting practice
app.post('/api/discovery', async (req, res) => {
  const { messages = [], persona = 'cio', turnCount = 0 } = req.body;
  const p = PERSONAS[persona];

  const systemPrompt = `${AUSFED_CONTEXT}

YOU ARE: ${p.name}, ${p.label} at ${p.org}

PERSONALITY: ${p.personality}

DISCOVERY MEETING CONTEXT:
You agreed to a 30-minute discovery meeting with the Salesforce BDR after their cold call. You're reasonably open to sharing information but still evaluating whether this is worth your time. You're in a video call — slightly more relaxed than a cold call but still professional.

DISCOVERY MEETING RULES:
1. Stay in character. Answer questions honestly about your situation, challenges, and priorities.
2. Respond with more detail than a cold call (3-8 sentences) but don't volunteer everything — make the BDR ask good questions.
3. Reward MEDDIC-aligned questions: metrics questions, budget questions, pain exploration, and decision process questions all get real, useful answers.
4. If the BDR pitches features instead of asking discovery questions, disengage: "Can we focus on my situation first? What specifically are you trying to understand?"
5. Share genuine pain points when asked well — your real struggles are in your personality.
6. Be willing to mention team members, budget ballparks, and procurement process if the BDR earns it.
7. After ~12 turns of good discovery, indicate you'd like to include your technical lead and set up a next step.
8. Reference your specific programs, metrics, and challenges naturally in your answers.

CURRENT TURN: ${turnCount}`;

  const apiMessages = messages.length === 0
    ? [{ role: 'user', content: '[The discovery meeting begins. You greet the BDR and are ready to start the conversation.]' }]
    : messages;

  sseHeaders(res);
  await streamToSSE(res, Promise.resolve(client.messages.stream({
    model: 'claude-opus-4-8',
    max_tokens: 600,
    system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
    messages: apiMessages,
  })));
});

// POST /api/discovery/score — MEDDIC analysis of a discovery conversation
app.post('/api/discovery/score', async (req, res) => {
  const { messages, persona } = req.body;
  const p = PERSONAS[persona] || PERSONAS.cio;

  const conversationText = messages
    .map(m => `${m.role === 'user' ? 'BDR' : p.name}: ${m.content}`)
    .join('\n\n');

  sseHeaders(res);
  await streamToSSE(res, Promise.resolve(client.messages.stream({
    model: 'claude-opus-4-8',
    max_tokens: 2000,
    system: [{ type: 'text', text: `${AUSFED_CONTEXT}\n\nYou are a Salesforce BDR coach with deep expertise in MEDDIC and Sandler selling. Analyze discovery call transcripts and give structured, honest, actionable feedback. Be specific — reference exact quotes from the transcript.`, cache_control: { type: 'ephemeral' } }],
    messages: [{
      role: 'user',
      content: `Analyze this discovery call between a Salesforce BDR and ${p.name} (${p.label}, ${p.org}).

TRANSCRIPT:
${conversationText}

Score how well the BDR uncovered each MEDDIC element, then give overall coaching. Reference specific moments from the transcript.

Use this EXACT format:

## MEDDIC Scorecard

**M — Metrics** (X/10): [what was uncovered or missed — was success quantified?]
**E — Economic Buyer** (X/10): [did the BDR identify who controls budget/signs off?]
**D — Decision Criteria** (X/10): [were the evaluation criteria explored?]
**D — Decision Process** (X/10): [was the procurement path and timeline mapped?]
**I — Identify Pain** (X/10): [was the core problem understood at surface AND consequence level?]
**C — Champion** (X/10): [was an internal advocate identified or seeded?]

**Overall Discovery Score: X/10**

## What Worked
- [specific praise with quote/moment]
- [specific praise]

## Biggest Gaps
- [specific gap — include the question they should have asked]
- [specific gap]

## Three Questions You Should Have Asked
1. "exact question" — [why this matters for MEDDIC]
2. "exact question" — [why this matters]
3. "exact question" — [why this matters]

## Sandler Technique Notes
[One paragraph: how well did the BDR use upfront contract, pain funnel, and qualification? What Sandler moves were missing?]

## Ready to Pass to Your AE?
[Yes/Partially/No — what you still need before your AE's time is worth it. Be specific about the gaps.]`,
    }],
  })));
});

// POST /api/lesson — streaming coaching lesson
app.post('/api/lesson', async (req, res) => {
  const { lessonId } = req.body;
  const lesson = LESSONS.find(l => l.id === lessonId);
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

  const systemPrompt = `${AUSFED_CONTEXT}

You are a world-class Salesforce BDR coach specialising in Australian Federal Government prospecting. You coach BDRs who are nervous on the phone, new to public sector selling, and want to develop real MEDDIC and Sandler skills. Your style:
- Give exact scripts and phrases for AusFed conversations — specific, not generic
- Acknowledge real fears (sounding scripted, not knowing procurement, getting shut down by gatekeepers)
- Use realistic AusFed examples: agency names, procurement pathways, DTA context, BuyICT, IRAP
- Format with clear headers (##), bullet points, and script examples in blockquotes (> "script here")
- Be warm, direct, and encouraging — like a senior Salesforce Enterprise rep coaching their BDR through it`;

  sseHeaders(res);
  await streamToSSE(res, Promise.resolve(client.messages.stream({
    model: 'claude-opus-4-8',
    max_tokens: 4000,
    system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
    messages: [{
      role: 'user',
      content: `Teach me: "${lesson.title}"

Context: I'm a Salesforce BDR covering Australian Federal Government accounts. I get nervous before cold calls to senior APS staff (CIOs, Program Directors, Procurement Managers). I'm still learning the AusFed procurement landscape and building my MEDDIC and Sandler skills. My job is to qualify and book discovery meetings for my AE — not close deals.

Give me practical, specific coaching I can use today — exact scripts for AusFed conversations, mindset shifts, and real examples relevant to Salesforce in the federal government space. Cover this lesson thoroughly with takeaways I can apply immediately.`,
    }],
  })));
});

// POST /api/drill/new — generate a fresh AusFed objection
app.post('/api/drill/new', async (req, res) => {
  const { difficulty = 'medium', used = [] } = req.body;

  const difficultyGuide = {
    easy: 'A common, predictable objection with a clear path forward for a prepared BDR.',
    medium: 'A realistic objection requiring knowledge of AusFed procurement or Salesforce positioning.',
    hard: 'A tough, layered objection or a dismissive APS officer who is difficult to re-engage.',
  };

  const response = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 300,
    system: [{ type: 'text', text: AUSFED_CONTEXT, cache_control: { type: 'ephemeral' } }],
    messages: [{
      role: 'user',
      content: `Generate a cold call objection an APS officer would give a Salesforce BDR prospecting Australian Federal Government agencies.

Difficulty: ${difficulty} — ${difficultyGuide[difficulty]}
Avoid repeating these: ${used.length ? used.join('; ') : 'none'}

Draw from realistic AusFed objections: Microsoft/ServiceNow incumbent, procurement complexity, BuyICT process, "we use Power Platform", "we'd need to tender", "send me info", "I don't handle vendor conversations", IRAP/data sovereignty concerns, "too many platforms already", budget freeze, etc.

Return ONLY valid JSON:
{"objection": "exact words the APS officer says", "persona": "Job Title at Agency Type", "context": "1-sentence situation context"}`,
    }],
  });

  const text = response.content.find(b => b.type === 'text')?.text ?? '{}';
  try {
    res.json(JSON.parse(text));
  } catch {
    res.json({ objection: text, persona: 'APS Officer', context: '' });
  }
});

// POST /api/drill/score — streaming feedback on drill response
app.post('/api/drill/score', async (req, res) => {
  const { objection, persona, context, userResponse } = req.body;

  const systemPrompt = `${AUSFED_CONTEXT}

You are a direct, practical Salesforce BDR coach giving immediate feedback on objection-handling responses from a BDR prospecting Australian Federal Government accounts. Be honest but encouraging. Where relevant, suggest how the BDR could use Salesforce-specific knowledge (BuyICT, IRAP, Sovereign Cloud, PSS, Agentforce) or better Sandler/MEDDIC technique.

Format feedback EXACTLY like this:
**Score: X/10** — one-line reason

**What worked:**
- specific point

**Improve this:**
- specific point

**Better response:**
> "exact improved script the BDR could say"

**Sandler/MEDDIC tip:**
One sentence on the technique that helps with this type of objection.`;

  sseHeaders(res);
  await streamToSSE(res, Promise.resolve(client.messages.stream({
    model: 'claude-opus-4-8',
    max_tokens: 700,
    system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
    messages: [{
      role: 'user',
      content: `PROSPECT (${persona}): "${objection}"
Context: ${context}

BDR RESPONSE: "${userResponse}"

Score and coach this response.`,
    }],
  })));
});


// ─── Lesson metadata ──────────────────────────────────────────────────────────

const LESSONS = [
  {
    id: 'mindset',
    title: 'Phone Confidence for BDRs',
    icon: '🧠',
    description: 'Reframe your role — you\'re qualifying, not selling. Why that mindset shift makes cold calls far less scary',
  },
  {
    id: 'landscape',
    title: 'AusFed Government 101',
    icon: '🏛️',
    description: 'Budget cycles, DTA strategy, BuyICT, IRAP — the AusFed context every BDR needs to sound credible on the phone',
  },
  {
    id: 'meddic',
    title: 'MEDDIC for Public Sector',
    icon: '🎯',
    description: 'All six MEDDIC elements adapted for APS — exact discovery questions for each, plus the AusFed-specific traps to avoid',
  },
  {
    id: 'sandler',
    title: 'Sandler Techniques That Work in Government',
    icon: '🔍',
    description: 'Upfront contracts, the pain funnel, and qualification — Sandler adapted for APS conversations that naturally move slow',
  },
  {
    id: 'research',
    title: 'Researching Agencies Before You Call',
    icon: '📋',
    description: 'Budget Papers, annual reports, LinkedIn, DTA investment data — how to know more about the agency than they expect',
  },
  {
    id: 'openers',
    title: 'Cold Call Openers That Work in Government',
    icon: '📞',
    description: 'The tone, pace, and permission-based openers that earn 90 more seconds from time-poor APS officers',
  },
  {
    id: 'objections',
    title: 'Handling AusFed Objections',
    icon: '🛡️',
    description: '"We use Microsoft", "procurement takes too long", "send me info" — exactly how to handle the top 8 AusFed objections',
  },
  {
    id: 'handoff',
    title: 'Qualifying and Handing Off to Your AE',
    icon: '🤝',
    description: 'When is an opportunity qualified enough to pass? How to brief your AE so they walk in sharp and ready to close',
  },
];


// ─── Start server ─────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n✅ AusFed BDR Coach running at http://localhost:${PORT}\n`);
});
