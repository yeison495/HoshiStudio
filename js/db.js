/* ══════════════════════════════════════
   db.js — Operaciones con Supabase
   Cada función habla directamente con
   la base de datos en la nube.
   ══════════════════════════════════════ */


// ════════════════════════════════
// SERVICIOS
// ════════════════════════════════

async function dbGetServices() {
  const { data, error } = await db
    .from('services')
    .select('*')
    .order('created_at');
  if (error) { console.error(error); return []; }
  cache.services = data;
  return data;
}

async function dbSaveService({ id, name, price, duration, description }) {
  if (id) {
    const { error } = await db
      .from('services')
      .update({ name, price, duration, description })
      .eq('id', id);
    if (error) throw error;
  } else {
    const { error } = await db
      .from('services')
      .insert({ name, price, duration, description });
    if (error) throw error;
  }
}

async function dbDeleteService(id) {
  const { error } = await db.from('services').delete().eq('id', id);
  if (error) throw error;
}


// ════════════════════════════════
// CLIENTES
// ════════════════════════════════

async function dbGetClients() {
  const { data, error } = await db
    .from('clients')
    .select('*')
    .order('name');
  if (error) { console.error(error); return []; }
  cache.clients = data;
  return data;
}

async function dbSaveClient({ id, name, phone, email, birthday, fav_service_id, allergies, notes }) {
  const payload = { name, phone, email, birthday: birthday || null, fav_service_id: fav_service_id || null, allergies, notes };
  if (id) {
    const { error } = await db.from('clients').update(payload).eq('id', id);
    if (error) throw error;
  } else {
    const { error } = await db.from('clients').insert(payload);
    if (error) throw error;
  }
}

async function dbDeleteClient(id) {
  const { error } = await db.from('clients').delete().eq('id', id);
  if (error) throw error;
}


// ════════════════════════════════
// CITAS
// ════════════════════════════════

async function dbGetAppointments() {
  const { data, error } = await db
    .from('appointments')
    .select('*')
    .order('date', { ascending: false })
    .order('time', { ascending: true });
  if (error) { console.error(error); return []; }
  cache.appointments = data;
  return data;
}

async function dbSaveAppointment({ id, client_id, client_name, phone, service_id, service_name, date, time, status, price, notes }) {
  const payload = {
    client_id:    client_id    || null,
    client_name,
    phone,
    service_id:   service_id  || null,
    service_name,
    date,
    time:         time         || null,
    status,
    price,
    notes,
  };
  if (id) {
    const { error } = await db.from('appointments').update(payload).eq('id', id);
    if (error) throw error;
  } else {
    const { error } = await db.from('appointments').insert(payload);
    if (error) throw error;
  }
}

async function dbDeleteAppointment(id) {
  const { error } = await db.from('appointments').delete().eq('id', id);
  if (error) throw error;
}


// ════════════════════════════════
// FINANZAS
// ════════════════════════════════

async function dbGetFinances() {
  const { data, error } = await db
    .from('finances')
    .select('*')
    .order('date', { ascending: false });
  if (error) { console.error(error); return []; }
  cache.finances = data;
  return data;
}

async function dbSaveFinance({ id, type, description, amount, category, date, notes }) {
  const payload = { type, description, amount, category, date, notes };
  if (id) {
    const { error } = await db.from('finances').update(payload).eq('id', id);
    if (error) throw error;
  } else {
    const { error } = await db.from('finances').insert(payload);
    if (error) throw error;
  }
}

async function dbDeleteFinance(id) {
  const { error } = await db.from('finances').delete().eq('id', id);
  if (error) throw error;
}
