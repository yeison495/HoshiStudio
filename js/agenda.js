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

function renderAllAppts() {
  const tbody = document.getElementById('allApptTable');
  const appts = [...cache.appointments];
  if (!appts.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="empty-state">Sin citas registradas</td></tr>';
    return;
  }
  tbody.innerHTML = appts.map(a => `
    <tr>
      <td>${fmtDate(a.date)} ${a.time || ''}</td>
      <td>${a.client_name}</td>
      <td style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${a.service_name || ''}</td>
      <td><span class="badge badge-${a.status}">${a.status}</span></td>
      <td><button class="btn btn-sm" onclick="showApptDetail('${a.id}')">Ver</button></td>
    </tr>`).join('');
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
    status:       document.getElementById('apptStatus').value,
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

  document.getElementById('detailTitle').textContent = a.client_name;
  document.getElementById('detailContent').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:8px;font-size:13px;">
      <div style="display:flex;justify-content:space-between"><span style="color:var(--gray)">Fecha</span><span>${fmtDate(a.date)} ${a.time || ''}</span></div>
      <div style="display:flex;justify-content:space-between"><span style="color:var(--gray)">Servicio</span><span>${a.service_name || '—'}</span></div>
      <div style="display:flex;justify-content:space-between"><span style="color:var(--gray)">Valor</span><span style="font-weight:500;color:var(--gold2)">${fmt(a.price)}</span></div>
      <div style="display:flex;justify-content:space-between"><span style="color:var(--gray)">Estado</span><span class="badge badge-${a.status}">${a.status}</span></div>
      ${a.phone ? `<div style="display:flex;justify-content:space-between"><span style="color:var(--gray)">Teléfono</span><span>${a.phone}</span></div>` : ''}
      ${a.notes ? `<div style="padding:10px;background:var(--cream);border-radius:6px;color:var(--gray)">${a.notes}</div>` : ''}
    </div>`;
  openModal('apptDetailModal');
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
  document.getElementById('apptStatus').value  = a.status;
  document.getElementById('apptPrice').value   = a.price  || '';
  document.querySelector('#apptModal .modal-title').textContent = 'Editar cita';
  openModal('apptModal');
  setTimeout(() => {
    document.getElementById('apptService').value  = a.service_id || '';
    document.getElementById('apptClientId').value = a.client_id  || '';
  }, 50);
}

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
