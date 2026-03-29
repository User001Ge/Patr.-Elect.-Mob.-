const state = {
  model: null,
};

const els = {
  statusPill: document.getElementById('status-pill'),
  refreshModelBtn: document.getElementById('refresh-model-btn'),
  candidateChipList: document.getElementById('candidate-chip-list'),
  modelStats: document.getElementById('model-stats'),
  simulationForm: document.getElementById('simulation-form'),
  candidate1: document.getElementById('candidate-1'),
  candidate2: document.getElementById('candidate-2'),
  candidate3: document.getElementById('candidate-3'),
  iterations: document.getElementById('iterations'),
  volatility: document.getElementById('volatility'),
  volatilityValue: document.getElementById('volatility-value'),
  electorAbsence: document.getElementById('elector-absence'),
  electorAbsenceValue: document.getElementById('elector-absence-value'),
  candidateAbsence: document.getElementById('candidate-absence'),
  candidateAbsenceValue: document.getElementById('candidate-absence-value'),
  rngSeed: document.getElementById('rng-seed'),
  submitBtn: document.getElementById('submit-btn'),
  errorCard: document.getElementById('error-card'),
  errorMessage: document.getElementById('error-message'),
  resultsSection: document.getElementById('results-section'),
  winnerName: document.getElementById('winner-name'),
  winnerNote: document.getElementById('winner-note'),
  summaryStats: document.getElementById('summary-stats'),
  absentCandidates: document.getElementById('absent-candidates'),
  firstRoundMeta: document.getElementById('first-round-meta'),
  firstRoundBars: document.getElementById('first-round-bars'),
  firstRoundTableWrap: document.getElementById('first-round-table-wrap'),
  runoffCard: document.getElementById('runoff-card'),
  runoffMeta: document.getElementById('runoff-meta'),
  runoffBars: document.getElementById('runoff-bars'),
  runoffTableWrap: document.getElementById('runoff-table-wrap'),
  monteCarloMeta: document.getElementById('monte-carlo-meta'),
  probabilityBars: document.getElementById('probability-bars'),
  mcStats: document.getElementById('mc-stats'),
  firstRoundWinWrap: document.getElementById('first-round-win-wrap'),
  averageVotesWrap: document.getElementById('average-votes-wrap'),
  preferenceMatrixWrap: document.getElementById('preference-matrix-wrap'),
};

function setStatus(text, type = '') {
  els.statusPill.textContent = text;
  els.statusPill.classList.remove('ok', 'error');
  if (type) {
    els.statusPill.classList.add(type);
  }
}

function setRangeLabel(input, output) {
  output.textContent = input.value;
}

function showError(message) {
  els.errorMessage.textContent = message;
  els.errorCard.classList.remove('hidden');
}

