/**
 * AI Email Assistant - Frontend Client Application
 * Interacts with FastAPI backend to provide AI Triage, Drafting, HITL, and Memory management.
 */

// Application State
const state = {
  currentFolder: '',
  searchQuery: '',
  emails: [],
  selectedEmailId: null,
  selectedEmail: null,
  stats: {},
};

// DOM Element References
const elements = {
  emailListContainer: document.getElementById('email-list-container'),
  placeholderView: document.getElementById('placeholder-view'),
  detailView: document.getElementById('detail-view'),
  inputSearch: document.getElementById('input-search'),
  
  // Detail elements
  detailSubject: document.getElementById('email-detail-subject'),
  detailAuthor: document.getElementById('email-detail-author'),
  detailTo: document.getElementById('email-detail-to'),
  detailBody: document.getElementById('email-detail-body'),
  badgeClassification: document.getElementById('badge-classification'),
  badgeStatus: document.getElementById('badge-status'),
  triageReasoningText: document.getElementById('triage-reasoning-text'),
  
  // HITL Draft inputs
  draftSubjectInput: document.getElementById('draft-subject-input'),
  draftBodyInput: document.getElementById('draft-body-input'),
  draftCalendarBox: document.getElementById('draft-calendar-box'),
  draftCalendarDetails: document.getElementById('draft-calendar-details'),
  
  // Buttons
  btnBatchTriage: document.getElementById('btn-batch-triage'),
  btnRunTriage: document.getElementById('btn-run-triage'),
  btnGenerateDraft: document.getElementById('btn-generate-draft'),
  btnHitlAccept: document.getElementById('btn-hitl-accept'),
  btnHitlEdit: document.getElementById('btn-hitl-edit'),
  btnHitlFeedback: document.getElementById('btn-hitl-feedback'),
  btnHitlIgnore: document.getElementById('btn-hitl-ignore'),
  btnCompose: document.getElementById('btn-compose'),
  btnMemory: document.getElementById('btn-memory'),
  btnCalendar: document.getElementById('btn-calendar'),
  btnReset: document.getElementById('btn-reset'),
  
  // Modals
  modalCompose: document.getElementById('modal-compose'),
  modalMemory: document.getElementById('modal-memory'),
  modalCalendar: document.getElementById('modal-calendar'),
  btnSubmitCompose: document.getElementById('btn-submit-compose'),
  btnSaveMemory: document.getElementById('btn-save-memory'),
  btnResetMemory: document.getElementById('btn-reset-memory'),
  calendarEventsList: document.getElementById('calendar-events-list'),
  toastContainer: document.getElementById('toast-container'),
};

// Initialization
document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  loadData();
});

function initEventListeners() {
  // Folder Navigation
  document.querySelectorAll('.nav-folder').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-folder').forEach(b => b.classList.remove('bg-slate-800/80', 'text-indigo-300'));
      btn.classList.add('bg-slate-800/80', 'text-indigo-300');
      state.currentFolder = btn.dataset.folder || '';
      loadEmails();
    });
  });

  // Search input debounced
  let searchTimeout;
  elements.inputSearch.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      state.searchQuery = e.target.value.trim();
      loadEmails();
    }, 250);
  });

  // Core Agent Actions
  elements.btnBatchTriage.addEventListener('click', handleBatchTriage);
  elements.btnRunTriage.addEventListener('click', handleRunTriage);
  elements.btnGenerateDraft.addEventListener('click', handleGenerateDraft);
  
  // HITL Actions
  elements.btnHitlAccept.addEventListener('click', () => handleHitlAction('accept'));
  elements.btnHitlEdit.addEventListener('click', () => handleHitlAction('edit'));
  elements.btnHitlIgnore.addEventListener('click', () => handleHitlAction('ignore'));
  elements.btnHitlFeedback.addEventListener('click', handleHitlFeedback);

  // Modals
  elements.btnCompose.addEventListener('click', () => openModal(elements.modalCompose));
  elements.btnMemory.addEventListener('click', openMemoryModal);
  elements.btnCalendar.addEventListener('click', openCalendarModal);
  elements.btnReset.addEventListener('click', handleResetDataset);

  elements.btnSubmitCompose.addEventListener('click', handleSubmitCompose);
  elements.btnSaveMemory.addEventListener('click', handleSaveMemory);
  elements.btnResetMemory.addEventListener('click', handleResetMemory);

  // Modal Close buttons
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      closeAllModals();
    });
  });
}

