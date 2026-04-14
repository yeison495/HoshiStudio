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
  const p = parseBirthday(birthday);
  return p ? p.m === new Date().getMonth() + 1 : false;
}

function daysUntilBirthday(birthday) {
  if (!birthday) return null;
  const p = parseBirthday(birthday);
  if (!p) return null;
  const now  = new Date();
  let   next = new Date(now.getFullYear(), p.m - 1, p.d);
  if (next < now) next.setFullYear(now.getFullYear() + 1);
  return Math.ceil((next - now) / 86400000);
}

// Formatea número a URL de WhatsApp (soporta Colombia +57 / 10 dígitos)
function formatWhatsApp(phone) {
  if (!phone) return null;
  let n = phone.replace(/[\s\-\(\)\.]/g, '');
  if (n.startsWith('+')) n = n.slice(1);
  if (n.length === 10 && n.startsWith('3')) n = '57' + n;
  return n || null;
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
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">Sin clientes${q ? ' encontrados' : ' registrados aún'}</div>`;
    return;
  }

  // SVG WhatsApp inline compacto
  const waSVG = `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94
    1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297
    -.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149
    -.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297
    -1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489
    1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074
    -.124-.272-.198-.57-.347z"/>
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.558 4.124 1.532 5.862L0 24l6.283-1.51A11.945 11.945 0 0012
    24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818c-1.944 0-3.771-.527-5.338-1.444l-.383-.227-3.73.896
    .932-3.618-.25-.398A9.786 9.786 0 012.182 12C2.182 6.59 6.59 2.182 12 2.182S21.818 6.59 21.818 12
    17.41 21.818 12 21.818z"/>
  </svg>`;

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
    const waNr         = formatWhatsApp(c.phone);

    // Últimos servicios únicos agendados (hasta 3)
    const recentSvcs = [...new Set(
      cache.appointments
        .filter(a => a.client_id === c.id && a.service_name)
        .sort((a, b) => b.date.localeCompare(a.date))
        .map(a => a.service_name)
    )].slice(0, 3);

    return `
    <div class="${cardClass}" onclick="showClientDetail('${c.id}')">
      <div class="client-header">
        <div class="client-avatar">${clientInitials(c.name)}</div>
        <div style="flex:1;min-width:0">
          <div class="client-name">${c.name}</div>
          <div class="client-phone">${c.phone || 'Sin teléfono'}</div>
          ${isBirthday ? `<div style="font-size:10px;color:var(--gold2);margin-top:2px">🎂 Cumpleaños este mes</div>` : ''}
        </div>
        ${waNr ? `<a href="https://wa.me/${waNr}" target="_blank" class="btn-whatsapp"
            onclick="event.stopPropagation()" title="Abrir WhatsApp">
            ${waSVG} WA
          </a>` : ''}
      </div>
      <div class="client-stats">
        <div class="client-stat"><div class="client-stat-val">${appts.length}</div><div class="client-stat-lbl">Visitas</div></div>
        <div class="client-stat"><div class="client-stat-val" style="font-size:13px">${fmt(totalGastado)}</div><div class="client-stat-lbl">Total</div></div>
        <div class="client-stat"><div class="client-stat-val" style="font-size:12px;${dsv !== null && dsv >= 30 ? 'color:var(--red)' : ''}">${dsvText}</div><div class="client-stat-lbl">Últ. visita</div></div>
      </div>
      ${recentSvcs.length ? `
        <div class="client-services">
          <div class="client-services-label">Procedimientos</div>
          <div class="client-tags" style="margin-top:4px">${recentSvcs.map(s => `<span class="client-tag">${s}</span>`).join('')}</div>
        </div>` : (favSvc ? `<div class="client-tags"><span class="client-tag">${favSvc.name}</span></div>` : '')}
    </div>`;
  }).join('');
}

// ── Detalle ──

