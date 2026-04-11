/* ══════════════════════════════════════
   ui.js — Navegación, modales y toast
   ══════════════════════════════════════ */

// ── Navegación ──

async function showSection(id) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  event.currentTarget.classList.add('active');

  setLoading(true);
  try {
    if (id === 'dashboard') await renderDashboard();
    if (id === 'agenda')    await renderAgenda();
    if (id === 'servicios') await renderServices();
    if (id === 'clientes')  await renderClientesSection();
    if (id === 'finanzas')  await renderFinanzasSection();
  } catch(e) {
    toast('Error cargando datos');
    console.error(e);
  } finally {
    setLoading(false);
  }
}

async function showSection_agenda(apptId) {
  currentApptId = apptId;
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('agenda').classList.add('active');
  document.querySelectorAll('.nav-tab')[1].classList.add('active');
  setLoading(true);
  await renderAgenda();
  setLoading(false);
  showApptDetail(apptId);
}

// ── Modales ──

function openModal(id) {
  document.getElementById(id).classList.add('open');
  if (id === 'apptModal') {
    _populateApptSelects();
    if (!document.getElementById('apptEditId').value) {
      document.getElementById('apptDate').value = selectedDate || today();
    }
  }
  if (id === 'clientModal') _populateClientServiceSelect();
  if (id === 'finModal')    document.getElementById('finDate').value = today();
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  _resetForm(id);
}

document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) closeModal(m.id); });
});

function _resetForm(id) {
  const fields = {
    apptModal:         ['apptClient','apptPhone','apptDate','apptTime','apptNotes','apptPrice','apptEditId'],
    clientModal:       ['clientName','clientPhone','clientEmail','clientBirthday','clientAllergies','clientNotes','clientEditId'],
    svcModal:          ['svcName','svcPrice','svcDuration','svcDesc','svcEditId'],
    finModal:          ['finDesc','finAmount','finDate','finNotes','finEditId'],
  };
  const selects = {
    apptModal:   { apptStatus: 'pendiente', apptClientId: '', apptService: '' },
    clientModal: { clientFavService: '' },
    finModal:    { finType: 'ingreso', finCategory: 'servicio' },
  };
  const titles = {
    apptModal:   'Nueva cita',
    clientModal: 'Nueva clienta',
    svcModal:    'Agregar servicio',
    finModal:    'Registrar movimiento',
  };

  (fields[id] || []).forEach(f => { const el = document.getElementById(f); if (el) el.value = ''; });
  Object.entries(selects[id] || {}).forEach(([k, v]) => { const el = document.getElementById(k); if (el) el.value = v; });
  const titleEl = document.getElementById(id.replace('Modal','ModalTitle').replace('appt','appt').replace('client','client').replace('svc','svc').replace('fin','fin'));
  if (titles[id]) {
    // find the .modal-title inside the modal
    const modal = document.getElementById(id);
    if (modal) {
      const t = modal.querySelector('.modal-title');
      if (t) t.textContent = titles[id];
    }
  }
}

function _populateApptSelects() {
  const svcSel = document.getElementById('apptService');
  svcSel.innerHTML = '<option value="">— Selecciona servicio —</option>';
  cache.services.forEach(s => {
    svcSel.innerHTML += `<option value="${s.id}">${s.name} (${fmt(s.price)})</option>`;
  });

  const cliSel = document.getElementById('apptClientId');
  cliSel.innerHTML = '<option value="">— Clienta existente (opcional) —</option>';
  cache.clients.forEach(c => {
    cliSel.innerHTML += `<option value="${c.id}">${c.name}</option>`;
  });
}

function _populateClientServiceSelect() {
  const sel = document.getElementById('clientFavService');
  sel.innerHTML = '<option value="">— Selecciona —</option>';
  cache.services.forEach(s => {
    sel.innerHTML += `<option value="${s.id}">${s.name}</option>`;
  });
}

function apptClientSelected() {
  const cid = document.getElementById('apptClientId').value;
  if (!cid) return;
  const c = cache.clients.find(x => x.id === cid);
  if (!c) return;
  document.getElementById('apptClient').value = c.name;
  document.getElementById('apptPhone').value  = c.phone || '';
  if (c.fav_service_id) {
    setTimeout(() => { document.getElementById('apptService').value = c.fav_service_id; }, 50);
  }
}

// ── Toast ──

function toast(msg, type = 'ok') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (type === 'error' ? ' error' : '');
  setTimeout(() => t.classList.remove('show'), 2800);
}

// ── Fecha en nav ──

function updateNavDate() {
  document.getElementById('navDate').textContent = new Date()
    .toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })
    .replace(/^\w/, c => c.toUpperCase());
}