// Toast Notifications
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  const icon = type === 'success' ? 'fa-circle-check' : type === 'error' ? 'fa-circle-exclamation' : 'fa-circle-info';
  toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
  elements.toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// API Communication
async function loadData() {
  await Promise.all([loadEmails(), loadStats()]);
}

async function loadStats() {
  try {
    const res = await fetch('/api/emails/stats/summary');
    if (!res.ok) return;
    const stats = await res.json();
    state.stats = stats;
    
    document.getElementById('badge-count-total').textContent = stats.total || 0;
    document.getElementById('badge-count-unread').textContent = stats.unread || 0;
    document.getElementById('badge-count-respond').textContent = stats.respond || 0;
    document.getElementById('badge-count-notify').textContent = stats.notify || 0;
    document.getElementById('badge-count-ignore').textContent = stats.ignore || 0;
    document.getElementById('badge-count-drafted').textContent = stats.drafted || 0;
    document.getElementById('badge-count-sent').textContent = stats.sent || 0;
  } catch (err) {
    console.error('Error fetching stats:', err);
  }
}

async function loadEmails() {
  try {
    let url = '/api/emails?';
    if (state.currentFolder) url += `folder=${encodeURIComponent(state.currentFolder)}&`;
    if (state.searchQuery) url += `search=${encodeURIComponent(state.searchQuery)}&`;

    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to fetch emails');
    const emails = await res.json();
    state.emails = emails;
    renderEmailList();

    if (state.selectedEmailId) {
      const stillExists = emails.find(e => e.id === state.selectedEmailId);
      if (stillExists) {
        selectEmail(stillExists);
      } else if (emails.length > 0) {
        selectEmail(emails[0]);
      } else {
        clearDetailView();
      }
    } else if (emails.length > 0) {
      selectEmail(emails[0]);
    } else {
      clearDetailView();
    }
  } catch (err) {
    console.error(err);
    elements.emailListContainer.innerHTML = `
      <div class="p-6 text-center text-rose-400 text-xs">
        <i class="fa-solid fa-triangle-exclamation mb-1"></i>
        <p>Failed to load emails. Check server connection.</p>
      </div>
    `;
  }
}

function renderEmailList() {
  if (state.emails.length === 0) {
    elements.emailListContainer.innerHTML = `
      <div class="p-8 text-center text-slate-500 text-xs">
        <i class="fa-regular fa-folder-open text-2xl mb-2 text-slate-600"></i>
        <p>No emails found in this folder.</p>
      </div>
    `;
    return;
  }

  elements.emailListContainer.innerHTML = '';
  state.emails.forEach(email => {
    const item = document.createElement('div');
    const isSelected = email.id === state.selectedEmailId;
    item.className = `email-item p-3.5 cursor-pointer border-b border-slate-800/60 ${isSelected ? 'active' : ''}`;
    
    // Triage badge style
    let triageBadgeHtml = '';
    if (email.classification === 'respond') {
      triageBadgeHtml = `<span class="text-[10px] px-1.5 py-0.5 rounded font-medium badge-respond">RESPOND</span>`;
    } else if (email.classification === 'notify') {
      triageBadgeHtml = `<span class="text-[10px] px-1.5 py-0.5 rounded font-medium badge-notify">NOTIFY</span>`;
    } else if (email.classification === 'ignore') {
      triageBadgeHtml = `<span class="text-[10px] px-1.5 py-0.5 rounded font-medium badge-ignore">IGNORE</span>`;
    }

    // Status badge style
    let statusBadgeHtml = '';
    if (email.status === 'sent') {
      statusBadgeHtml = `<span class="text-[10px] px-1.5 py-0.5 rounded font-medium badge-status-sent">SENT</span>`;
    } else if (email.status === 'drafted') {
      statusBadgeHtml = `<span class="text-[10px] px-1.5 py-0.5 rounded font-medium badge-status-drafted">HITL DRAFT</span>`;
    }

    item.innerHTML = `
      <div class="flex items-center justify-between mb-1">
        <span class="text-xs font-semibold text-slate-200 truncate max-w-[180px]">${escapeHtml(email.author.split('<')[0].trim())}</span>
        <div class="flex items-center gap-1">
          ${triageBadgeHtml}
          ${statusBadgeHtml}
        </div>
      </div>
      <div class="text-xs font-medium text-slate-300 truncate mb-1">${escapeHtml(email.subject)}</div>
      <div class="text-[11px] text-slate-400 line-clamp-2 leading-tight">${escapeHtml(email.email_thread)}</div>
    `;

    item.addEventListener('click', () => {
      selectEmail(email);
    });

    elements.emailListContainer.appendChild(item);
  });
}

