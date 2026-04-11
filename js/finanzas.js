/* ══════════════════════════════════════
   finanzas.js — Movimientos financieros
   ══════════════════════════════════════ */

async function renderFinanzasSection() {
  await dbGetFinances();
  renderFin();
  calcWeekAuto();
  renderGeneral();
}

// ── Tabla ──

function renderFin() {
  const tbody = document.getElementById('finTable');
  let items   = [...cache.finances];
  if (finFilter !== 'todos') items = items.filter(f => f.type === finFilter);

  if (!items.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Sin movimientos registrados</td></tr>';
    return;
  }
  tbody.innerHTML = items.map(f => `
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

function setFinFilter(f, btn) {
  finFilter = f;
  document.querySelectorAll('#finanzas .filter-row .filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderFin();
}

// ── Guardar ──

async function saveFin() {
  const description = document.getElementById('finDesc').value.trim();
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
      notes:       document.getElementById('finNotes').value.trim(),
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
  const totalIng = sumFinances('ingreso');
  const totalSal = sumFinances('salida');
  const bal      = totalIng - totalSal;
  document.getElementById('generalSummary').innerHTML = `
    <div style="display:flex;flex-direction:column;gap:8px;font-size:13px;">
      <div style="display:flex;justify-content:space-between"><span style="color:var(--gray)">Total ingresos</span><span style="color:var(--green);font-weight:500">${fmt(totalIng)}</span></div>
      <div style="display:flex;justify-content:space-between"><span style="color:var(--gray)">Total salidas</span><span style="color:var(--red);font-weight:500">${fmt(totalSal)}</span></div>
      <div style="display:flex;justify-content:space-between;padding-top:8px;border-top:1px solid var(--cream2)">
        <span style="font-weight:500">Balance total</span>
        <span style="font-family:'Cormorant Garamond',serif;font-size:20px;color:${bal>=0?'var(--green)':'var(--red)'};font-weight:600">${fmt(bal)}</span>
      </div>
      <div style="display:flex;justify-content:space-between"><span style="color:var(--gray)">Total citas</span><span>${cache.appointments.length}</span></div>
    </div>`;
}
