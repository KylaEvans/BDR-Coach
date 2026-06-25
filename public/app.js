// ─── Tab navigation ──────────────────────────────────────────────────────────

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => {
      p.classList.remove('active');
      p.classList.add('hidden');
    });
    btn.classList.add('active');
    const pane = document.getElementById(`tab-${tab}`);
    pane.classList.remove('hidden');
    pane.classList.add('active');
  });
});

// ─── Streaming helper ─────────────────────────────────────────────────────────

async function readStream(response, { onText, onDone, onError } = {}) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const data = JSON.parse(line.slice(6));
        if (data.text && onText) onText(data.text);
        if (data.done && onDone) onDone();
        if (data.error && onError) onError(data.error);
      } catch {
        // ignore bad json
      }
    }
  }
}

// ─── Markdown renderer ────────────────────────────────────────────────────────

function renderMarkdown(raw) {
  let html = raw
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^#### (.+)$/gm, '<h4>$1</h4>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/((?:^- .+\n?)+)/gm, (match) => {
      const items = match.trim().split('\n').map(l => `<li>${l.replace(/^- /, '')}</li>`).join('');
      return `<ul>${items}</ul>`;
    })
    .replace(/((?:^\d+\. .+\n?)+)/gm, (match) => {
      const items = match.trim().split('\n').map(l => `<li>${l.replace(/^\d+\. /, '')}</li>`).join('');
      return `<ol>${items}</ol>`;
    })
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, ' ');
  return `<p>${html}</p>`;
}

// ─── Persona display info ─────────────────────────────────────────────────────

const personaInfo = {
  cio:         { name: 'Michael Draper', title: 'CIO · Dept. of Employment & Workplace' },
  procurement: { name: 'Sandra Keane',   title: 'ICT Procurement · Dept. of Finance' },
  program:     { name: 'Raj Chopra',     title: 'Program Director · Services Australia' },
};

// ─── COLD CALL TAB ────────────────────────────────────────────────────────────

let callMessages   = [];
let callActive     = false;
let callTurnCount  = 0;

document.getElementById('start-call-btn').addEventListener('click', startCall);
document.getElementById('end-call-btn').addEventListener('click', endCall);
document.getElementById('chat-send-btn').addEventListener('click', sendChatMessage);

document.getElementById('chat-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (!document.getElementById('chat-send-btn').disabled) sendChatMessage();
  }
});

function getSelectedPersona() {
  return document.querySelector('input[name="persona"]:checked').value;
}

function startCall() {
  const persona = getSelectedPersona();
  const info = personaInfo[persona];

  callMessages  = [];
  callTurnCount = 0;
  callActive    = true;

  document.getElementById('roleplay-setup').classList.add('hidden');
  document.getElementById('call-area').classList.remove('hidden');
  document.getElementById('chat-prospect-name').textContent  = info.name;
  document.getElementById('chat-prospect-title').textContent = info.title;
  document.getElementById('call-status-text').textContent    = 'Connected';

  document.getElementById('chat-messages').innerHTML = '';
  resetSandlerTracker();
  fetchProspectResponse(persona);
}

function endCall() {
  callActive = false;
  document.getElementById('roleplay-setup').classList.remove('hidden');
  document.getElementById('call-area').classList.add('hidden');
  document.getElementById('chat-input').value = '';

  const tip = callMessages.length >= 8
    ? '🎉 Solid call — notice what earned more time and what fell flat.'
    : callMessages.length >= 4
      ? '💪 Good attempt. Try pushing further into their pain next time.'
      : '📞 Short call — next time earn permission to ask one specific question before pitching anything.';
  document.getElementById('coaching-bar').textContent = tip;
}

