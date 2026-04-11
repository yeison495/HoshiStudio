/* ══════════════════════════════════════
   clientes.js — Clientes y fidelización
   ══════════════════════════════════════ */

// ── Helpers ──

function clientInitials(name) {
  return name.split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase();
}

function clientAppts(clientId) {
  return cache.appointments.filter(a => a.client_id === clientId && a.status === 'completada');
}

function lastVisitDate(clientId) {
  const appts = clientAppts(clientId).sort((a, b) => b.date.localeCompare(a.date));
  return appts.length ? appts[0].date : null;
}

function daysSinceVisit(clientId) {
  const lv = lastVisitDate(clientId);
  return lv ? daysBetween(lv, today()) : null;
}

function birthdayThisMonth(birthday) {
  if (!birthday) return false;
  return parseInt(birthday.slice(5, 7)) === new Date().getMonth() + 1;
}

function daysUntilBirthday(birthday) {
  if (!birthday) return null;
  const now = new Date();
  const [, bm, bd] = birthday.slice(0, 10).split('-').map(Number);
  let next = new Date(now.getFullYear(), bm - 1, bd);
  if (next < now) next.setFullYear(now.getFullYear() + 1);
  return Math.ceil((next - now) / 86400000);
}

// ── Sección completa ──

async function renderClientesSection() {
  await Promise.all([dbGetClients(), dbGetAppointments(), dbGetServices()]);
  renderClients();
  renderLoyaltyPanel();
}

// ── Filtro ──

