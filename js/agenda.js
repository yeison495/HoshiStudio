/* ══════════════════════════════════════
   agenda.js — Calendario y citas
   ══════════════════════════════════════ */

async function renderAgenda() {
  await dbGetAppointments();
  await dbGetClients();
  await dbGetServices();
  renderCal();
  renderAllAppts();
  if (selectedDate) renderDayAppts();
}

// ── Calendario ──

function renderCal() {
  const y = calDate.getFullYear(), m = calDate.getMonth();
  document.getElementById('calMonth').textContent = new Date(y, m, 1)
    .toLocaleString('es-CO', { month: 'long', year: 'numeric' })
    .replace(/^\w/, c => c.toUpperCase());

  const firstDay    = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const todayStr    = today();
  const headers     = ['Do','Lu','Ma','Mi','Ju','Vi','Sa'];

  let html = headers.map(d => `<div class="cal-day-header">${d}</div>`).join('');
  for (let i = 0; i < firstDay; i++) html += `<div class="cal-day other-month"></div>`;

  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const hasAppt = cache.appointments.some(a => a.date === ds);
    const cls = ['cal-day',
      ds === todayStr     ? 'today'    : '',
      ds === selectedDate ? 'selected' : '',
    ].filter(Boolean).join(' ');
    html += `<div class="${cls}" onclick="selectDay('${ds}')">${d}${hasAppt ? '<div class="cal-dot"></div>' : ''}</div>`;
  }
  document.getElementById('calGrid').innerHTML = html;
}

function changeMonth(delta) {
  calDate.setMonth(calDate.getMonth() + delta);
  renderCal();
}

function selectDay(ds) {
  selectedDate = ds;
  renderCal();
  document.getElementById('selectedDayTitle').textContent = new Date(ds + 'T12:00:00')
    .toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
    .replace(/^\w/, c => c.toUpperCase());
  renderDayAppts();
}

function renderDayAppts() {
  const list = document.getElementById('dayApptList');
  if (!selectedDate) { list.innerHTML = '<li class="empty-state">Selecciona un día</li>'; return; }

  let appts = cache.appointments.filter(a => a.date === selectedDate);
  if (apptFilter !== 'todas') appts = appts.filter(a => a.status === apptFilter);
  appts.sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  list.innerHTML = appts.length
    ? appts.map(a => `
        <li class="day-appt ${a.status}" onclick="showApptDetail('${a.id}')">
          <span class="appt-time">${a.time || '—'}</span>
          <div>
            <div class="appt-client">${a.client_name}</div>
            <div class="appt-service">${a.service_name || ''} · ${fmt(a.price)}</div>
          </div>
        </li>`).join('')
    : '<li class="empty-state">Sin citas este día</li>';
}

