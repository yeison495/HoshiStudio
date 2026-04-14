/* ══════════════════════════════════════
   servicios.js — Catálogo de servicios
   ══════════════════════════════════════ */

async function renderServices() {
  const services = await dbGetServices();
  const g = document.getElementById('serviceGrid');

  if (!services.length) {
    g.innerHTML = '<div class="empty-state" style="grid-column:1/-1">Sin servicios registrados</div>';
    return;
  }

  g.innerHTML = services.map(s => `
    <div class="service-card">
      <div class="service-name">${s.name}</div>
      <div class="service-price">${fmt(s.price)}</div>
      <div class="service-dur">${s.duration ? s.duration + ' min' : ''}</div>
      ${s.description ? `<div style="font-size:12px;color:var(--gray);margin-top:4px">${s.description}</div>` : ''}
      <div class="service-actions">
        <button class="btn btn-sm"            onclick="editSvc('${s.id}')">Editar</button>
        <button class="btn btn-danger btn-sm" onclick="deleteSvc('${s.id}')">✕</button>
      </div>
    </div>`).join('');
}

async function saveSvc() {
  const name  = capitalize(document.getElementById('svcName').value.trim());
  const price = +document.getElementById('svcPrice').value    || 0;
  const dur   = +document.getElementById('svcDuration').value || 0;
  const desc  = capitalize(document.getElementById('svcDesc').value.trim());
  if (!name) { toast('Ingresa el nombre del servicio', 'error'); return; }

  setLoading(true);
  try {
    await dbSaveService({
      id:          document.getElementById('svcEditId').value || null,
      name, price,
      duration:    dur,
      description: desc,
    });
    closeModal('svcModal');
    await renderServices();
    toast('Servicio guardado ✦');
  } catch(e) {
    toast('Error guardando servicio', 'error');
  } finally { setLoading(false); }
}

function editSvc(id) {
  const s = cache.services.find(x => x.id === id);
  if (!s) return;
  document.getElementById('svcEditId').value   = s.id;
  document.getElementById('svcName').value     = s.name;
  document.getElementById('svcPrice').value    = s.price;
  document.getElementById('svcDuration').value = s.duration;
  document.getElementById('svcDesc').value     = s.description || '';
  document.querySelector('#svcModal .modal-title').textContent = 'Editar servicio';
  openModal('svcModal');
}

async function deleteSvc(id) {
  if (!confirm('¿Eliminar este servicio?')) return;
  setLoading(true);
  try {
    await dbDeleteService(id);
    await renderServices();
    toast('Servicio eliminado');
  } catch(e) {
    toast('Error eliminando servicio', 'error');
  } finally { setLoading(false); }
}
