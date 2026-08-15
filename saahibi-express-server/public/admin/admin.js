const rulesListEl = document.getElementById('rules-list');
const rulesStatusEl = document.getElementById('rules-status');
const examplesListEl = document.getElementById('examples-list');
const examplesStatusEl = document.getElementById('examples-status');
const examplesTitleEl = document.getElementById('examples-title');
const ruleSearchEl = document.getElementById('rule-search');
const adminTokenEl = document.getElementById('admin-token');
const hideAllBtn = document.getElementById('hide-all');
const showAllBtn = document.getElementById('show-all');

const state = {
  chapters: [],
  unassigned: [],
  selectedKey: null,
  examples: [],
  search: '',
};

const TOKEN_KEY = 'saahibi-admin-token';

adminTokenEl.value = localStorage.getItem(TOKEN_KEY) || '';
adminTokenEl.addEventListener('change', () => {
  localStorage.setItem(TOKEN_KEY, adminTokenEl.value.trim());
});

function authHeaders(extra = {}) {
  const headers = { ...extra };
  const token = adminTokenEl.value.trim();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: authHeaders({
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

function matchesSearch(rule) {
  const q = state.search.trim().toLowerCase();
  if (!q) return true;
  return (
    rule.key.toLowerCase().includes(q) ||
    rule.title.toLowerCase().includes(q)
  );
}

function chapterTitleMatches(chapter) {
  const q = state.search.trim().toLowerCase();
  if (!q) return true;
  return (
    chapter.key.toLowerCase().includes(q) ||
    chapter.simpleTitle.toLowerCase().includes(q) ||
    (chapter.title || '').toLowerCase().includes(q)
  );
}

function renderRules() {
  rulesListEl.innerHTML = '';

  state.chapters.forEach((chapter, index) => {
    const titleHit = chapterTitleMatches(chapter);
    const rules = titleHit
      ? chapter.rules
      : chapter.rules.filter(matchesSearch);
    if (!rules.length && !titleHit) return;

    const wrap = document.createElement('div');
    wrap.className = `chapter-block${chapter.hidden ? ' hidden-chapter' : ''}`;

    const header = document.createElement('div');
    header.className = 'chapter-header';

    const check = document.createElement('input');
    check.type = 'checkbox';
    check.checked = !chapter.hidden;
    check.title = chapter.hidden
      ? 'Chapter hidden from app'
      : 'Chapter shown in app';
    check.addEventListener('change', async () => {
      const hidden = !check.checked;
      check.disabled = true;
      try {
        await api(`/api/admin/chapters/${encodeURIComponent(chapter.key)}`, {
          method: 'PUT',
          body: JSON.stringify({ hidden }),
        });
        chapter.hidden = hidden;
        renderRules();
      } catch (err) {
        check.checked = !hidden;
        rulesStatusEl.textContent = err.message;
        rulesStatusEl.classList.add('error');
      } finally {
        check.disabled = false;
      }
    });

    const label = document.createElement('div');
    label.className = 'chapter-label';
    label.innerHTML =
      `<span class="chapter-label-main"></span>` +
      `<span class="chapter-label-key"></span>`;
    label.querySelector('.chapter-label-main').textContent =
      `Chapter ${index + 1} · ${chapter.simpleTitle}`;
    label.querySelector('.chapter-label-key').textContent = chapter.key;

    header.appendChild(check);
    header.appendChild(label);
    wrap.appendChild(header);

    for (const rule of rules) {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'rule-row';
      if (rule.key === state.selectedKey) row.classList.add('selected');
      if (rule.hidden) row.classList.add('hidden-rule');

      const ruleCheck = document.createElement('input');
      ruleCheck.type = 'checkbox';
      ruleCheck.checked = !rule.hidden;
      ruleCheck.title = rule.hidden ? 'Hidden from app' : 'Shown in app';
      ruleCheck.addEventListener('click', (e) => e.stopPropagation());
      ruleCheck.addEventListener('change', async () => {
        const hidden = !ruleCheck.checked;
        ruleCheck.disabled = true;
        try {
          await api(`/api/admin/rules/${encodeURIComponent(rule.key)}`, {
            method: 'PUT',
            body: JSON.stringify({ hidden }),
          });
          rule.hidden = hidden;
          renderRules();
        } catch (err) {
          ruleCheck.checked = !hidden;
          rulesStatusEl.textContent = err.message;
          rulesStatusEl.classList.add('error');
        } finally {
          ruleCheck.disabled = false;
        }
      });

      const body = document.createElement('span');
      body.innerHTML = `<span class="title"></span><span class="key"></span>`;
      body.querySelector('.title').textContent = rule.title;
      body.querySelector('.key').textContent = rule.key;

      row.appendChild(ruleCheck);
      row.appendChild(body);
      row.addEventListener('click', () => selectRule(rule.key));
      wrap.appendChild(row);
    }

    rulesListEl.appendChild(wrap);
  });

  if (state.unassigned.length) {
    const rules = state.unassigned.filter(matchesSearch);
    if (rules.length) {
      const wrap = document.createElement('div');
      wrap.className = 'chapter-block';
      const label = document.createElement('p');
      label.className = 'chapter-label chapter-label-plain';
      label.textContent = 'Unassigned';
      wrap.appendChild(label);

      for (const rule of rules) {
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'rule-row';
        if (rule.key === state.selectedKey) row.classList.add('selected');
        if (rule.hidden) row.classList.add('hidden-rule');

        const ruleCheck = document.createElement('input');
        ruleCheck.type = 'checkbox';
        ruleCheck.checked = !rule.hidden;
        ruleCheck.title = rule.hidden ? 'Hidden from app' : 'Shown in app';
        ruleCheck.addEventListener('click', (e) => e.stopPropagation());
        ruleCheck.addEventListener('change', async () => {
          const hidden = !ruleCheck.checked;
          ruleCheck.disabled = true;
          try {
            await api(`/api/admin/rules/${encodeURIComponent(rule.key)}`, {
              method: 'PUT',
              body: JSON.stringify({ hidden }),
            });
            rule.hidden = hidden;
            renderRules();
          } catch (err) {
            ruleCheck.checked = !hidden;
            rulesStatusEl.textContent = err.message;
            rulesStatusEl.classList.add('error');
          } finally {
            ruleCheck.disabled = false;
          }
        });

        const body = document.createElement('span');
        body.innerHTML = `<span class="title"></span><span class="key"></span>`;
        body.querySelector('.title').textContent = rule.title;
        body.querySelector('.key').textContent = rule.key;

        row.appendChild(ruleCheck);
        row.appendChild(body);
        row.addEventListener('click', () => selectRule(rule.key));
        wrap.appendChild(row);
      }
      rulesListEl.appendChild(wrap);
    }
  }

  if (!rulesListEl.children.length) {
    rulesStatusEl.textContent = 'No rules match your search.';
  }
}

async function loadRules() {
  rulesStatusEl.classList.remove('error');
  rulesStatusEl.textContent = 'Loading rules…';
  try {
    const data = await api('/api/admin/rules');
    state.chapters = data.chapters || [];
    state.unassigned = data.unassigned || [];
    rulesStatusEl.textContent =
      `${data.chapterCount ?? state.chapters.length} chapters · ` +
      `${data.hiddenChapterCount ?? 0} hidden · ` +
      `${data.ruleCount} rules · ${data.hiddenRuleCount} hidden`;
    renderRules();
  } catch (err) {
    rulesStatusEl.textContent = err.message;
    rulesStatusEl.classList.add('error');
  }
}

function renderExamples() {
  examplesListEl.innerHTML = '';
  for (const card of state.examples) {
    const el = document.createElement('label');
    el.className = `example-card${card.hidden ? ' hidden-example' : ''}`;

    const check = document.createElement('input');
    check.type = 'checkbox';
    check.checked = !card.hidden;
    check.addEventListener('change', async () => {
      const hidden = !check.checked;
      check.disabled = true;
      try {
        await api(
          `/api/admin/rules/${encodeURIComponent(state.selectedKey)}/examples`,
          {
            method: 'PUT',
            body: JSON.stringify({ phraseRef: card.phraseRef, hidden }),
          }
        );
        card.hidden = hidden;
        renderExamples();
        updateExamplesStatus();
      } catch (err) {
        check.checked = !hidden;
        examplesStatusEl.textContent = err.message;
        examplesStatusEl.classList.add('error');
      } finally {
        check.disabled = false;
      }
    });

    const main = document.createElement('div');
    const arabic = document.createElement('div');
    arabic.className = 'arabic';
    arabic.textContent = card.text || '(no text)';
    const meta = document.createElement('div');
    meta.className = 'meta';
    const loc =
      card.surahId != null && card.ayahNo != null
        ? `${card.surahId}:${card.ayahNo}`
        : '—';
    const occ =
      card.occurrenceCount != null ? ` · ${card.occurrenceCount} occ.` : '';
    meta.textContent = `${loc} · ${card.phraseRef}${occ}`;
    main.appendChild(arabic);
    main.appendChild(meta);

    const badge = document.createElement('span');
    badge.className = `badge ${card.hidden ? 'off' : 'on'}`;
    badge.textContent = card.hidden ? 'Hidden' : 'Shown';

    el.appendChild(check);
    el.appendChild(main);
    el.appendChild(badge);
    examplesListEl.appendChild(el);
  }
}

function updateExamplesStatus() {
  const total = state.examples.length;
  const hidden = state.examples.filter((e) => e.hidden).length;
  examplesStatusEl.classList.remove('error');
  examplesStatusEl.textContent = `${total} examples · ${hidden} hidden · ${total - hidden} shown`;
  const has = total > 0;
  hideAllBtn.disabled = !has;
  showAllBtn.disabled = !has;
}

async function selectRule(ruleKey) {
  state.selectedKey = ruleKey;
  renderRules();

  const rule =
    state.chapters.flatMap((c) => c.rules).find((r) => r.key === ruleKey) ||
    state.unassigned.find((r) => r.key === ruleKey);

  examplesTitleEl.textContent = rule ? rule.title : 'Examples';
  examplesStatusEl.classList.remove('error');
  examplesStatusEl.textContent = 'Loading examples…';
  examplesListEl.innerHTML = '';
  hideAllBtn.disabled = true;
  showAllBtn.disabled = true;

  try {
    const data = await api(
      `/api/admin/rules/${encodeURIComponent(ruleKey)}/examples`
    );
    state.examples = data.examples || [];
    updateExamplesStatus();
    renderExamples();
  } catch (err) {
    state.examples = [];
    examplesStatusEl.textContent = err.message;
    examplesStatusEl.classList.add('error');
  }
}

async function bulkSetHidden(hidden) {
  if (!state.selectedKey || !state.examples.length) return;
  const phraseRefs = state.examples.map((e) => e.phraseRef).filter(Boolean);
  hideAllBtn.disabled = true;
  showAllBtn.disabled = true;
  examplesStatusEl.classList.remove('error');
  examplesStatusEl.textContent = hidden ? 'Hiding all…' : 'Showing all…';
  try {
    await api(
      `/api/admin/rules/${encodeURIComponent(state.selectedKey)}/examples`,
      {
        method: 'PUT',
        body: JSON.stringify({ phraseRefs, hidden }),
      }
    );
    for (const card of state.examples) card.hidden = hidden;
    updateExamplesStatus();
    renderExamples();
  } catch (err) {
    examplesStatusEl.textContent = err.message;
    examplesStatusEl.classList.add('error');
    updateExamplesStatus();
  }
}

document.getElementById('refresh-rules').addEventListener('click', loadRules);
ruleSearchEl.addEventListener('input', () => {
  state.search = ruleSearchEl.value;
  renderRules();
});
hideAllBtn.addEventListener('click', () => bulkSetHidden(true));
showAllBtn.addEventListener('click', () => bulkSetHidden(false));

loadRules();