function selectEmail(email) {
  state.selectedEmailId = email.id;
  state.selectedEmail = email;

  // Re-highlight item in list
  document.querySelectorAll('.email-item').forEach(el => el.classList.remove('active'));
  renderEmailList();

  elements.placeholderView.classList.add('hidden');
  elements.detailView.classList.remove('hidden');

  // Populate details
  elements.detailSubject.textContent = email.subject;
  elements.detailAuthor.textContent = email.author;
  elements.detailTo.textContent = email.to;
  elements.detailBody.textContent = email.email_thread;

  // Update classification badge
  const classBadge = elements.badgeClassification;
  classBadge.className = 'px-2.5 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ';
  if (email.classification === 'respond') {
    classBadge.classList.add('badge-respond');
    classBadge.textContent = 'NEEDS RESPONSE';
  } else if (email.classification === 'notify') {
    classBadge.classList.add('badge-notify');
    classBadge.textContent = 'NOTIFICATION';
  } else if (email.classification === 'ignore') {
    classBadge.classList.add('badge-ignore');
    classBadge.textContent = 'IGNORED';
  } else {
    classBadge.classList.add('bg-slate-800', 'text-slate-400');
    classBadge.textContent = 'UNCLASSIFIED';
  }

  // Update status badge
  elements.badgeStatus.textContent = email.status.toUpperCase();

  // Triage reasoning
  if (email.reasoning) {
    elements.triageReasoningText.textContent = email.reasoning;
  } else {
    elements.triageReasoningText.textContent = "Click 'Run Triage' to classify this email with reasoning.";
  }

  // Draft inputs
  elements.draftSubjectInput.value = email.draft_subject || `Re: ${email.subject.replace('Re: ', '')}`;
  elements.draftBodyInput.value = email.draft_response || '';

  // Calendar box
  if (email.calendar_event) {
    elements.draftCalendarBox.classList.remove('hidden');
    const cal = email.calendar_event;
    elements.draftCalendarDetails.innerHTML = `
      <strong>Meeting:</strong> ${escapeHtml(cal.subject || email.subject)}<br>
      <strong>Attendees:</strong> ${escapeHtml(Array.isArray(cal.attendees) ? cal.attendees.join(', ') : email.author)}<br>
      <strong>Proposed Time:</strong> ${escapeHtml(cal.preferred_day || 'Next available slot')} (${cal.duration_minutes || 30} mins)
    `;
  } else {
    elements.draftCalendarBox.classList.add('hidden');
  }
}

function clearDetailView() {
  state.selectedEmailId = null;
  state.selectedEmail = null;
  elements.placeholderView.classList.remove('hidden');
  elements.detailView.classList.add('hidden');
}

// Action Handlers
async function handleRunTriage() {
  if (!state.selectedEmailId) return;
  elements.btnRunTriage.disabled = true;
  elements.btnRunTriage.innerHTML = `<i class="fa-solid fa-spinner fa-spin text-[10px]"></i> <span>Triaging...</span>`;

  try {
    const res = await fetch('/api/triage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email_id: state.selectedEmailId }),
    });
    if (!res.ok) throw new Error('Triage failed');
    const data = await res.json();
    showToast(`Email classified as: ${data.classification.toUpperCase()}`, 'success');
    await loadData();
  } catch (err) {
    showToast('Failed to run AI triage', 'error');
  } finally {
    elements.btnRunTriage.disabled = false;
    elements.btnRunTriage.innerHTML = `<i class="fa-solid fa-play text-[10px]"></i> <span>Run Triage</span>`;
  }
}