async function fetchProspectResponse(persona) {
  setCallInputEnabled(false);
  showTypingIn('chat-messages');

  try {
    const response = await fetch('/api/roleplay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: callMessages, persona, turnCount: callTurnCount }),
    });

    removeTypingFrom('chat-messages');
    const bubble = addBubble('chat-messages', 'prospect', '', document.getElementById('chat-prospect-name').textContent);

    await readStream(response, {
      onText: (text) => appendToBubble(bubble, text),
      onDone: () => {
        const content = bubble.querySelector('.bubble-content').textContent.trim();
        callMessages.push({ role: 'assistant', content });
        callTurnCount++;
        setCallInputEnabled(true);
        document.getElementById('chat-input').focus();
        checkCallEnd(content, 'chat-messages', 'call-status-text');
      },
      onError: (err) => {
        bubble.querySelector('.bubble-content').textContent = `[Error: ${err}]`;
        setCallInputEnabled(true);
      },
    });
  } catch {
    removeTypingFrom('chat-messages');
    addSystemMsg('chat-messages', 'Connection error — make sure the server is running.');
    setCallInputEnabled(true);
  }
}

function sendChatMessage() {
  const input = document.getElementById('chat-input');
  const text  = input.value.trim();
  if (!text) return;

  callMessages.push({ role: 'user', content: text });
  input.value = '';
  addBubble('chat-messages', 'bdr', text, 'You');
  fetchProspectResponse(getSelectedPersona());
}

function setCallInputEnabled(enabled) {
  document.getElementById('chat-input').disabled    = !enabled;
  document.getElementById('chat-send-btn').disabled = !enabled;
}

// Sandler tracker
function resetSandlerTracker() {
  document.querySelectorAll('.sandler-item input').forEach(cb => { cb.checked = false; });
  updateSandlerProgress();
}

document.querySelectorAll('.sandler-item input').forEach(cb => {
  cb.addEventListener('change', updateSandlerProgress);
});

function updateSandlerProgress() {
  const total   = document.querySelectorAll('.sandler-item input').length;
  const checked = document.querySelectorAll('.sandler-item input:checked').length;
  document.getElementById('sandler-progress').textContent = `${checked} of ${total} steps`;
  const badge = document.getElementById('sandler-badge');
  if (checked === total) badge.classList.remove('hidden');
  else badge.classList.add('hidden');
}

// ─── DISCOVERY TAB ────────────────────────────────────────────────────────────

let discMessages  = [];
let discActive    = false;
let discTurnCount = 0;
let discPersona   = 'cio';

document.getElementById('start-discovery-btn').addEventListener('click', startDiscovery);
document.getElementById('end-discovery-btn').addEventListener('click', endDiscovery);
document.getElementById('disc-send-btn').addEventListener('click', sendDiscMessage);
document.getElementById('analyze-btn').addEventListener('click', runMeddicAnalysis);
document.getElementById('analysis-back-btn').addEventListener('click', () => {
  document.getElementById('analysis-panel').classList.add('hidden');
  document.getElementById('discovery-setup').classList.remove('hidden');
});

document.getElementById('disc-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (!document.getElementById('disc-send-btn').disabled) sendDiscMessage();
  }
});

function getDiscPersona() {
  return document.querySelector('input[name="disc-persona"]:checked').value;
}

function startDiscovery() {
  discPersona   = getDiscPersona();
  const info    = personaInfo[discPersona];

  discMessages  = [];
  discTurnCount = 0;
  discActive    = true;

  document.getElementById('discovery-setup').classList.add('hidden');
  document.getElementById('disc-call-area').classList.remove('hidden');
  document.getElementById('analysis-panel').classList.add('hidden');
  document.getElementById('disc-prospect-name').textContent  = info.name;
  document.getElementById('disc-prospect-title').textContent = info.title;
  document.getElementById('disc-status-text').textContent    = 'Discovery meeting';

  document.getElementById('disc-messages').innerHTML = '';
  resetMeddicTracker();
  fetchDiscoveryResponse();
}

function endDiscovery() {
  discActive = false;
  document.getElementById('analyze-btn').classList.remove('hidden');
  document.getElementById('end-discovery-btn').disabled = true;
  setDiscInputEnabled(false);
  document.getElementById('disc-status-text').textContent = 'Meeting ended';
  document.querySelector('.call-dot-blue').style.animation = 'none';
  document.querySelector('.call-dot-blue').style.background = '#bbb';
  addSystemMsg('disc-messages', 'Meeting ended. Hit "Analyze Discovery" to get your MEDDIC coaching.');
}

