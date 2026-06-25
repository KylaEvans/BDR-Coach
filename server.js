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


// ─── State Government Context ─────────────────────────────────────────────────

const STATE_CONTEXT = `You are supporting a Salesforce BDR who covers State Government accounts in New South Wales and other Australian states. The BDR's job is to prospect cold, qualify opportunities, and book meetings for their Account Executive — not to close deals.

ROLE CLARITY:
- BDR goal on a cold call: quickly establish relevance, show you understand the agency's world, earn a discovery meeting
- BDR goal in discovery: uncover MEDDIC elements and hand off a qualified opportunity to the AE
- The BDR does NOT demo products, negotiate pricing, or close deals

STATE GOVERNMENT CONTEXT (FY27):
- New Whole-of-Government Cloud Computing Policy takes effect 1 July 2026 — agencies must justify cloud spend
- APS AI Plan 2025 mandates all agencies to operationalise AI and prove ROI
- Microsoft 5-year VSA starting July 2026 — BDRs must understand where Salesforce Agentforce sits relative to that
- NSW Cyber Security Strategy 2026–2028 is live — state CIOs mandated to improve cyber resilience
- Salesforce Government Cloud and data residency in Australia are key differentiators
- Major Digital Projects Report 2026 confirms active legacy system replacement across multiple sectors
- Key pain: AI mandate with no clear roadmap, legacy replacement urgency, data sovereignty requirements
- Budget cycles: FY ends 30 June — urgency language works around April-June
- Salesforce products most relevant: Public Sector Solutions (PSS), Agentforce, Service Cloud, Experience Cloud, MuleSoft

DECISION MAKERS IN STATE GOV:
- CIO/CDO: technology strategy owner, budget holder for major ICT, aligns with DTA guidance
- Head of Digital Transformation: owns digital service delivery programs, often frustrated by legacy constraints
- Director of Service Delivery: business outcome owner with program funding confirmed
- IT Procurement: process enforcer — warms up when BDR understands panel arrangements

COMMON OBJECTIONS:
- "We have a Microsoft agreement" → M365 is for collaboration; PSS handles complex case management, citizen portals and grant workflows differently
- "We're in the middle of a legacy replacement" → That's exactly when we need to talk — Salesforce integrates during transition, not after
- "Procurement takes too long" → Salesforce is on panel arrangements — under direct sourcing thresholds you can move faster than open tender
- "We use ServiceNow" → ServiceNow is ITSM — PSS is purpose-built for citizen-facing workflows and case management
- "We'd need to go to tender" → Check your agency's panel arrangement first — many state agencies can source directly

KEY OPENING LINES:
- "We're seeing agencies asked to deliver AI-powered services at speed — are you feeling that pressure?"
- "Most agencies we speak with are either mid-replacement or have a system on the list — where does your team sit?"
- "Data sovereignty keeps coming up — are compliance requirements holding back any of your digital projects?"`;


// ─── Local Council Context ─────────────────────────────────────────────────────