async function handleBatchTriage() {
  elements.btnBatchTriage.disabled = true;
  elements.btnBatchTriage.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> <span>Triaging All...</span>`;

  try {
    const res = await fetch('/api/triage/all', { method: 'POST' });
    if (!res.ok) throw new Error('Batch triage failed');
    const list = await res.json();
    showToast(`Batch triage complete for ${list.length} unread emails!`, 'success');
    await loadData();
  } catch (err) {
    showToast('Batch triage encountered an error', 'error');
  } finally {
    elements.btnBatchTriage.disabled = false;
    elements.btnBatchTriage.innerHTML = `<i class="fa-solid fa-bolt"></i> <span>Triage All Unread</span>`;
  }
}

async function handleGenerateDraft() {
  if (!state.selectedEmailId) return;
  elements.btnGenerateDraft.disabled = true;
  elements.btnGenerateDraft.innerHTML = `<i class="fa-solid fa-spinner fa-spin text-[10px]"></i> <span>Drafting...</span>`;

  try {
    const res = await fetch('/api/hitl/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email_id: state.selectedEmailId }),
    });
    if (!res.ok) throw new Error('Draft generation failed');
    const draft = await res.json();
    
    elements.draftSubjectInput.value = draft.subject;
    elements.draftBodyInput.value = draft.body;
    showToast('AI Draft ready for Human-in-the-Loop review!', 'success');
    await loadData();
  } catch (err) {
    showToast('Failed to generate draft', 'error');
  } finally {
    elements.btnGenerateDraft.disabled = false;
    elements.btnGenerateDraft.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles text-[10px]"></i> <span>Generate AI Draft</span>`;
  }
}

async function handleHitlAction(actionType) {
  if (!state.selectedEmailId) return;

  const payload = {
    email_id: state.selectedEmailId,
    action: actionType,
    edited_subject: elements.draftSubjectInput.value,
    edited_body: elements.draftBodyInput.value,
    calendar_event: state.selectedEmail?.calendar_event || null,
  };

  try {
    const res = await fetch('/api/hitl/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Action failed');
    const result = await res.json();
    
    if (result.memory_updated) {
      showToast(`${result.message} (Memory profile reinforced)`, 'success');
    } else {
      showToast(result.message, 'success');
    }

    await loadData();
  } catch (err) {
    showToast('Failed to execute HITL action', 'error');
  }
}