async function fetchDiscoveryResponse() {
  setDiscInputEnabled(false);
  showTypingIn('disc-messages');

  try {
    const response = await fetch('/api/discovery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: discMessages, persona: discPersona, turnCount: discTurnCount }),
    });

    removeTypingFrom('disc-messages');
    const bubble = addBubble('disc-messages', 'prospect', '', document.getElementById('disc-prospect-name').textContent);

    await readStream(response, {
      onText: (text) => appendToBubble(bubble, text),
      onDone: () => {
        const content = bubble.querySelector('.bubble-content').textContent.trim();
        discMessages.push({ role: 'assistant', content });
        discTurnCount++;
        setDiscInputEnabled(true);
        document.getElementById('disc-input').focus();
      },
      onError: (err) => {
        bubble.querySelector('.bubble-content').textContent = `[Error: ${err}]`;
        setDiscInputEnabled(true);
      },
    });
  } catch {
    removeTypingFrom('disc-messages');
    addSystemMsg('disc-messages', 'Connection error — make sure the server is running.');
    setDiscInputEnabled(true);
  }
}

function sendDiscMessage() {
  const input = document.getElementById('disc-input');
  const text  = input.value.trim();
  if (!text) return;

  discMessages.push({ role: 'user', content: text });
  input.value = '';
  addBubble('disc-messages', 'bdr', text, 'You');
  fetchDiscoveryResponse();
}

function setDiscInputEnabled(enabled) {
  document.getElementById('disc-input').disabled    = !enabled;
  document.getElementById('disc-send-btn').disabled = !enabled;
}

// MEDDIC tracker
function resetMeddicTracker() {
  document.querySelectorAll('.meddic-item input').forEach(cb => { cb.checked = false; });
  updateMeddicProgress();
  document.getElementById('analyze-btn').classList.add('hidden');
}

document.querySelectorAll('.meddic-item input').forEach(cb => {
  cb.addEventListener('change', updateMeddicProgress);
});

function updateMeddicProgress() {
  const total   = document.querySelectorAll('.meddic-item input').length;
  const checked = document.querySelectorAll('.meddic-item input:checked').length;
  document.getElementById('meddic-progress').textContent = `${checked} of ${total} elements`;
  const badge = document.getElementById('meddic-badge');
  if (checked === total) badge.classList.remove('hidden');
  else badge.classList.add('hidden');
}

async function runMeddicAnalysis() {
  if (discMessages.length < 4) {
    addSystemMsg('disc-messages', 'Have a longer conversation first — ask more discovery questions before analyzing.');
    return;
  }

  document.getElementById('disc-call-area').classList.add('hidden');
  const panel = document.getElementById('analysis-panel');
  panel.classList.remove('hidden');
  const body = document.getElementById('analysis-body');
  body.innerHTML = `<div class="lesson-loading"><div class="spinner"></div><p>Analyzing your discovery…</p></div>`;

  try {
    const response = await fetch('/api/discovery/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: discMessages, persona: discPersona }),
    });

    body.innerHTML = '<div class="md-content"></div>';
    const mdEl = body.querySelector('.md-content');
    let rawText = '';

    await readStream(response, {
      onText: (text) => {
        rawText += text;
        mdEl.innerHTML = renderMarkdown(rawText);
        body.scrollTop = body.scrollHeight;
      },
    });
  } catch (err) {
    body.innerHTML = `<p style="color:red">Error: ${err.message}</p>`;
  }
}

// ─── Shared chat helpers ──────────────────────────────────────────────────────

function addBubble(containerId, who, content, labelText) {
  const area = document.getElementById(containerId);
  const hint = area.querySelector('.chat-hint');
  if (hint) hint.remove();

  const bubble = document.createElement('div');
  bubble.className = `chat-bubble bubble-${who}`;

  const label = document.createElement('div');
  label.className = 'bubble-label';
  label.textContent = labelText || (who === 'bdr' ? 'You' : 'Prospect');

  const contentEl = document.createElement('div');
  contentEl.className = 'bubble-content';
  contentEl.textContent = content;

  bubble.appendChild(label);
  bubble.appendChild(contentEl);
  area.appendChild(bubble);
  area.scrollTop = area.scrollHeight;
  return bubble;
}