function hideError() {
  els.errorCard.classList.add('hidden');
  els.errorMessage.textContent = '';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderStatGrid(target, stats) {
  target.innerHTML = stats
    .map(
      (item) => `
        <div class="stat-box">
          <span>${escapeHtml(item.label)}</span>
          <strong>${escapeHtml(item.value)}</strong>
        </div>
      `,
    )
    .join('');
}

function renderChips(candidates) {
  els.candidateChipList.innerHTML = candidates
    .map((candidate) => `<span class="chip">${escapeHtml(candidate)}</span>`)
    .join('');
}

function buildSelectOptions(candidates, selectedValue) {
  return candidates
    .map(
      (candidate) =>
        `<option value="${escapeHtml(candidate)}" ${candidate === selectedValue ? 'selected' : ''}>${escapeHtml(candidate)}</option>`,
    )
    .join('');
}

function populateCandidateSelects() {
  if (!state.model) return;
  const candidates = state.model.candidates;
  const defaults = state.model.default_candidates?.length === 3 ? state.model.default_candidates : candidates.slice(0, 3);
  const currentValues = [els.candidate1.value, els.candidate2.value, els.candidate3.value].every(Boolean)
    ? [els.candidate1.value, els.candidate2.value, els.candidate3.value]
    : defaults;

  [els.candidate1, els.candidate2, els.candidate3].forEach((select, index) => {
    select.innerHTML = buildSelectOptions(candidates, currentValues[index] || candidates[index] || '');
  });
}

function renderTable(target, rows) {
  if (!rows || rows.length === 0) {
    target.innerHTML = '<p class="empty-state">ამ ბლოკში მონაცემი არ არის.</p>';
    return;
  }

  const columns = Object.keys(rows[0]);
  const thead = columns.map((column) => `<th>${escapeHtml(column)}</th>`).join('');
  const tbody = rows
    .map((row) => {
      const cells = columns.map((column) => `<td>${escapeHtml(row[column] ?? '—')}</td>`).join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  target.innerHTML = `
    <table>
      <thead><tr>${thead}</tr></thead>
      <tbody>${tbody}</tbody>
    </table>
  `;
}

function renderBarList(target, rows, labelKey, valueKey, formatter = (value) => String(value)) {
  if (!rows || rows.length === 0) {
    target.innerHTML = '<p class="empty-state">ამ ბლოკში მონაცემი არ არის.</p>';
    return;
  }

  const maxValue = Math.max(...rows.map((row) => Number(row[valueKey] ?? 0)), 1);
  target.innerHTML = rows
    .map((row) => {
      const value = Number(row[valueKey] ?? 0);
      const percent = Math.max(4, (value / maxValue) * 100);
      return `
        <div class="bar-card">
          <div class="bar-row">
            <div class="bar-title">${escapeHtml(row[labelKey])}</div>
            <div class="bar-value">${escapeHtml(formatter(value, row))}</div>
          </div>
          <div class="bar-track"><div class="bar-fill" style="width:${percent}%"></div></div>
        </div>
      `;
    })
    .join('');
}

function renderSimulationResult(payload) {
  const singleRun = payload.single_run;
  const firstRound = singleRun.first_round;
  const runoff = singleRun.runoff;
  const monteCarlo = payload.monte_carlo;

  els.resultsSection.classList.remove('hidden');
  els.winnerName.textContent = singleRun.winner;
  els.winnerNote.textContent = singleRun.winner_note;
  els.absentCandidates.textContent = singleRun.absent_candidates.length ? singleRun.absent_candidates.join(', ') : 'არავინ';

  renderStatGrid(els.summaryStats, [
    { label: 'დასწრება', value: singleRun.attendance_count },
    { label: 'გაცდენა', value: singleRun.absence_count },
    { label: 'მეორე ტური', value: singleRun.runoff_required ? 'კი' : 'არა' },
  ]);

  els.firstRoundMeta.textContent = `ვალიდური ხმები: ${firstRound.valid_votes} • გამარჯვების ბარიერი: ${firstRound.majority_threshold} • სტატუსი: ${firstRound.status}`;
  renderBarList(els.firstRoundBars, firstRound.vote_table, 'კანდიდატი', 'ხმები', (value) => `${value} ხმა`);
  renderTable(els.firstRoundTableWrap, firstRound.details_table);

  if (singleRun.runoff_required && runoff) {
    els.runoffCard.classList.remove('hidden');
    const runoffCandidates = singleRun.runoff_candidates?.join(', ') || '—';
    els.runoffMeta.textContent = `მეორე ტურში გადავიდნენ: ${runoffCandidates} • ვალიდური ხმები: ${runoff.valid_votes} • გამარჯვებული: ${runoff.winner}`;
    renderBarList(els.runoffBars, runoff.vote_table, 'კანდიდატი', 'ხმები', (value) => `${value} ხმა`);
    renderTable(els.runoffTableWrap, runoff.details_table);
  } else {
    els.runoffCard.classList.add('hidden');
    els.runoffMeta.textContent = singleRun.runoff_required
      ? 'მეორე ტურის შემადგენლობა გარკვევით ვერ დადგინდა.'
      : 'მეორე ტური საჭირო არ გახდა.';
    els.runoffBars.innerHTML = '<p class="empty-state">ამ გაშვებაში მეორე ტური არ გაიმართა.</p>';
    els.runoffTableWrap.innerHTML = '<p class="empty-state">ცხრილი არ არსებობს.</p>';
  }

  els.monteCarloMeta.textContent = `იტერაციები: ${payload.parameters.iterations}`;
  renderBarList(
    els.probabilityBars,
    monteCarlo.probabilities_table,
    'შედეგი',
    'მოგების ალბათობა (%)',
    (value) => `${value.toFixed(2)}%`,
  );
  renderStatGrid(els.mcStats, [
    { label: 'საშუალო დასწრება', value: monteCarlo.avg_attendance },
    { label: 'მეორე ტურის სიხშირე', value: `${monteCarlo.runoff_rate_pct}%` },
    { label: 'იტერაციები', value: monteCarlo.iterations },
  ]);
  renderTable(els.firstRoundWinWrap, monteCarlo.first_round_win_table);
  renderTable(els.averageVotesWrap, monteCarlo.average_votes_table);
  renderTable(els.preferenceMatrixWrap, payload.preference_matrix);

  window.scrollTo({ top: els.resultsSection.offsetTop - 12, behavior: 'smooth' });
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data?.detail || 'მოთხოვნა ვერ შესრულდა.';
    throw new Error(detail);
  }
  return data;
}

async function loadHealth() {
  try {
    await fetchJson('/health');
    setStatus('backend მზად არის', 'ok');
  } catch (error) {
    setStatus('backend მიუწვდომელია', 'error');
    showError(error.message);
  }
}

async function loadModel() {
  hideError();
  try {
    const model = await fetchJson('/model');
    state.model = model;
    renderStatGrid(els.modelStats, [
      { label: 'კანდიდატები', value: model.candidate_count },
      { label: 'ამომრჩევლები', value: model.elector_count },
      { label: 'ფაილი', value: model.data_file },
    ]);
    renderChips(model.candidates);
    populateCandidateSelects();
  } catch (error) {
    showError(error.message);
  }
}

function collectRequestPayload() {
  const selectedCandidates = [els.candidate1.value, els.candidate2.value, els.candidate3.value];
  if (new Set(selectedCandidates).size !== 3) {
    throw new Error('ზუსტად 3 განსხვავებული კანდიდატი უნდა აირჩიო.');
  }

  return {
    selected_candidates: selectedCandidates,
    iterations: Number(els.iterations.value || 100),
    volatility_level: Number(els.volatility.value || 3),
    elector_absence_pct: Number(els.electorAbsence.value || 5),
    candidate_absence_pct: Number(els.candidateAbsence.value || 0),
    rng_seed: els.rngSeed.value.trim() === '' ? null : Number(els.rngSeed.value),
  };
}

async function handleSubmit(event) {
  event.preventDefault();
  hideError();

  let payload;
  try {
    payload = collectRequestPayload();
  } catch (error) {
    showError(error.message);
    return;
  }

  els.submitBtn.disabled = true;
  els.submitBtn.textContent = 'იტვირთება...';

  try {
    const result = await fetchJson('/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    renderSimulationResult(result);
  } catch (error) {
    showError(error.message);
  } finally {
    els.submitBtn.disabled = false;
    els.submitBtn.textContent = 'სიმულაციის გაშვება';
  }
}

function bindEvents() {
  els.refreshModelBtn.addEventListener('click', loadModel);
  els.simulationForm.addEventListener('submit', handleSubmit);
  els.volatility.addEventListener('input', () => setRangeLabel(els.volatility, els.volatilityValue));
  els.electorAbsence.addEventListener('input', () => setRangeLabel(els.electorAbsence, els.electorAbsenceValue));
  els.candidateAbsence.addEventListener('input', () => setRangeLabel(els.candidateAbsence, els.candidateAbsenceValue));
}

async function init() {
  bindEvents();
  setRangeLabel(els.volatility, els.volatilityValue);
  setRangeLabel(els.electorAbsence, els.electorAbsenceValue);
  setRangeLabel(els.candidateAbsence, els.candidateAbsenceValue);
  await loadHealth();
  await loadModel();
}

init();