async function handleHitlFeedback() {
  if (!state.selectedEmailId) return;
  const feedback = prompt("Enter guidance or instructions to revise the draft response (e.g. 'Make it more formal and mention our Q4 roadmap'):");
  if (!feedback) return;

  const payload = {
    email_id: state.selectedEmailId,
    action: 'feedback',
    user_feedback: feedback,
  };

  try {
    const res = await fetch('/api/hitl/action', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Feedback update failed');
    const result = await res.json();
    showToast(result.message, 'success');
    await loadData();
  } catch (err) {
    showToast('Failed to submit feedback', 'error');
  }
}

// Modals Handling
function openModal(modal) {
  modal.classList.remove('hidden');
}

function closeAllModals() {
  elements.modalCompose.classList.add('hidden');
  elements.modalMemory.classList.add('hidden');
  elements.modalCalendar.classList.add('hidden');
}

async function openMemoryModal() {
  try {
    const res = await fetch('/api/memory');
    if (!res.ok) throw new Error('Failed to load memory');
    const data = await res.json();
    
    document.getElementById('memory-background').value = data.background || '';
    document.getElementById('memory-triage').value = data.triage_instructions || '';
    document.getElementById('memory-response').value = data.response_preferences || '';
    document.getElementById('memory-calendar').value = data.cal_preferences || '';
    
    openModal(elements.modalMemory);
  } catch (err) {
    showToast('Could not load memory profiles', 'error');
  }
}

async function handleSaveMemory() {
  const payload = {
    background: document.getElementById('memory-background').value,
    triage_instructions: document.getElementById('memory-triage').value,
    response_preferences: document.getElementById('memory-response').value,
    cal_preferences: document.getElementById('memory-calendar').value,
  };

  try {
    const res = await fetch('/api/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Save memory failed');
    showToast('User preferences and rules updated successfully!', 'success');
    closeAllModals();
  } catch (err) {
    showToast('Failed to save memory rules', 'error');
  }
}

async function handleResetMemory() {
  if (!confirm('Are you sure you want to reset all preferences and memory rules to default?')) return;
  try {
    const res = await fetch('/api/memory/reset', { method: 'POST' });
    if (!res.ok) throw new Error('Reset failed');
    const data = await res.json();
    document.getElementById('memory-background').value = data.background || '';
    document.getElementById('memory-triage').value = data.triage_instructions || '';
    document.getElementById('memory-response').value = data.response_preferences || '';
    document.getElementById('memory-calendar').value = data.cal_preferences || '';
    showToast('Memory reset to initial defaults.', 'info');
  } catch (err) {
    showToast('Failed to reset memory', 'error');
  }
}

async function openCalendarModal() {
  try {
    const res = await fetch('/api/calendar/events');
    if (!res.ok) throw new Error('Failed to load calendar events');
    const events = await res.json();
    
    if (events.length === 0) {
      elements.calendarEventsList.innerHTML = `<p class="text-slate-500 text-center py-4">No scheduled meetings found.</p>`;
    } else {
      elements.calendarEventsList.innerHTML = events.map(evt => `
        <div class="p-3 bg-slate-800/80 rounded-lg border border-slate-700/60 flex items-start justify-between">
          <div>
            <h4 class="font-semibold text-slate-100">${escapeHtml(evt.subject)}</h4>
            <p class="text-slate-400 text-[11px] mt-0.5">Attendees: ${escapeHtml(evt.attendees.join(', '))}</p>
            <p class="text-emerald-400 font-medium text-[11px] mt-1"><i class="fa-regular fa-clock mr-1"></i> ${escapeHtml(evt.preferred_day)} (${evt.duration_minutes}m)</p>
          </div>
          <span class="px-2 py-0.5 rounded text-[10px] font-semibold ${evt.confirmed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}">
            ${evt.confirmed ? 'CONFIRMED' : 'TENTATIVE'}
          </span>
        </div>
      `).join('');
    }
    openModal(elements.modalCalendar);
  } catch (err) {
    showToast('Failed to fetch calendar events', 'error');
  }
}

async function handleSubmitCompose() {
  const author = document.getElementById('compose-author').value.trim();
  const to = document.getElementById('compose-to').value.trim();
  const subject = document.getElementById('compose-subject').value.trim();
  const email_thread = document.getElementById('compose-thread').value.trim();

  if (!author || !subject || !email_thread) {
    showToast('Please fill in author, subject, and content.', 'error');
    return;
  }

  try {
    const res = await fetch('/api/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author, to, subject, email_thread }),
    });
    if (!res.ok) throw new Error('Failed to create email');
    const created = await res.json();
    showToast('New test email injected into inbox!', 'success');
    closeAllModals();
    
    // Clear compose form
    document.getElementById('compose-author').value = '';
    document.getElementById('compose-subject').value = '';
    document.getElementById('compose-thread').value = '';

    await loadData();
    selectEmail(created);
  } catch (err) {
    showToast('Failed to inject test email', 'error');
  }
}

async function handleResetDataset() {
  if (!confirm('Reset all inbox emails back to benchmark sample dataset?')) return;
  try {
    const res = await fetch('/api/emails/reset', { method: 'POST' });
    if (!res.ok) throw new Error('Reset failed');
    const data = await res.json();
    showToast(data.message, 'success');
    await loadData();
  } catch (err) {
    showToast('Failed to reset dataset', 'error');
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
}