function appendToBubble(bubble, text) {
  bubble.querySelector('.bubble-content').textContent += text;
  const area = bubble.closest('.chat-messages');
  if (area) area.scrollTop = area.scrollHeight;
}

function showTypingIn(containerId) {
  const area = document.getElementById(containerId);
  const ind  = document.createElement('div');
  ind.className = 'typing-indicator';
  ind.id = `typing-${containerId}`;
  for (let i = 0; i < 3; i++) {
    const dot = document.createElement('div');
    dot.className = 'typing-dot';
    ind.appendChild(dot);
  }
  area.appendChild(ind);
  area.scrollTop = area.scrollHeight;
}

function removeTypingFrom(containerId) {
  const ind = document.getElementById(`typing-${containerId}`);
  if (ind) ind.remove();
}

function addSystemMsg(containerId, text) {
  const area = document.getElementById(containerId);
  const el = document.createElement('div');
  el.style.cssText = 'text-align:center;font-size:12px;color:var(--text-lt);padding:6px;font-style:italic;';
  el.textContent = text;
  area.appendChild(el);
  area.scrollTop = area.scrollHeight;
}

function checkCallEnd(text, containerId, statusId) {
  const endSignals = ['goodbye', 'good bye', 'have a nice', 'good luck', 'not interested', 'take me off', "don't call", 'no thank you', 'not a good time', 'do not call'];
  if (endSignals.some(s => text.toLowerCase().includes(s))) {
    document.getElementById(statusId).textContent = 'Call ended';
    const dot = document.querySelector(`#${containerId}`).closest('.roleplay-chat')?.querySelector('.call-dot');
    if (dot) { dot.style.background = '#ef5350'; dot.style.animation = 'none'; }
    setCallInputEnabled(false);
    addSystemMsg(containerId, 'The prospect ended the call. Reflect on what triggered it — every ended call is data.');
  }
}

// ─── LESSONS ─────────────────────────────────────────────────────────────────

async function initLessons() {
  const grid = document.getElementById('lesson-grid');
  try {
    const res     = await fetch('/api/lessons');
    const lessons = await res.json();

    lessons.forEach(lesson => {
      const card = document.createElement('div');
      card.className = 'lesson-card';
      card.innerHTML = `
        <div class="lesson-card-icon">${lesson.icon}</div>
        <h4>${lesson.title}</h4>
        <p>${lesson.description}</p>
        <span class="lesson-arrow">Read lesson →</span>
      `;
      card.addEventListener('click', () => openLesson(lesson));
      grid.appendChild(card);
    });
  } catch {
    grid.innerHTML = '<p style="color:var(--text-lt)">Could not load lessons — is the server running?</p>';
  }
}

async function openLesson(lesson) {
  document.getElementById('lesson-grid').classList.add('hidden');
  const contentPane = document.getElementById('lesson-content');
  contentPane.classList.remove('hidden');
  document.getElementById('lesson-content-title').textContent = `${lesson.icon} ${lesson.title}`;

  const body = document.getElementById('lesson-body');
  body.innerHTML = `<div class="lesson-loading"><div class="spinner"></div><p>Loading your lesson…</p></div>`;

  try {
    const res = await fetch('/api/lesson', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lessonId: lesson.id }),
    });

    body.innerHTML = '<div class="md-content"></div>';
    const mdEl = body.querySelector('.md-content');
    let rawText = '';

    await readStream(res, {
      onText: (text) => {
        rawText += text;
        mdEl.innerHTML = renderMarkdown(rawText);
        body.scrollTop = body.scrollHeight;
      },
    });
  } catch (err) {
    body.innerHTML = `<p style="color:red">Error loading lesson: ${err.message}</p>`;
  }
}

