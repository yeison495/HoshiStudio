/* ══════════════════════════════════════
   finanzas.js — Movimientos financieros
   ══════════════════════════════════════ */

async function renderFinanzasSection() {
  await dbGetFinances();
  renderFin();
  calcWeekAuto();
  renderGeneral();
  if (document.getElementById('finHistoryModal').classList.contains('open')) renderFinHistory();
}

// ── Filtro, orden y filas (compartidos por el listado del mes y el historial) ──

function filterFinances(items, typeFilter, q) {
  if (typeFilter !== 'todos') items = items.filter(f => f.type === typeFilter);
  q = (q || '').toLowerCase().trim();
  if (q) items = items.filter(f =>
    (f.description || '').toLowerCase().includes(q) ||
    (f.category    || '').toLowerCase().includes(q) ||
    (f.notes       || '').toLowerCase().includes(q)
  );
  return items;
}

function sortFinances(items) {
  return items.sort((a, b) => {
    const va = finSort.col === 'amount' ? (a.amount || 0) : (a.date || '');
    const vb = finSort.col === 'amount' ? (b.amount || 0) : (b.date || '');
    if (va === vb) return 0;
    return finSort.asc ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
  });
}

function finRowsHtml(items, emptyMsg) {
  if (!items.length) return `<tr><td colspan="6" class="empty-state">${emptyMsg}</td></tr>`;
  return items.map(f => `
      <tr>
        <td>${fmtDate(f.date)}</td>
        <td>${f.description}</td>
        <td style="color:var(--gray);font-size:12px">${f.category}</td>
        <td><span class="badge badge-${f.type}">${f.type}</span></td>
        <td style="font-weight:500;color:${f.type==='ingreso'?'var(--green)':'var(--red)'}">${fmt(f.amount)}</td>
        <td style="display:flex;gap:4px">
          <button class="btn btn-sm"            onclick="editFin('${f.id}')">✎</button>
          <button class="btn btn-danger btn-sm" onclick="deleteFin('${f.id}')">✕</button>
        </td>
      </tr>`).join('');
}

// ── Movimientos del mes en curso ──

function renderFin() {
  const month = currentMonth();
  document.getElementById('finTitle').textContent = `Movimientos de ${monthLabel(month)}`;

  let items = cache.finances.filter(f => (f.date || '').startsWith(month));
  items = sortFinances(filterFinances(items, finFilter, document.getElementById('finSearch')?.value));

  const { page, totalPages, pageItems } = paginate(items, finPage, FIN_PAGE_SIZE);
  finPage = page;
  document.getElementById('finTable').innerHTML = finRowsHtml(pageItems, 'Sin movimientos este mes');
  renderPagination('finPagination', page, totalPages, items.length, 'goFinPage');
  updateFinSortBtns();
}

function goFinPage(p) {
  finPage = p;
  renderFin();
}

function setFinSort(col) {
  if (finSort.col === col) {
    finSort.asc = !finSort.asc;
  } else {
    finSort.col = col;
    finSort.asc = false;
  }
  finPage  = 1;
  histPage = 1;
  renderFin();
  if (document.getElementById('finHistoryModal').classList.contains('open')) renderFinHistory();
}

function updateFinSortBtns() {
  ['date', 'amount'].forEach(col => {
    const el = document.getElementById(`finSort_${col}`);
    if (!el) return;
    const label = col === 'date' ? 'Fecha' : 'Monto';
    const arrow = finSort.col === col ? (finSort.asc ? ' ↑' : ' ↓') : ' ↕';
    el.textContent = label + arrow;
    el.classList.toggle('active', finSort.col === col);
  });
}

