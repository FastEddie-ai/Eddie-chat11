/* Fast Eddie Web — site chat widget (drop-in, no dependencies).
   Config: window.EDDIE_CHAT_API (default: the Render service below).
   The assistant is disclosed as AI in the header and in its greeting. */
(function () {
  var API = (window.EDDIE_CHAT_API || 'https://eddie-chat11.onrender.com').replace(/\/$/, '');
  var PHONE_DISPLAY = '(724) 217-1830';
  var PHONE_SMS = 'sms:+17242171830';

  var css = [
    '.ec-btn{position:fixed;right:18px;bottom:18px;z-index:9998;width:60px;height:60px;border-radius:50%;border:1px solid rgba(255,255,255,.18);background:linear-gradient(145deg,#7a1420,#4a0d14);color:#ffd34d;font-size:26px;cursor:pointer;box-shadow:0 8px 28px rgba(0,0,0,.55),0 0 18px rgba(179,18,34,.45);display:flex;align-items:center;justify-content:center}',
    '.ec-btn:hover{filter:brightness(1.15)}',
    '.ec-panel{position:fixed;right:18px;bottom:88px;z-index:9999;width:372px;max-width:calc(100vw - 24px);height:540px;max-height:calc(100dvh - 110px);background:#141416;border:1px solid rgba(255,255,255,.12);border-radius:16px;box-shadow:0 24px 60px rgba(0,0,0,.65),0 0 24px rgba(179,18,34,.25);display:none;flex-direction:column;overflow:hidden;font-family:inherit;color:#e8e6e3}',
    '.ec-panel.ec-open{display:flex}',
    '.ec-head{background:linear-gradient(145deg,#1d1d20,#101012);padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.08)}',
    '.ec-head b{font-size:16px;letter-spacing:.2px}',
    '.ec-head .ec-sub{font-size:12px;color:#b9b4ac;margin-top:2px;line-height:1.45}',
    '.ec-head .ec-sub b{color:#ffd34d;font-size:12px}',
    '.ec-msgs{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;background:#101012}',
    '.ec-msg{max-width:86%;padding:10px 12px;border-radius:12px;font-size:14px;line-height:1.5;white-space:pre-wrap;word-wrap:break-word}',
    '.ec-msg.ec-bot{background:#1e1e22;border:1px solid rgba(255,255,255,.07);align-self:flex-start;border-bottom-left-radius:4px}',
    '.ec-msg.ec-user{background:linear-gradient(145deg,#7a1420,#5c0f18);color:#fff;align-self:flex-end;border-bottom-right-radius:4px}',
    '.ec-msg a{color:#ffd34d}',
    '.ec-chips{display:flex;flex-wrap:wrap;gap:6px;padding:0 14px 10px;background:#101012}',
    '.ec-chip{font-size:12.5px;padding:6px 10px;border-radius:999px;border:1px solid rgba(255,213,77,.4);color:#ffd34d;background:transparent;cursor:pointer}',
    '.ec-chip:hover{background:rgba(255,211,77,.12)}',
    '.ec-lead{display:none;margin:0 14px 10px;padding:11px;border-radius:12px;background:#1a1a1e;border:1px solid rgba(255,211,77,.35);font-size:13px;line-height:1.5}',
    '.ec-lead a{display:inline-block;margin-top:8px;background:#ffd34d;color:#141414;font-weight:700;padding:8px 14px;border-radius:8px;text-decoration:none}',
    '.ec-form{display:flex;gap:8px;padding:12px;background:#17171a;border-top:1px solid rgba(255,255,255,.08)}',
    '.ec-form input{flex:1;background:#0e0e10;border:1px solid rgba(255,255,255,.14);border-radius:10px;color:#fff;padding:10px 12px;font-size:14px;outline:none}',
    '.ec-form input:focus{border-color:rgba(255,211,77,.55)}',
    '.ec-form button{background:linear-gradient(145deg,#7a1420,#4a0d14);color:#ffd34d;border:1px solid rgba(255,255,255,.15);border-radius:10px;padding:0 16px;font-size:15px;cursor:pointer}',
    '.ec-typing{font-size:12px;color:#8f8a82;padding:0 16px 8px;background:#101012;display:none}',
    '@media (max-width:480px){.ec-panel{right:12px;bottom:84px}}'
  ].join('\n');

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var btn = document.createElement('button');
  btn.className = 'ec-btn';
  btn.setAttribute('aria-label', 'Chat with the Fast Eddie Web assistant');
  btn.innerHTML = '&#9889;';
  document.body.appendChild(btn);

  var panel = document.createElement('div');
  panel.className = 'ec-panel';
  panel.innerHTML =
    '<div class="ec-head"><b>Fast Eddie Web</b>' +
    '<div class="ec-sub">I\'m Ed\'s <b>AI assistant</b> — I answer questions about his websites and AI tools, day or night. For Ed himself, call or text <b>' + PHONE_DISPLAY + '</b>.</div></div>' +
    '<div class="ec-msgs" id="ecMsgs"></div>' +
    '<div class="ec-chips" id="ecChips"></div>' +
    '<div class="ec-lead" id="ecLead">Want Ed to follow up? Tap below — it opens a text to Ed with your chat attached to the message, so he sees what you need.<br><a id="ecLeadBtn" href="#">Text Ed now</a></div>' +
    '<div class="ec-typing" id="ecTyping">Assistant is typing…</div>' +
    '<form class="ec-form" id="ecForm"><input id="ecInput" type="text" placeholder="Ask about websites, AI tools, the process…" autocomplete="off" maxlength="600"><button type="submit" aria-label="Send">&#10148;</button></form>';
  document.body.appendChild(panel);

  var msgsEl = panel.querySelector('#ecMsgs');
  var chipsEl = panel.querySelector('#ecChips');
  var leadEl = panel.querySelector('#ecLead');
  var leadBtn = panel.querySelector('#ecLeadBtn');
  var typingEl = panel.querySelector('#ecTyping');
  var form = panel.querySelector('#ecForm');
  var input = panel.querySelector('#ecInput');
  var history = [];
  var opened = false;
  var busy = false;

  function addMsg(text, who) {
    var d = document.createElement('div');
    d.className = 'ec-msg ' + (who === 'user' ? 'ec-user' : 'ec-bot');
    d.textContent = text;
    msgsEl.appendChild(d);
    msgsEl.scrollTop = msgsEl.scrollHeight;
    return d;
  }

  function fallbackMsg() {
    addMsg('My assistant brain is waking up (or napping). Fastest way to reach a human: call or text Ed at ' + PHONE_DISPLAY + ' — he answers like it\'s his job, because it is.', 'bot');
  }

  function showLead() {
    var firstUser = history.filter(function (m) { return m.role === 'user'; }).map(function (m) { return m.content; }).join(' | ').slice(0, 400);
    var body = 'Hi Ed — I was chatting on fasteddieweb.com. Here\'s what I asked about: ' + firstUser;
    leadBtn.href = PHONE_SMS + '?&body=' + encodeURIComponent(body);
    leadEl.style.display = 'block';
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  var CHIPS = ['How does pricing work?', 'What AI tools can you add?', 'How does the delivery guarantee work?', 'I want Ed to contact me'];
  CHIPS.forEach(function (label) {
    var c = document.createElement('button');
    c.className = 'ec-chip';
    c.type = 'button';
    c.textContent = label;
    c.addEventListener('click', function () {
      if (label === 'I want Ed to contact me') { showLead(); addMsg('Tap "Text Ed now" above and he\'ll have your note in his texts — or just tell me your name, your business, and what you need, and I\'ll get it ready for him.', 'bot'); return; }
      send(label);
    });
    chipsEl.appendChild(c);
  });

  function send(text) {
    text = (text || '').trim();
    if (!text || busy) return;
    busy = true;
    addMsg(text, 'user');
    history.push({ role: 'user', content: text });
    input.value = '';
    typingEl.style.display = 'block';
    fetch(API + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history })
    })
      .then(function (r) { if (!r.ok) throw new Error('bad'); return r.json(); })
      .then(function (data) {
        var reply = (data.reply || '').trim();
        var lead = false;
        if (reply.indexOf('[LEAD_READY]') !== -1) { lead = true; reply = reply.replace(/\[LEAD_READY\]/g, '').trim(); }
        if (reply) { addMsg(reply, 'bot'); history.push({ role: 'assistant', content: reply }); }
        if (lead) showLead();
      })
      .catch(function () { fallbackMsg(); })
      .finally(function () { busy = false; typingEl.style.display = 'none'; msgsEl.scrollTop = msgsEl.scrollHeight; });
  }

  form.addEventListener('submit', function (e) { e.preventDefault(); send(input.value); });

  btn.addEventListener('click', function () {
    var open = panel.classList.toggle('ec-open');
    if (open && !opened) {
      opened = true;
      addMsg('Hey — I\'m the Fast Eddie Web assistant (an AI, not Ed — he\'s the one who builds the stuff). Ask me about websites, the AI tools, how the process works… or tap a question below. This chat is also the demo: this same assistant can live on your site.', 'bot');
    }
    if (open) input.focus();
  });
})();