document.getElementById('lesson-back-btn').addEventListener('click', () => {
  document.getElementById('lesson-content').classList.add('hidden');
  document.getElementById('lesson-grid').classList.remove('hidden');
});

initLessons();

// ─── DRILLS ───────────────────────────────────────────────────────────────────

let currentDrill      = null;
let usedObjections    = [];
let currentDifficulty = 'easy';

document.querySelectorAll('.diff-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentDifficulty = btn.dataset.diff;
  });
});

document.getElementById('new-drill-btn').addEventListener('click', loadNewDrill);
document.getElementById('submit-response-btn').addEventListener('click', submitDrillResponse);
document.getElementById('next-drill-btn').addEventListener('click', loadNewDrill);
document.getElementById('hint-btn').addEventListener('click', () => {
  document.getElementById('drill-hint').classList.toggle('hidden');
});

async function loadNewDrill() {
  document.getElementById('drill-empty').classList.add('hidden');
  document.getElementById('drill-card').classList.add('hidden');
  document.getElementById('drill-response-area').classList.add('hidden');
  document.getElementById('drill-feedback').classList.add('hidden');
  document.getElementById('drill-hint').classList.add('hidden');
  document.getElementById('drill-response').value = '';
  document.getElementById('feedback-body').innerHTML = '';
  document.getElementById('drill-loading').classList.remove('hidden');

  try {
    const res = await fetch('/api/drill/new', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ difficulty: currentDifficulty, used: usedObjections.slice(-10) }),
    });

    const drill = await res.json();
    currentDrill = drill;
    usedObjections.push(drill.objection);

    document.getElementById('drill-loading').classList.add('hidden');
    document.getElementById('drill-context').textContent  = drill.context;
    document.getElementById('drill-persona').textContent  = `👤 ${drill.persona}`;
    document.getElementById('drill-objection').textContent = drill.objection;

    document.getElementById('drill-card').classList.remove('hidden');
    document.getElementById('drill-response-area').classList.remove('hidden');
    document.getElementById('drill-response').focus();
  } catch {
    document.getElementById('drill-loading').classList.add('hidden');
    document.getElementById('drill-empty').classList.remove('hidden');
    document.getElementById('drill-empty').querySelector('p').textContent =
      'Could not load drill — make sure the server is running.';
  }
}

async function submitDrillResponse() {
  const response = document.getElementById('drill-response').value.trim();
  if (!response) { document.getElementById('drill-response').focus(); return; }

  document.getElementById('drill-response-area').classList.add('hidden');
  const feedbackPanel = document.getElementById('drill-feedback');
  const feedbackBody  = document.getElementById('feedback-body');
  feedbackPanel.classList.remove('hidden');
  feedbackBody.innerHTML = '<div class="spinner" style="margin:20px auto"></div>';

  try {
    const res = await fetch('/api/drill/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        objection:    currentDrill.objection,
        persona:      currentDrill.persona,
        context:      currentDrill.context,
        userResponse: response,
      }),
    });

    feedbackBody.innerHTML = '<div class="md-content"></div>';
    const mdEl = feedbackBody.querySelector('.md-content');
    let rawText = '';

    await readStream(res, {
      onText: (text) => {
        rawText += text;
        mdEl.innerHTML = renderMarkdown(rawText);
      },
    });
  } catch (err) {
    feedbackBody.innerHTML = `<p style="color:red">Error: ${err.message}</p>`;
  }
}

// ── COMPETE TAB ──────────────────────────────────────────────────────────────