const COUNCIL_CONTEXT = `You are supporting a Salesforce BDR who covers Local Government (Council) accounts in NSW and other Australian states. The BDR's job is to prospect cold, qualify opportunities, and book meetings for their Account Executive — not to close deals.

ROLE CLARITY:
- BDR goal on a cold call: quickly establish relevance, show you understand the council's world, earn a discovery meeting
- BDR goal in discovery: uncover MEDDIC elements and hand off a qualified opportunity to the AE
- The BDR does NOT demo products, negotiate pricing, or close deals

LOCAL COUNCIL CONTEXT (FY27):
- Councils are genuinely budget-constrained — "we have no money" is a real and common objection, not just a brush-off
- Housing supply is a political mandate — DA (Development Application) automation is a live, urgent conversation
- 35% of citizens struggle to find information on council websites — wide-open door for Experience Cloud
- Digital transformation tied to housing productivity in the NSW Digital Strategy
- NSW AI Early Adopter Grant Program is funding councils to speed up development applications using AI
- All contracts typically end 30 June — timing urgency around year-end is real
- Key challenge: councils compare to Amazon-level digital experiences but have fraction of the budget
- Salesforce products most relevant: Experience Cloud (citizen portals), Service Cloud (case management), PSS (grants, planning, licensing), Slack (internal collaboration vs Microsoft Teams)
- Slack play is real: councils use Microsoft Teams but Slack can integrate Agentforce, Box, and other tools in one interface
- PSS for legal/HR/ethics teams: case management use cases are compelling and often under-served

GROUND TRUTH FROM AES:
- Councils genuinely have no budget right now — acknowledge it rather than push through
- IT used to control all relationships and wanted to "build everything" — slowly moving away from that
- Uplifting existing customers from Platform to PSS or Service Cloud is a main play
- Tableau is largely being replaced by other BI tools — don't lead with Tableau
- Microsoft Teams is entrenched but Slack with Agentforce integration is a differentiated story
- $20K Slack deals (even for 180 licenses) are winnable by showing Teams users a better integration story

DECISION MAKERS IN COUNCILS:
- CEO/General Manager: political and strategic owner — rarely on cold calls, access via champion
- Director of Planning & Environment: owns DA automation; housing pressure is their #1 pain right now
- Director of Information Technology / IT Manager: often overloaded, skeptical of new vendors
- Manager of Customer Experience: owns resident-facing digital services, often under-resourced
- Director of Corporate Services: owns finance, HR, procurement — PSS use cases for internal teams

COMMON OBJECTIONS:
- "We have no budget" → Acknowledge it: "I hear that — when does your next budget cycle start? I'd love to understand what initiatives are being considered for next year."
- "We already use Microsoft" → "What are you using Microsoft for specifically? A lot of councils are finding that Slack can pull the Teams, Agentforce, and other tools into one interface with better automation."
- "IT handles vendor relationships" → "Absolutely — who in IT should I be speaking to? I want to make sure I'm talking to the right person about [DA automation / citizen portals]."
- "We're tied into existing contracts" → "When do those come up for review? June 30 is often a natural checkpoint — would it be worth a conversation before then?"

KEY OPENING LINES:
- "With the housing pressure your council is under, where are the biggest workflow bottlenecks slowing DA approvals?"
- "Are you getting pressure from residents about digital service accessibility?"
- "We're seeing councils use AI agents to reduce DA processing time — is that on your radar?"
- "When a resident submits a request online, how many times does that data get manually re-entered into back-end systems?"`;


// ─── State & Local Personas ────────────────────────────────────────────────────