function setFinFilter(f, btn) {
  finFilter = f;
  finPage   = 1;
  document.querySelectorAll('#finanzas .filter-row .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderFin();
}

// ── Guardar ──

async function saveFin() {
  const description = capitalize(document.getElementById('finDesc').value.trim());
  const amount      = +document.getElementById('finAmount').value || 0;
  const date        = document.getElementById('finDate').value;
  if (!description || !amount || !date) { toast('Completa todos los campos', 'error'); return; }

  setLoading(true);
  try {
    await dbSaveFinance({
      id:          document.getElementById('finEditId').value || null,
      type:        document.getElementById('finType').value,
      description, amount, date,
      category:    document.getElementById('finCategory').value,
      notes:       capitalize(document.getElementById('finNotes').value.trim()),
    });
    closeModal('finModal');
    await renderFinanzasSection();
    await renderDashboard();
    toast('Movimiento guardado ✦');
  } catch(e) {
    toast('Error guardando movimiento', 'error');
    console.error(e);
  } finally { setLoading(false); }
}

function editFin(id) {
  const f = cache.finances.find(x => x.id === id);
  if (!f) return;
  document.getElementById('finEditId').value    = f.id;
  document.getElementById('finType').value      = f.type;
  document.getElementById('finDesc').value      = f.description;
  document.getElementById('finAmount').value    = f.amount;
  document.getElementById('finDate').value      = f.date;
  document.getElementById('finCategory').value  = f.category;
  document.getElementById('finNotes').value     = f.notes || '';
  document.querySelector('#finModal .modal-title').textContent = 'Editar movimiento';
  openModal('finModal');
}

async function deleteFin(id) {
  if (!confirm('¿Eliminar este movimiento?')) return;
  setLoading(true);
  try {
    await dbDeleteFinance(id);
    await renderFinanzasSection();
    await renderDashboard();
    toast('Movimiento eliminado');
  } catch(e) {
    toast('Error eliminando movimiento', 'error');
  } finally { setLoading(false); }
}

// ── Cálculos semanales ──

function sumFinances(type, from, to) {
  return cache.finances
    .filter(f => f.type === type && (!from || f.date >= from) && (!to || f.date <= to))
    .reduce((s, f) => s + f.amount, 0);
}

function calcWeekAuto() {
  const range = getWeekRange(new Date());
  const ing   = sumFinances('ingreso', range.mon, range.sun);
  const sal   = sumFinances('salida',  range.mon, range.sun);
  document.getElementById('fw-ing').textContent = fmt(ing);
  document.getElementById('fw-sal').textContent = fmt(sal);
  document.getElementById('fw-bal').textContent = fmt(ing - sal);
}

function calcWeek() {
  const wp = document.getElementById('weekPicker').value;
  if (!wp) return;
  const [y, w] = wp.split('-W').map(Number);
  const jan4   = new Date(y, 0, 4);
  const mon    = new Date(jan4);
  mon.setDate(jan4.getDate() - ((jan4.getDay() || 7) - 1) + (w - 1) * 7);
  const sun = new Date(mon); sun.setDate(sun.getDate() + 6);
  renderWeekResult(mon.toISOString().slice(0,10), sun.toISOString().slice(0,10));
}

function renderWeekResult(mon, sun) {
  const ing   = sumFinances('ingreso', mon, sun);
  const sal   = sumFinances('salida',  mon, sun);
  const citas = cache.appointments.filter(a => a.status === 'completada' && a.date >= mon && a.date <= sun).length;
  const bal   = ing - sal;
  document.getElementById('weekResult').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:6px;font-size:13px;">
      <div style="color:var(--gray);font-size:11px;margin-bottom:4px">${fmtDate(mon)} — ${fmtDate(sun)}</div>
      <div style="display:flex;justify-content:space-between"><span style="color:var(--gray)">Ingresos</span><span style="color:var(--green);font-weight:500">${fmt(ing)}</span></div>
      <div style="display:flex;justify-content:space-between"><span style="color:var(--gray)">Salidas</span><span style="color:var(--red);font-weight:500">${fmt(sal)}</span></div>
      <div style="display:flex;justify-content:space-between"><span style="color:var(--gray)">Citas completadas</span><span>${citas}</span></div>
      <div style="display:flex;justify-content:space-between;padding-top:8px;border-top:1px solid var(--cream2);margin-top:4px">
        <span style="font-weight:500">Balance</span>
        <span style="font-family:'Cormorant Garamond',serif;font-size:18px;color:${bal>=0?'var(--green)':'var(--red)'};font-weight:600">${fmt(bal)}</span>
      </div>
    </div>`;
}

function renderGeneral() {
  const month    = currentMonth();
  const from     = `${month}-01`, to = `${month}-31`;
  const totalIng = sumFinances('ingreso', from, to);
  const totalSal = sumFinances('salida',  from, to);
  const bal      = totalIng - totalSal;
  const citas    = cache.appointments.filter(a => a.status === 'completada' && a.date.startsWith(month)).length;
  document.getElementById('generalTitle').textContent = `Resumen de ${monthLabel(month)}`;
  document.getElementById('generalSummary').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:8px;font-size:13px;">
      <div style="display:flex;justify-content:space-between"><span style="color:var(--gray)">Ingresos</span><span style="color:var(--green);font-weight:500">${fmt(totalIng)}</span></div>
      <div style="display:flex;justify-content:space-between"><span style="color:var(--gray)">Salidas</span><span style="color:var(--red);font-weight:500">${fmt(totalSal)}</span></div>
      <div style="display:flex;justify-content:space-between;padding-top:8px;border-top:1px solid var(--cream2)">
        <span style="font-weight:500">Balance del mes</span>
        <span style="font-family:'Cormorant Garamond',serif;font-size:20px;color:${bal>=0?'var(--green)':'var(--red)'};font-weight:600">${fmt(bal)}</span>
      </div>
      <div style="display:flex;justify-content:space-between"><span style="color:var(--gray)">Citas completadas</span><span>${citas}</span></div>
    </div>`;
}

// ── Historial (por día, mes o año) ──

function openFinHistory() {
  const now = new Date();
  document.getElementById('histMode').value   = 'mes';
  document.getElementById('histDay').value    = today();
  document.getElementById('histMonth').value  = String(now.getMonth() + 1).padStart(2, '0');
  document.getElementById('histYear').value   = now.getFullYear();
  document.getElementById('histSearch').value = '';
  histFilter = 'todos';
  histPage   = 1;
  document.querySelectorAll('#histFilters .filter-btn').forEach((b, i) => b.classList.toggle('active', i === 0));
  updateHistInputs();
  renderFinHistory();
  openModal('finHistoryModal');
}

function updateHistInputs() {
  const mode = document.getElementById('histMode').value;
  document.getElementById('histDay').style.display   = mode === 'dia' ? '' : 'none';
  document.getElementById('histMonth').style.display = mode === 'mes' ? '' : 'none';
  document.getElementById('histYear').style.display  = mode === 'dia' ? 'none' : '';
}

function onHistChange() {
  updateHistInputs();
  histPage = 1;
  renderFinHistory();
}

// Prefijo de fecha del período elegido: YYYY-MM-DD, YYYY-MM o YYYY
function histPrefix() {
  const mode = document.getElementById('histMode').value;
  const year = String(document.getElementById('histYear').value || '').trim();
  if (mode === 'dia') return document.getElementById('histDay').value || '';
  if (!/^\d{4}$/.test(year)) return '';
  return mode === 'mes' ? `${year}-${document.getElementById('histMonth').value}` : year;
}

function histPeriodLabel(prefix) {
  if (prefix.length === 10) return fmtDate(prefix);
  if (prefix.length === 7)  return monthLabel(prefix);
  return `Año ${prefix}`;
}

function renderFinHistory() {
  const tbody  = document.getElementById('histTable');
  const sumEl  = document.getElementById('histSummary');
  const prefix = histPrefix();

  if (!prefix) {
    sumEl.innerHTML = '';
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Selecciona un período</td></tr>';
    renderPagination('histPagination', 1, 1, 0, 'goHistPage');
    return;
  }

  const period = cache.finances.filter(f => (f.date || '').startsWith(prefix));
  const ing    = period.filter(f => f.type === 'ingreso').reduce((s, f) => s + f.amount, 0);
  const sal    = period.filter(f => f.type === 'salida').reduce((s, f) => s + f.amount, 0);
  const bal    = ing - sal;
  sumEl.innerHTML = `
    <div class="hist-summary">
      <div class="hist-period">${histPeriodLabel(prefix)}</div>
      <div><span>Ingresos</span><strong style="color:var(--green)">${fmt(ing)}</strong></div>
      <div><span>Salidas</span><strong style="color:var(--red)">${fmt(sal)}</strong></div>
      <div><span>Balance</span><strong style="color:${bal>=0?'var(--green)':'var(--red)'}">${fmt(bal)}</strong></div>
    </div>`;

  const items = sortFinances(filterFinances(period, histFilter, document.getElementById('histSearch').value));
  const { page, totalPages, pageItems } = paginate(items, histPage, FIN_PAGE_SIZE);
  histPage = page;
  tbody.innerHTML = finRowsHtml(pageItems, 'Sin movimientos en este período');
  renderPagination('histPagination', page, totalPages, items.length, 'goHistPage');
}

function goHistPage(p) {
  histPage = p;
  renderFinHistory();
}

function setHistFilter(f, btn) {
  histFilter = f;
  histPage   = 1;
  document.querySelectorAll('#histFilters .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderFinHistory();
}