document.querySelectorAll('.btn-compete-details').forEach(btn => {
  btn.addEventListener('click', () => {
    const competitor = btn.dataset.competitor;
    const names = {
      microsoft: 'Microsoft',
      servicenow: 'ServiceNow',
      technologyone: 'Technology One',
      civica: 'Civica',
      sap: 'SAP',
      oracle: 'Oracle',
      wakado: 'Wakado',
      legacy: 'Bespoke / Legacy Systems',
    };
    document.getElementById('compete-grid').classList.add('hidden');
    document.getElementById('compete-detail').classList.remove('hidden');
    document.getElementById('compete-detail-title').textContent = (names[competitor] || competitor) + ' — Battle Card';
    document.getElementById('compete-detail-body').innerHTML = '<div class="lesson-loading"><div class="spinner"></div><p>Generating battle card...</p></div>';

    fetch('/api/compete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ competitor }),
    }).then(res => {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let md = '';
      const body = document.getElementById('compete-detail-body');
      body.innerHTML = '<div class="lesson-body" id="compete-md"></div>';
      const el = document.getElementById('compete-md');

      function pump() {
        reader.read().then(({ done, value }) => {
          if (done) return;
          const lines = decoder.decode(value).split('\n');
          lines.forEach(line => {
            if (line.startsWith('data: ')) {
              try {
                const d = JSON.parse(line.slice(6));
                if (d.text) { md += d.text; el.innerHTML = md.replace(/\n/g, '<br>').replace(/##\s(.+)/g, '<h3>$1</h3>').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/^- (.+)/gm, '<li>$1</li>').replace(/^> (.+)/gm, '<blockquote>$1</blockquote>'); }
              } catch {}
            }
          });
          pump();
        });
      }
      pump();
    });
  });
});

document.getElementById('compete-back-btn')?.addEventListener('click', () => {
  document.getElementById('compete-grid').classList.remove('hidden');
  document.getElementById('compete-detail').classList.add('hidden');
});

// ── PERSONAS TAB ─────────────────────────────────────────────────────────────

const PERSONA_LABELS = {
  state_cio_persona: 'Chief Information Officer — NSW State Agency',
  state_cdo: 'Chief Digital Officer — NSW State Agency',
  state_director_digital: 'Director of Digital Transformation — NSW State Agency',
  state_service_delivery: 'Director of Service Delivery — NSW State Agency',
  state_procurement: 'ICT Procurement Manager — NSW State Agency',
  state_program_director: 'Program Director — NSW State Agency',
  state_architect: 'Enterprise Architect — NSW State Agency',
  council_ceo: 'CEO / General Manager — Local Council',
  council_planning_dir: 'Director of Planning & Environment — Local Council',
  council_cx: 'Director of Customer Experience — Local Council',
  council_it_mgr: 'IT Manager — Local Council',
  council_corporate: 'Director of Corporate Services — Local Council',
  council_da_mgr: 'Manager of Development Assessment — Local Council',
};

let loadedPersonas = {};

document.querySelectorAll('.persona-list-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.persona-list-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const personaId = btn.dataset.persona;
    const label = PERSONA_LABELS[personaId] || personaId;
    const panel = document.getElementById('persona-detail-panel');

    if (loadedPersonas[personaId]) {
      panel.innerHTML = loadedPersonas[personaId];
      return;
    }

    panel.innerHTML = '<div class="lesson-loading"><div class="spinner"></div><p>Loading persona profile...</p></div>';

    fetch('/api/persona', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personaId, label }),
    }).then(res => {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let md = '';
      panel.innerHTML = '<div class="lesson-body" id="persona-md"></div>';
      const el = document.getElementById('persona-md');

      function pump() {
        reader.read().then(({ done, value }) => {
          if (done) { loadedPersonas[personaId] = panel.innerHTML; return; }
          const lines = decoder.decode(value).split('\n');
          lines.forEach(line => {
            if (line.startsWith('data: ')) {
              try {
                const d = JSON.parse(line.slice(6));
                if (d.text) { md += d.text; el.innerHTML = md.replace(/\n/g, '<br>').replace(/##\s(.+)/g, '<h3>$1</h3>').replace(/###\s(.+)/g, '<h4>$1</h4>').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/^- (.+)/gm, '<li>$1</li>').replace(/^> (.+)/gm, '<blockquote>$1</blockquote>'); }
              } catch {}
            }
          });
          pump();
        });
      }
      pump();
    });
  });
});

// Auto-load first persona
setTimeout(() => {
  const firstBtn = document.querySelector('.persona-list-btn');
  if (firstBtn) firstBtn.click();
}, 100);