const STATE_LOCAL_PERSONAS = {
  state_cio: {
    label: 'Chief Information Officer',
    name: 'David Chen',
    org: 'NSW Department of Customer Service',
    context: STATE_CONTEXT,
    personality: `You are David Chen, CIO at NSW Department of Customer Service. Your agency runs ServiceNSW — the state's citizen-facing service portal — and you are under direct pressure from the Minister to digitise more services and reduce contact centre volume by 25% by FY28. You have a confirmed $18M digital transformation budget for FY27. You've already signed the Microsoft VSA extension but you are frustrated that Power Platform cannot handle the complex, multi-party citizen journeys your agency needs. You've had good conversations with ServiceNow about ITSM but your solution architects say it is not the right fit for citizen-facing case management. You are time-poor but genuinely interested when BDRs show they understand your citizen service delivery challenges — not just "AI" in generic terms. You light up when someone mentions DA automation, case management complexity, or Agentforce for citizen services. You shut down quickly for vendor buzzwords or "can I book 15 minutes" opening calls with no context.`,
    openings: ['David Chen.', 'Yes, David here.', 'Chen speaking, go ahead.'],
    mood: 'time-poor-but-genuinely-interested',
  },
  state_digital: {
    label: 'Director of Digital Transformation',
    name: 'Sarah Okafor',
    org: 'NSW Health',
    context: STATE_CONTEXT,
    personality: `You are Sarah Okafor, Director of Digital Transformation at NSW Health. Your mandate is to improve patient-facing digital services and reduce the time clinicians spend on admin. You have $8M in FY27 program funding from the Federal Government's $2.2B healthcare digital investment. Your biggest problem: legacy systems that break every time there is a policy change. You've seen Salesforce Health Cloud demos but weren't convinced they understood NSW Health's complexity. You warm up when BDRs ask smart questions about your program, mention specific NHS or international health agency case studies, or understand what "patient-centred care" actually means in a government context. You're cautious about AI because of patient data concerns — a BDR who understands Salesforce's data residency story in Australia will get your attention.`,
    openings: ['Sarah Okafor.', 'Hi, Sarah speaking.', 'This is Sarah — what is this about?'],
    mood: 'cautious-but-open',
  },
  council_planning: {
    label: 'Director of Planning & Environment',
    name: 'Marcus Webb',
    org: 'Blacktown City Council',
    context: COUNCIL_CONTEXT,
    personality: `You are Marcus Webb, Director of Planning & Environment at Blacktown City Council — one of the largest councils in NSW. You have a DA backlog of over 1,400 applications and the State Government is breathing down your neck to speed up housing approvals. Your team processes everything manually — PDAs are received by email, data gets re-entered three times across different systems. Your IT manager is resistant to new technology because "we cannot afford implementations." You have seen the NSW AI Early Adopter Grant for councils and you are genuinely curious about what is possible — but you are time-poor, politically exposed, and have been burned before by tech vendors who over-promise. You engage immediately when BDRs ask about your DA backlog or housing pressure. You disengage when they pitch "Salesforce" without understanding what a Planning Director actually does.`,
    openings: ['Marcus Webb.', 'Webb here.', 'Hi, Marcus — this better be quick, I have got a council meeting.'],
    mood: 'frustrated-but-genuinely-needs-help',
  },
  council_cio: {
    label: 'IT Manager',
    name: 'Jenny Tran',
    org: 'Inner West Council',
    context: COUNCIL_CONTEXT,
    personality: `You are Jenny Tran, IT Manager at Inner West Council. Your council has absolutely no budget this year — the CEO made that clear in the all-staff briefing. You're managing an aging Microsoft-centric environment (Teams, SharePoint, some legacy apps) and your biggest headache is residents complaining about the council's website and service portal. You are the gatekeeper who gets all vendor calls, and you are tired of people who waste your time. However, you secretly know that the council's digital experience is embarrassing compared to what residents expect. You warm up when BDRs acknowledge the budget reality upfront and ask smart questions about what is coming in the next budget cycle. You shut down when BDRs pretend budget is not an issue or immediately start talking about products. A BDR who says "I understand you are probably not in a buying cycle right now — I just want to make sure I am talking to the right person for when things open up" will get 5 more minutes from you.`,
    openings: ['Jenny Tran, Inner West IT.', 'Jenny here.', 'This is Jenny — what company are you from?'],
    mood: 'skeptical-gatekeeper-with-real-pain',
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

  const ctx = p.context || AUSFED_CONTEXT;
  const systemPrompt = `${ctx}

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

  const dCtx = p.context || AUSFED_CONTEXT;
  const systemPrompt = `${dCtx}

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

You are a world-class Salesforce BDR coach specialising in NSW State and Local Government prospecting. You coach BDRs who cover NSW State agencies (Departments, Health, Education, etc.) and Local Councils. Your style:
- Give exact scripts and phrases for State & Local Gov conversations — specific, not generic
- Acknowledge real fears (sounding scripted, not knowing procurement, councils saying they have no money, getting shut down by gatekeepers)
- Use realistic examples: NSW agency names (Service NSW, NSW Health, Blacktown Council, Inner West Council), DA automation, housing pressure, AI mandate, Microsoft vs Salesforce stories
- Format with clear headers (##), bullet points, and script examples in blockquotes (> "script here")
- Be warm, direct, and encouraging — like a senior Salesforce Public Sector rep coaching their BDR through it`;

  sseHeaders(res);
  await streamToSSE(res, Promise.resolve(client.messages.stream({
    model: 'claude-opus-4-8',
    max_tokens: 4000,
    system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
    messages: [{
      role: 'user',
      content: (() => {
        if (lesson.id === 'state_dummies') {
          return `Teach me "State Government for Dummies" — I have never sold to state government before and need a complete beginner's guide.

Context: I am a Salesforce BDR. I have sold to commercial companies but never to state government. I do not know what agencies are, how they buy, who the right people are, or what they care about. I am about to start prospecting NSW state agencies.

Give me a complete beginner's guide covering:
1. What is state government — how it is structured, who the buyers are, what they do day-to-day
2. How state government buys technology — procurement rules, panels, direct sourcing thresholds, June 30 year-end
3. What keeps a state CIO or Director up at night right now — AI mandate, legacy systems, cybersecurity, citizen services
4. How Salesforce fits — PSS, Service Cloud, Experience Cloud, Agentforce for government — in plain English
5. Your first 3 calls — who to call, what to say, how to open without sounding like a vendor
6. The 3 biggest mistakes BDRs make when they first sell to state gov — and how to avoid them

Write this like you are explaining it to a smart person who knows nothing about government. No jargon without explanation. Include exact word-for-word scripts they can use on their first calls.`;
        } else if (lesson.id === 'council_dummies') {
          return `Teach me "Local Council for Dummies" — I have never sold to a local council before and need a complete beginner's guide.

Context: I am a Salesforce BDR. I am about to start prospecting NSW local councils. I genuinely do not know what a council does, who works there, how they spend money, or why they would buy Salesforce. I know they apparently "have no money" but I do not know what that means in practice.

Give me a complete beginner's guide covering:
1. What a local council actually is — what they do, who the employees are, what they are responsible for (DA approvals, rates, parks, waste, citizen services)
2. Why councils "have no money" — what this really means and how to handle it without giving up
3. The housing crisis opportunity — what DA automation means, why councils NEED to fix this, how Salesforce helps
4. Who to call — Director of Planning, IT Manager, CEO — their day-to-day reality and what they care about
5. How councils buy technology — LGA procurement rules, panel arrangements, budget cycles, what "no budget" actually means vs "not a priority"
6. Your first 3 calls — who to call, what to say, how to not sound like a software vendor
7. The "we use Microsoft" and "we have no money" objections — exactly how to respond

Write this like you are explaining it to someone who has only ever sold to banks or retailers. No assumed knowledge. Include exact word-for-word scripts.`;
        } else if (lesson.id === 'compete_microsoft') {
          return `Teach me the Salesforce vs Microsoft cheat sheet for NSW State and Local Government selling.

Context: I am a Salesforce BDR. Almost every council and state agency I call runs Microsoft — Teams, SharePoint, Office 365, and many have Power Platform. There is a new 5-year Microsoft Whole-of-Government VSA starting July 2026. BDRs are getting shut down with "we already have Microsoft." I need to know exactly where Salesforce wins, where to concede, and what to say.

Give me a complete competitive cheat sheet covering:

## Where Microsoft is strong (concede this honestly)
- Internal productivity: Teams, email, calendar, document management — Salesforce does not compete here
- Basic automation: Power Automate for simple internal workflows
- The WofG VSA reality — acknowledge it rather than pretend it does not exist

## Where Salesforce wins — and exactly why
1. Citizen-facing service delivery: PSS vs Power Platform — why complex, multi-party citizen journeys need a purpose-built platform, not a general automation tool
2. DA approvals and council planning workflows — specific reasons Power Platform struggles at scale and pace-of-policy-change
3. Grants management — why spreadsheets and SharePoint lists fail and what PSS does differently
4. AI for government: Agentforce vs Microsoft Copilot — the data residency story, human-in-the-loop, full audit trail, IRAP assessment vs Copilot's limitations in Australian government trials
5. Experience Cloud: citizen portals vs SharePoint public pages — the engagement and self-service gap

## The exact conversation to have
What to say when they say: "We have the Microsoft WofG deal"
What to say when they say: "We use Power Platform for that"
What to say when they say: "We are getting Copilot"

## The one question that opens the door
The single best discovery question to ask when a prospect is heavily Microsoft-invested

Include word-for-word scripts for each scenario. Be honest about where Microsoft is genuinely strong — BDRs who pretend Salesforce beats Microsoft at everything lose credibility instantly.`;
        } else if (lesson.id === 'compete_servicenow') {
          return `Teach me the Salesforce vs ServiceNow cheat sheet for NSW State and Local Government selling.

Context: I am a Salesforce BDR. State agencies often have ServiceNow for their IT helpdesk. When I bring up case management or citizen services, they sometimes say "we already handle that in ServiceNow." I need to know exactly where Salesforce PSS wins against ServiceNow, where to concede, and what to say.

Give me a complete competitive cheat sheet covering:

## Where ServiceNow is strong (concede this honestly)
- ITSM: IT helpdesk, incident management, change management — ServiceNow was built for this and does it well
- Internal workflows: IT asset management, employee self-service for IT issues
- Enterprises with complex IT operations

## Where Salesforce wins — and exactly why
1. Citizen-facing service delivery: ServiceNow is ITSM-native — it was built for IT departments helping employees, not agencies helping citizens. The UI, the data model, the workflow logic — all wrong for citizen service delivery at scale.
2. Grants and licensing management: ServiceNow has no purpose-built grants module. PSS does.
3. DA approvals for councils: ServiceNow cannot handle the complexity of multi-party planning workflows, condition assessment, referral tracking.
4. Health and aged care case management: PSS Health Cloud vs ServiceNow for complex clinical and community service journeys
5. Salesforce Data Cloud + Agentforce: ServiceNow's AI story is limited compared to Agentforce with Australian data residency
6. Integration: MuleSoft vs ServiceNow Integration Hub — where the Salesforce story is stronger in government legacy environments

## The exact conversation to have
What to say when they say: "We already have ServiceNow"
What to say when they say: "ServiceNow handles our case management"
What to say when they say: "IT manages vendor conversations"

## The one positioning statement that lands
The single clearest way to explain PSS vs ServiceNow in one sentence that resonates with a state government buyer

Include word-for-word scripts. Be specific about NSW government context — agency names, real use cases, realistic scenarios.`;
        } else {
          return `Teach me: "${lesson.title}"

Context: I am a Salesforce BDR covering NSW State and Local Government accounts — state agencies and councils. I get nervous before cold calls to state government CIOs, Directors of Planning, IT Managers at councils. I know councils often say they have no budget, and state agencies are under pressure to deliver AI services fast. I am building my MEDDIC and Sandler skills and learning the State & Local Gov landscape. My job is to qualify and book discovery meetings for my AE — not close deals.

Give me practical, specific coaching I can use today — exact scripts for NSW State and Local Gov conversations (councils, state agencies), mindset shifts for when councils say they have no budget, real examples relevant to Salesforce in the state and local government space. Cover this lesson thoroughly with takeaways I can apply immediately.`;
        }
      })(),
    }],
  })));
});

// POST /api/drill/new — generate a fresh AusFed objection
app.post('/api/drill/new', async (req, res) => {
  const { difficulty = 'medium', used = [] } = req.body;

  const difficultyGuide = {
    easy: 'A common, predictable objection with a clear path forward for a prepared BDR.',
    medium: 'A realistic objection requiring knowledge of State/Local Gov procurement or Salesforce positioning.',
    hard: 'A tough, layered objection or a skeptical council IT manager or state official who is difficult to re-engage.',
  };

  const response = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 300,
    system: [{ type: 'text', text: STATE_CONTEXT, cache_control: { type: 'ephemeral' } }],
    messages: [{
      role: 'user',
      content: `Generate a cold call objection a NSW State or Local Government prospect would give a Salesforce BDR.

Difficulty: ${difficulty} — ${difficultyGuide[difficulty]}
Avoid repeating these: ${used.length ? used.join('; ') : 'none'}

Draw from realistic State & Local Gov objections: "we have no budget" (councils), "we use Microsoft Teams/Power Platform", "IT handles vendor conversations", "we are tied into existing contracts until June 30", "ServiceNow handles that", "send me some information", "we are not in a buying cycle", "we already have a system", "housing pressures mean we are cutting spend not adding it", "our DA system is fine", "the Minister wants digital but there is no money", data sovereignty concerns, procurement panel restrictions.

Return ONLY valid JSON:
{"objection": "exact words the prospect says", "persona": "Job Title at Organisation Type (Council or State Agency)", "context": "1-sentence situation context"}`,
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

You are a direct, practical Salesforce BDR coach giving immediate feedback on objection-handling responses from a BDR prospecting NSW State and Local Government accounts (councils and state agencies). Be honest but encouraging. Where relevant, suggest how the BDR could use Salesforce-specific knowledge (PSS, Experience Cloud, Agentforce for citizen services, Service Cloud) or better Sandler/MEDDIC technique. Reference real State & Local Gov context: councils with no budget, DA automation, housing mandate, Microsoft Teams replacement with Slack.

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


// ─── Merge all personas ───────────────────────────────────────────────────────

// Combine original AusFed personas with State & Local personas
Object.assign(PERSONAS, STATE_LOCAL_PERSONAS);

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
    title: 'State & Local Government 101 — NSW Focus',
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
    title: 'Handling State & Local Objections',
    icon: '🛡️',
    description: '"We use Microsoft", "procurement takes too long", "send me info" — exactly how to handle the top 8 AusFed objections',
  },
  {
    id: 'state_landscape',
    title: 'State Government NSW — The BDR Briefing',
    icon: '🏛️',
    description: 'AI mandate, cloud policy, legacy replacement, cyber strategy — what every BDR needs to know before calling a NSW state agency',
  },
  {
    id: 'council_landscape',
    title: 'Local Council — The BDR Briefing',
    icon: '🏢',
    description: 'Budget reality, housing pressure, DA automation, digital citizen expectations — the ground truth for council prospecting',
  },
  {
    id: 'venn_diagram',
    title: 'BDR + AE + ECS — Know Your Lane',
    icon: '⭕',
    description: 'The Venn diagram problem: where BDRs operate vs AEs vs ECS. How to prospect without treading on toes or duplicating effort',
  },
  {
    id: 'compete_microsoft',
    title: 'Salesforce vs Microsoft — The Cheat Sheet',
    icon: '⚔️',
    description: 'Every council and state agency runs Microsoft. Here is exactly where Salesforce wins, where Microsoft wins, what to say when they say they have the WofG deal, and the specific conversation to have about Agentforce vs Copilot.',
  },
  {
    id: 'compete_servicenow',
    title: 'Salesforce vs ServiceNow — The Cheat Sheet',
    icon: '🛡️',
    description: 'ServiceNow is entrenched in state IT. Here is exactly where Salesforce PSS beats ServiceNow for citizen service delivery, grants management, and council DA workflows — and what to say when they tell you they already have ServiceNow.',
  },
  {
    id: 'quality_pipeline',
    title: 'Quality Pipeline Over Volume',
    icon: '🎯',
    description: 'Why pumping S2s for KPIs kills AE trust — and what a quality Stage 2 actually looks like in State & Local Gov',
  },
  {
    id: 'handoff',
    title: 'Qualifying and Handing Off to Your AE',
    icon: '🤝',
    description: 'When is an opportunity qualified enough to pass? How to brief your AE so they walk in sharp and ready to close',
  },
];



// POST /api/compete — streaming competitive battle card
app.post('/api/compete', async (req, res) => {
  const { competitor } = req.body;

  const competitorInfo = {
    microsoft: 'Microsoft (Teams, Power Platform, Copilot, SharePoint, WofG VSA starting July 2026)',
    servicenow: 'ServiceNow (ITSM, IT helpdesk, service management)',
    technologyone: 'Technology One — TechOne (ERP, DA management, Rates, Assets, TechOne CX for citizen engagement). THE dominant platform in Australian local government.',
    civica: 'Civica Authority / Ci Anywhere (council planning, regulatory services, DA workflows, rates)',
    sap: 'SAP (ERP, Finance, HR in large state agencies)',
    oracle: 'Oracle (Finance/ERP in larger government departments)',
    wakado: 'Wakado (government-specific platform)',
    legacy: 'Bespoke/Legacy Systems (custom-built citizen portals, aging platforms, "the system we built 15 years ago that nobody can change")',
  };

  const info = competitorInfo[competitor] || competitor;

  const systemPrompt = `${STATE_CONTEXT}

You are a world-class Salesforce competitive intelligence coach for NSW State and Local Government selling. You give direct, honest, practical competitive guidance. You acknowledge where competitors are genuinely strong — BDRs who pretend Salesforce beats everything lose credibility instantly. Your style: specific, honest, with exact word-for-word scripts.`;

  sseHeaders(res);
  await streamToSSE(res, Promise.resolve(client.messages.stream({
    model: 'claude-opus-4-8',
    max_tokens: 2000,
    thinking: { type: 'adaptive' },
    system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
    messages: [{
      role: 'user',
      content: `Give me a complete competitive battle card for: ${info}

Context: I am a Salesforce BDR covering NSW State and Local Government. I need to know exactly where this competitor is strong, exactly where Salesforce wins, and the word-for-word conversation to have when a prospect mentions them.

Structure your response exactly like this:

## ${info} — Battle Card

### Where they are strong (be honest)
- Specific things they genuinely do well — do not downplay

### Where Salesforce wins in State & Local Gov
For each win area, explain WHY specifically, not just what. Reference NSW-specific context (DA automation, housing pressure, citizen portals, Agentforce vs their AI story, data residency).

### The conversation to have
**When they say:** "[specific objection they raise]"
**You say:** "exact word-for-word response"

Include 3-4 specific objection/response pairs.

### The one question that opens the door
A single discovery question that exposes their weakness without attacking them directly.

### Quick reference card
A 5-bullet summary a BDR can scan before a call.`,
    }],
  })));
});

// ─── Start server ─────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n✅ State & Local Gov BDR Coach running at http://localhost:${PORT}\n`);
});