function showClientDetail(id) {
  currentClientId = id;
  const c = cache.clients.find(x => x.id === id);
  if (!c) return;

  const appts        = clientAppts(id).sort((a, b) => b.date.localeCompare(a.date));
  const allAppts     = cache.appointments.filter(a => a.client_id === id);
  const totalGastado = appts.reduce((s, a) => s + (a.price || 0), 0);
  const dsv          = daysSinceVisit(id);
  const dsvText      = dsv === null ? 'Sin visitas aún' : dsv === 0 ? 'Hoy' : `Hace ${dsv} días`;
  const favSvc       = cache.services.find(s => s.id === c.fav_service_id);
  const bday         = fmtBirthday(c.birthday);
  const dub          = daysUntilBirthday(c.birthday);
  const waNr         = formatWhatsApp(c.phone);

  // Resumen de servicios agendados (con conteo)
  const svcSummary = {};
  allAppts.forEach(a => { if (a.service_name) svcSummary[a.service_name] = (svcSummary[a.service_name] || 0) + 1; });
  const svcList = Object.entries(svcSummary).sort((a, b) => b[1] - a[1]);

  const waSVG = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.558 4.124 1.532 5.862L0 24l6.283-1.51A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818c-1.944 0-3.771-.527-5.338-1.444l-.383-.227-3.73.896.932-3.618-.25-.398A9.786 9.786 0 012.182 12C2.182 6.59 6.59 2.182 12 2.182S21.818 6.59 21.818 12 17.41 21.818 12 21.818z"/></svg>`;

  document.getElementById('cdTitle').innerHTML = `
    <div style="display:flex;align-items:center;gap:14px">
      <div class="client-avatar" style="width:52px;height:52px;font-size:22px">${clientInitials(c.name)}</div>
      <div>
        <div>${c.name}</div>
        ${appts.length >= 3 ? '<span class="gold-tag" style="font-size:9px">VIP</span>' : ''}
        ${waNr ? `<a href="https://wa.me/${waNr}" target="_blank" class="btn-whatsapp" style="margin-top:6px;font-size:11px;display:inline-flex">
          ${waSVG} WhatsApp
        </a>` : ''}
      </div>
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
      ${svcList.length ? `
        <div>
          <div class="client-detail-label" style="margin-bottom:8px">Servicios agendados</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px">
            ${svcList.map(([name, count]) => `<span class="client-tag">${name} <span style="opacity:.5">(${count})</span></span>`).join('')}
          </div>
        </div>` : ''}
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

  const bm       = document.getElementById('clientBirthdayMonth').value;
  const bd       = document.getElementById('clientBirthdayDay').value;
  const birthday = (bm && bd) ? `${bm}-${bd}` : null;

  setLoading(true);
  try {
    await dbSaveClient({
      id:             document.getElementById('clientEditId').value    || null,
      name:           capitalize(name),
      phone:          document.getElementById('clientPhone').value.trim(),
      email:          document.getElementById('clientEmail').value.trim().toLowerCase(),
      birthday,
      fav_service_id: document.getElementById('clientFavService').value || null,
      allergies:      capitalize(document.getElementById('clientAllergies').value.trim()),
      notes:          capitalize(document.getElementById('clientNotes').value.trim()),
    });
    closeModal('clientModal');
    await renderClientesSection();
    toast('Cliente guardado ✦');
  } catch(e) {
    toast('Error guardando cliente', 'error');
    console.error(e);
  } finally { setLoading(false); }
}

function openClientModal() {
  document.getElementById('clientEditId').value = '';
  document.querySelector('#clientModal .modal-title').textContent = 'Nuevo cliente';
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
  document.getElementById('clientAllergies').value = c.allergies || '';
  document.getElementById('clientNotes').value     = c.notes    || '';
  document.querySelector('#clientModal .modal-title').textContent = 'Editar cliente';

  // Cumpleaños: soporta formato "MM-DD" y "YYYY-MM-DD" (legado)
  if (c.birthday) {
    const p = parseBirthday(c.birthday);
    if (p) {
      document.getElementById('clientBirthdayMonth').value = String(p.m).padStart(2, '0');
      document.getElementById('clientBirthdayDay').value   = String(p.d).padStart(2, '0');
    }
  } else {
    document.getElementById('clientBirthdayMonth').value = '';
    document.getElementById('clientBirthdayDay').value   = '';
  }

  openModal('clientModal');
  setTimeout(() => { document.getElementById('clientFavService').value = c.fav_service_id || ''; }, 50);
}

async function deleteClient() {
  if (!confirm('¿Eliminar este cliente?')) return;
  setLoading(true);
  try {
    await dbDeleteClient(currentClientId);
    closeModal('clientDetailModal');
    await renderClientesSection();
    toast('Cliente eliminado');
  } catch(e) {
    toast('Error eliminando cliente', 'error');
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
        return `<div class="birthday-alert" onclick="showClientDetail('${c.id}')" style="cursor:pointer">
          <span style="font-size:18px">🎂</span>
          <div>
            <div style="font-weight:500;font-size:13px">${c.name}</div>
            <div style="font-size:11px;color:var(--gray)">${dub===0?'¡Hoy!':dub===1?'Mañana':`En ${dub} días`} · ${fmtBirthday(c.birthday)}</div>
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
    : '<div class="empty-state" style="padding:20px">¡Todos al día!</div>';

  const urgentes = cumple.filter(c => { const d = daysUntilBirthday(c.birthday); return d !== null && d <= 3; });
  document.getElementById('loyaltyAlerts').innerHTML = urgentes.map(c => {
    const d = daysUntilBirthday(c.birthday);
    return `<div class="birthday-alert"><span style="font-size:18px">🎂</span><span><strong>${c.name}</strong> — cumpleaños ${d===0?'¡hoy!':d===1?'mañana':`en ${d} días`}</span></div>`;
  }).join('');
}