function setApptFilter(f, btn) {
  apptFilter = f;
  document.querySelectorAll('#agenda .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderDayAppts();
}

const STATUS_ICON = {
  pendiente:  { symbol: '◔', color: '#c9a84c', label: 'Pendiente' },
  confirmada: { symbol: '◉', color: '#4a7c59', label: 'Confirmada' },
  completada: { symbol: '✔', color: '#5a9e6f', label: 'Completada' },
  cancelada:  { symbol: '✕', color: '#c05a4a', label: 'Cancelada' },
};

function renderAllAppts() {
  const tbody = document.getElementById('allApptTable');
  const appts = [...cache.appointments];
  if (!appts.length) {
    tbody.innerHTML = '<tr><td colspan="2" class="empty-state">Sin citas registradas</td></tr>';
    return;
  }
  tbody.innerHTML = appts.map(a => {
    const si = STATUS_ICON[a.status] || { symbol: '?', color: '#999', label: a.status };
    return `
    <tr class="appt-row" onclick="showApptDetail('${a.id}')">
      <td>${a.client_name}</td>
      <td style="max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
        <span class="status-dot" style="color:${si.color}" title="${si.label}">${si.symbol}</span>
        ${a.service_name || '—'}
      </td>
    </tr>`;
  }).join('');
}

// ── Guardar cita ──

async function saveAppt() {
  const client_name = capitalize(document.getElementById('apptClient').value.trim());
  const date        = document.getElementById('apptDate').value;
  if (!client_name || !date) { toast('Completa nombre y fecha', 'error'); return; }

  const svcId  = document.getElementById('apptService').value;
  const svc    = cache.services.find(s => s.id === svcId);
  const apptId = document.getElementById('apptEditId').value || null;

  // Detectar estado anterior (para auto-registro en finanzas)
  const prevAppt   = apptId ? cache.appointments.find(a => a.id === apptId) : null;
  const prevStatus = prevAppt?.status || null;

  const payload = {
    id:           apptId,
    client_id:    document.getElementById('apptClientId').value || null,
    client_name,
    phone:        document.getElementById('apptPhone').value.trim(),
    service_id:   svcId || null,
    service_name: svc ? svc.name : '',
    date,
    time:         document.getElementById('apptTime').value || null,
    status:       prevAppt ? prevAppt.status : 'pendiente',
    price:        +document.getElementById('apptPrice').value || (svc ? svc.price : 0),
    notes:        capitalize(document.getElementById('apptNotes').value.trim()),
  };

  setLoading(true);
  try {
    await dbSaveAppointment(payload);

    // ── Auto-registro en Finanzas al completar cita ──
    const isNowCompleted  = payload.status === 'completada';
    const wasCompleted    = prevStatus === 'completada';
    if (isNowCompleted && !wasCompleted && payload.price > 0) {
      await dbSaveFinance({
        id:          null,
        type:        'ingreso',
        description: `Cita completada — ${client_name}`,
        amount:      payload.price,
        category:    'servicio',
        date:        date,
        notes:       payload.service_name ? `Servicio: ${payload.service_name}` : '',
      });
    }

    closeModal('apptModal');
    await renderAgenda();
    await renderDashboard();
    toast('Cita guardada ✦');
  } catch(e) {
    toast('Error guardando cita', 'error');
    console.error(e);
  } finally { setLoading(false); }
}

// ── Detalle / editar / eliminar cita ──

function showApptDetail(id) {
  currentApptId = id;
  const a = cache.appointments.find(x => x.id === id);
  if (!a) return;
  const si = STATUS_ICON[a.status] || { symbol: '?', color: '#999', label: a.status };
  const canComplete = a.status !== 'completada' && a.status !== 'cancelada';

  document.getElementById('detailTitle').textContent = a.client_name;
  document.getElementById('detailContent').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:10px;font-size:13px;">
      <div style="display:flex;justify-content:space-between"><span style="color:var(--gray)">Fecha</span><span>${fmtDate(a.date)} ${a.time || ''}</span></div>
      <div style="display:flex;justify-content:space-between"><span style="color:var(--gray)">Servicio</span><span>${a.service_name || '—'}</span></div>
      <div style="display:flex;justify-content:space-between"><span style="color:var(--gray)">Valor</span><span style="font-weight:500;color:var(--gold2)">${fmt(a.price)}</span></div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="color:var(--gray)">Estado</span>
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="status-badge-pill badge badge-${a.status}" onclick="toggleStatusSelect()" title="Clic para cambiar estado">
            <span style="color:${si.color};font-size:11px;">${si.symbol}</span> ${si.label}
          </span>
          <select id="detailStatusSelect" class="status-quick-select" style="display:none" onchange="changeApptStatus(this.value)">
            <option value="pendiente"  ${a.status==='pendiente'  ?'selected':''}>Pendiente</option>
            <option value="confirmada" ${a.status==='confirmada' ?'selected':''}>Confirmada</option>
            <option value="completada" ${a.status==='completada' ?'selected':''}>Completada</option>
            <option value="cancelada"  ${a.status==='cancelada'  ?'selected':''}>Cancelada</option>
          </select>
        </div>
      </div>
      ${a.phone ? `<div style="display:flex;justify-content:space-between"><span style="color:var(--gray)">Teléfono</span><span>${a.phone}</span></div>` : ''}
      ${a.notes ? `<div style="padding:10px;background:var(--cream);border-radius:6px;color:var(--gray);margin-top:4px">${a.notes}</div>` : ''}
    </div>
    ${canComplete ? `
    <button class="btn-complete-full" onclick="completeApptFromDetail()">
      <span>✔</span> Completar cita
    </button>` : ''}`;
  openModal('apptDetailModal');
}

function toggleStatusSelect() {
  const sel = document.getElementById('detailStatusSelect');
  if (!sel) return;
  sel.style.display = sel.style.display === 'none' ? 'inline-block' : 'none';
  if (sel.style.display !== 'none') sel.focus();
}

async function changeApptStatus(newStatus) {
  const a = cache.appointments.find(x => x.id === currentApptId);
  if (!a) return;
  setLoading(true);
  try {
    const wasCompleted = a.status === 'completada';
    const isNowCompleted = newStatus === 'completada';
    await dbSaveAppointment({ ...a, status: newStatus });
    if (isNowCompleted && !wasCompleted && a.price > 0) {
      await dbSaveFinance({
        id: null, type: 'ingreso',
        description: `Cita completada — ${a.client_name}`,
        amount: a.price, category: 'servicio', date: a.date,
        notes: a.service_name ? `Servicio: ${a.service_name}` : '',
      });
    }
    closeModal('apptDetailModal');
    await renderAgenda();
    await renderDashboard();
    toast('Estado actualizado ✦');
  } catch(e) {
    toast('Error actualizando estado', 'error');
    console.error(e);
  } finally { setLoading(false); }
}

async function completeApptFromDetail() {
  const a = cache.appointments.find(x => x.id === currentApptId);
  if (!a || a.status === 'completada') return;
  setLoading(true);
  try {
    await dbSaveAppointment({ ...a, status: 'completada' });
    if (a.price > 0) {
      await dbSaveFinance({
        id: null, type: 'ingreso',
        description: `Cita completada — ${a.client_name}`,
        amount: a.price, category: 'servicio', date: a.date,
        notes: a.service_name ? `Servicio: ${a.service_name}` : '',
      });
    }
    closeModal('apptDetailModal');
    await renderAgenda();
    await renderDashboard();
    toast('Cita completada ✦');
  } catch(e) {
    toast('Error al completar cita', 'error');
    console.error(e);
  } finally { setLoading(false); }
}

function editApptDetail() {
  closeModal('apptDetailModal');
  const a = cache.appointments.find(x => x.id === currentApptId);
  if (!a) return;
  document.getElementById('apptEditId').value  = a.id;
  document.getElementById('apptClient').value  = a.client_name;
  document.getElementById('apptPhone').value   = a.phone  || '';
  document.getElementById('apptDate').value    = a.date;
  document.getElementById('apptTime').value    = a.time   || '';
  document.getElementById('apptNotes').value   = a.notes  || '';
  // El estado se conserva internamente; no se expone en el formulario
  document.getElementById('apptPrice').value   = a.price  || '';
  document.querySelector('#apptModal .modal-title').textContent = 'Editar cita';
  openModal('apptModal');
  setTimeout(() => {
    document.getElementById('apptService').value  = a.service_id || '';
    document.getElementById('apptClientId').value = a.client_id  || '';
  }, 50);
}

// completeApptFromDetail y changeApptStatus definidos arriba junto a showApptDetail

async function deleteApptDetail() {
  if (!confirm('¿Eliminar esta cita?')) return;
  setLoading(true);
  try {
    await dbDeleteAppointment(currentApptId);
    closeModal('apptDetailModal');
    await renderAgenda();
    await renderDashboard();
    toast('Cita eliminada');
  } catch(e) {
    toast('Error eliminando cita', 'error');
  } finally { setLoading(false); }
}
