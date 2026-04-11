/* ══════════════════════════════════════
   dashboard.js — Pantalla de inicio
   ══════════════════════════════════════ */

async function renderDashboard() {
  const [appts, finances] = await Promise.all([
    dbGetAppointments(),
    dbGetFinances(),
  ]);

  const todayStr    = today();
  const range       = getWeekRange(new Date());
  const todayAppts  = appts.filter(a => a.date === todayStr)
                           .sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  const wkIng = finances.filter(f => f.type === 'ingreso' && f.date >= range.mon && f.date <= range.sun)
                         .reduce((s, f) => s + f.amount, 0);
  const wkSal = finances.filter(f => f.type === 'salida'  && f.date >= range.mon && f.date <= range.sun)
                         .reduce((s, f) => s + f.amount, 0);
  const wkBal = wkIng - wkSal;

  const wkCompleted = appts.filter(a => a.date >= range.mon && a.date <= range.sun && a.status === 'completada').length;
  const totalIng    = finances.filter(f => f.type === 'ingreso').reduce((s, f) => s + f.amount, 0);
  const totalCitas  = appts.filter(a => a.status === 'completada').length;

  // KPIs
  document.getElementById('kpiGrid').innerHTML = `
    <div class="kpi">
      <div class="kpi-label">Citas hoy</div>
      <div class="kpi-value">${todayAppts.length}</div>
      <div class="kpi-sub">${todayAppts.filter(a => a.status === 'completada').length} completadas</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Ingresos esta semana</div>
      <div class="kpi-value green">${fmt(wkIng)}</div>
      <div class="kpi-sub">${wkCompleted} citas completadas</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Balance semana</div>
      <div class="kpi-value ${wkBal >= 0 ? 'green' : 'red'}">${fmt(wkBal)}</div>
      <div class="kpi-sub">Salidas: ${fmt(wkSal)}</div>
    </div>
    <div class="kpi">
      <div class="kpi-label">Total ingresos</div>
      <div class="kpi-value">${fmt(totalIng)}</div>
      <div class="kpi-sub">${totalCitas} citas totales</div>
    </div>`;

  document.getElementById('todayCount').textContent = todayAppts.length;

  const tl = document.getElementById('todayList');
  tl.innerHTML = todayAppts.length
    ? todayAppts.map(a => `
        <li class="day-appt ${a.status}" onclick="showSection_agenda('${a.id}')">
          <span class="appt-time">${a.time || '—'}</span>
          <div>
            <div class="appt-client">${a.client_name}</div>
            <div class="appt-service">${a.service_name || ''} · ${fmt(a.price)}</div>
          </div>
          <span class="badge badge-${a.status}" style="margin-left:auto">${a.status}</span>
        </li>`).join('')
    : '<li class="empty-state">Sin citas hoy</li>';

  document.getElementById('wkIngresos').textContent = fmt(wkIng);
  document.getElementById('wkSalidas').textContent  = fmt(wkSal);
  document.getElementById('wkCitas').textContent    = wkCompleted;
  document.getElementById('wkBalance').textContent  = fmt(wkBal);
}