function setClientFilter(f, btn) {
  clientFilter = f;
  document.querySelectorAll('#clientes .filter-row .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderClients();
}

// ── Cuadrícula ──

function renderClients() {
  const grid = document.getElementById('clientGrid');
  const q    = (document.getElementById('clientSearch') || {}).value?.toLowerCase() || '';

  let clients = cache.clients.filter(c =>
    !q || c.name.toLowerCase().includes(q) || (c.phone || '').includes(q)
  );
  if (clientFilter === 'vip')    clients = clients.filter(c => clientAppts(c.id).length >= 3);
  if (clientFilter === 'alerta') clients = clients.filter(c => { const d = daysSinceVisit(c.id); return d !== null && d >= 30; });
  if (clientFilter === 'cumple') clients = clients.filter(c => birthdayThisMonth(c.birthday));

  if (!clients.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">Sin clientas${q ? ' encontradas' : ' registradas aún'}</div>`;
    return;
  }

  grid.innerHTML = clients.map(c => {
    const appts        = clientAppts(c.id);
    const isVip        = appts.length >= 3;
    const dsv          = daysSinceVisit(c.id);
    const isAlerta     = dsv !== null && dsv >= 30;
    const isBirthday   = birthdayThisMonth(c.birthday);
    const favSvc       = cache.services.find(s => s.id === c.fav_service_id);
    const totalGastado = appts.reduce((s, a) => s + (a.price || 0), 0);
    const dsvText      = dsv === null ? 'Sin visitas' : dsv === 0 ? 'Hoy' : `Hace ${dsv} días`;
    const cardClass    = ['client-card', isVip ? 'vip' : (isAlerta && appts.length > 0 ? 'alerta' : '')].filter(Boolean).join(' ');

    return `
    <div class="${cardClass}" onclick="showClientDetail('${c.id}')">
      <div class="client-header">
        <div class="client-avatar">${clientInitials(c.name)}</div>
        <div>
          <div class="client-name">${c.name}</div>
          <div class="client-phone">${c.phone || 'Sin teléfono'}</div>
          ${isBirthday ? `<div style="font-size:10px;color:var(--gold2);margin-top:2px">🎂 Cumpleaños este mes</div>` : ''}
        </div>
      </div>
      <div class="client-stats">
        <div class="client-stat"><div class="client-stat-val">${appts.length}</div><div class="client-stat-lbl">Visitas</div></div>
        <div class="client-stat"><div class="client-stat-val" style="font-size:13px">${fmt(totalGastado)}</div><div class="client-stat-lbl">Total</div></div>
        <div class="client-stat"><div class="client-stat-val" style="font-size:12px;${dsv !== null && dsv >= 30 ? 'color:var(--red)' : ''}">${dsvText}</div><div class="client-stat-lbl">Últ. visita</div></div>
      </div>
      ${favSvc ? `<div class="client-tags"><span class="client-tag">${favSvc.name}</span></div>` : ''}
    </div>`;
  }).join('');
}

// ── Detalle ──

function showClientDetail(id) {
  currentClientId = id;
  const c = cache.clients.find(x => x.id === id);
  if (!c) return;

  const appts        = clientAppts(id).sort((a, b) => b.date.localeCompare(a.date));
  const totalGastado = appts.reduce((s, a) => s + (a.price || 0), 0);
  const dsv          = daysSinceVisit(id);
  const dsvText      = dsv === null ? 'Sin visitas aún' : dsv === 0 ? 'Hoy' : `Hace ${dsv} días`;
  const favSvc       = cache.services.find(s => s.id === c.fav_service_id);
  const bday         = c.birthday
    ? new Date(c.birthday + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'long' }) : '—';
  const dub = daysUntilBirthday(c.birthday);

  document.getElementById('cdTitle').innerHTML = `
    <div style="display:flex;align-items:center;gap:14px">
      <div class="client-avatar" style="width:52px;height:52px;font-size:22px">${clientInitials(c.name)}</div>
      <div><div>${c.name}</div>${appts.length >= 3 ? '<span class="gold-tag" style="font-size:9px">VIP</span>' : ''}</div>
    </div>`;

  document.getElementById('cdContent').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:16px;margin-top:4px;">
      ${dub !== null && dub <= 7 ? `<div class="birthday-alert"><span style="font-size:20px">🎂</span><span>¡Cumpleaños en <strong>${dub === 0 ? 'hoy' : dub + ' días'}</strong>! (${bday})</span></div>` : ''}
      ${dsv !== null && dsv >= 30 ? `<div style="background:rgba(140,58,46,0.06);border:1px solid rgba(140,58,46,0.2);border-radius:8px;padding:10px 14px;font-size:13px;color:var(--red)">⚠ Sin visita hace ${dsv} días</div>` : ''}
      <div class="client-detail-grid">
        <div class="client-detail-item"><span class="client-detail-label">Teléfono</span><span class="client-detail-value">${c.phone || '—'}</span></div>
        <div class="client-detail-item"><span class="client-detail-label">Correo</span><span class="client-detail-value" style="font-size:12px">${c.email || '—'}</span></div>
        <div class="client-detail-item"><span class="client-detail-label">Cumpleaños</span><span class="client-detail-value">${bday}</span></div>
        <div class="client-detail-item"><span class="client-detail-label">Servicio favorito</span><span class="client-detail-value">${favSvc ? favSvc.name : '—'}</span></div>
        <div class="client-detail-item"><span class="client-detail-label">Total visitas</span><span class="client-detail-value">${appts.length}</span></div>
        <div class="client-detail-item"><span class="client-detail-label">Total gastado</span><span class="client-detail-value" style="color:var(--gold2)">${fmt(totalGastado)}</span></div>
        <div class="client-detail-item"><span class="client-detail-label">Última visita</span><span class="client-detail-value">${dsvText}</span></div>
        <div class="client-detail-item"><span class="client-detail-label">Cliente desde</span><span class="client-detail-value">${fmtDate(c.created_at)}</span></div>
      </div>
      ${c.allergies ? `<div><div class="client-detail-label" style="margin-bottom:4px">Alergias</div><div style="background:rgba(140,58,46,0.06);border-radius:6px;padding:8px 12px;font-size:13px;color:var(--red)">${c.allergies}</div></div>` : ''}
      ${c.notes     ? `<div><div class="client-detail-label" style="margin-bottom:4px">Notas</div><div style="background:var(--cream);border-radius:6px;padding:8px 12px;font-size:13px;color:var(--gray)">${c.notes}</div></div>` : ''}
      ${appts.length ? `
        <div>
          <div class="client-detail-label" style="margin-bottom:8px">Historial de visitas</div>
          <div class="timeline">
            ${appts.slice(0, 5).map(a => `
              <div class="timeline-item">
                <div class="timeline-dot"></div>
                <div>
                  <div style="font-weight:500;color:var(--black)">${a.service_name || 'Servicio'}</div>
                  <div style="color:var(--gray)">${fmtDate(a.date)} · ${fmt(a.price)}</div>
                </div>
              </div>`).join('')}
            ${appts.length > 5 ? `<div style="font-size:11px;color:var(--gray);padding-top:6px">y ${appts.length - 5} visitas más...</div>` : ''}
          </div>
        </div>` : '<div style="color:var(--gray);font-size:13px;font-style:italic">Sin visitas aún</div>'}
    </div>`;

  openModal('clientDetailModal');
}

// ── Guardar ──

async function saveClient() {
  const name = document.getElementById('clientName').value.trim();
  if (!name) { toast('Ingresa el nombre', 'error'); return; }

  setLoading(true);
  try {
    await dbSaveClient({
      id:             document.getElementById('clientEditId').value    || null,
      name,
      phone:          document.getElementById('clientPhone').value.trim(),
      email:          document.getElementById('clientEmail').value.trim(),
      birthday:       document.getElementById('clientBirthday').value  || null,
      fav_service_id: document.getElementById('clientFavService').value || null,
      allergies:      document.getElementById('clientAllergies').value.trim(),
      notes:          document.getElementById('clientNotes').value.trim(),
    });
    closeModal('clientModal');
    await renderClientesSection();
    toast('Clienta guardada ✦');
  } catch(e) {
    toast('Error guardando clienta', 'error');
    console.error(e);
  } finally { setLoading(false); }
}

function openClientModal() {
  document.getElementById('clientEditId').value = '';
  document.querySelector('#clientModal .modal-title').textContent = 'Nueva clienta';
  openModal('clientModal');
}

function editClientDetail() {
  closeModal('clientDetailModal');
  const c = cache.clients.find(x => x.id === currentClientId);
  if (!c) return;
  document.getElementById('clientEditId').value    = c.id;
  document.getElementById('clientName').value      = c.name;
  document.getElementById('clientPhone').value     = c.phone    || '';
  document.getElementById('clientEmail').value     = c.email    || '';
  document.getElementById('clientBirthday').value  = c.birthday ? c.birthday.slice(0,10) : '';
  document.getElementById('clientAllergies').value = c.allergies || '';
  document.getElementById('clientNotes').value     = c.notes    || '';
  document.querySelector('#clientModal .modal-title').textContent = 'Editar clienta';
  openModal('clientModal');
  setTimeout(() => { document.getElementById('clientFavService').value = c.fav_service_id || ''; }, 50);
}

async function deleteClient() {
  if (!confirm('¿Eliminar esta clienta?')) return;
  setLoading(true);
  try {
    await dbDeleteClient(currentClientId);
    closeModal('clientDetailModal');
    await renderClientesSection();
    toast('Clienta eliminada');
  } catch(e) {
    toast('Error eliminando clienta', 'error');
  } finally { setLoading(false); }
}

// ── Panel de fidelización ──

function renderLoyaltyPanel() {
  const vip    = cache.clients.filter(c => clientAppts(c.id).length >= 3);
  const alerta = cache.clients.filter(c => { const d = daysSinceVisit(c.id); return d !== null && d >= 30; });
  const cumple = cache.clients.filter(c => birthdayThisMonth(c.birthday));

  document.getElementById('fl-total').textContent  = cache.clients.length;
  document.getElementById('fl-vip').textContent    = vip.length;
  document.getElementById('fl-alerta').textContent = alerta.length;
  document.getElementById('fl-cumple').textContent = cumple.length;

  const bl = document.getElementById('birthdayList');
  bl.innerHTML = cumple.length
    ? cumple.sort((a,b) => daysUntilBirthday(a.birthday) - daysUntilBirthday(b.birthday)).map(c => {
        const dub = daysUntilBirthday(c.birthday);
        const d   = new Date(c.birthday + 'T12:00:00');
        return `<div class="birthday-alert" onclick="showClientDetail('${c.id}')" style="cursor:pointer">
          <span style="font-size:18px">🎂</span>
          <div>
            <div style="font-weight:500;font-size:13px">${c.name}</div>
            <div style="font-size:11px;color:var(--gray)">${dub===0?'¡Hoy!':dub===1?'Mañana':`En ${dub} días`} · ${d.toLocaleDateString('es-CO',{day:'numeric',month:'long'})}</div>
          </div>
        </div>`;}).join('')
    : '<div class="empty-state" style="padding:20px">Sin cumpleaños este mes</div>';

  const toRecover = cache.clients
    .filter(c => { const d = daysSinceVisit(c.id); return d !== null && d >= 30; })
    .sort((a,b) => (daysSinceVisit(b.id)||0) - (daysSinceVisit(a.id)||0));

  document.getElementById('recoverList').innerHTML = toRecover.length
    ? toRecover.slice(0,5).map(c => `
        <div class="day-appt" onclick="showClientDetail('${c.id}')" style="border-left-color:var(--red)">
          <div><div class="appt-client">${c.name}</div><div class="appt-service">Sin visita hace ${daysSinceVisit(c.id)} días</div></div>
        </div>`).join('')
    : '<div class="empty-state" style="padding:20px">¡Todas al día!</div>';

  const urgentes = cumple.filter(c => { const d = daysUntilBirthday(c.birthday); return d !== null && d <= 3; });
  document.getElementById('loyaltyAlerts').innerHTML = urgentes.map(c => {
    const d = daysUntilBirthday(c.birthday);
    return `<div class="birthday-alert"><span style="font-size:18px">🎂</span><span><strong>${c.name}</strong> — cumpleaños ${d===0?'¡hoy!':d===1?'mañana':`en ${d} días`}</span></div>`;
  }).join('');
}
