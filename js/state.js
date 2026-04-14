/* ══════════════════════════════════════
   state.js — Estado de UI y utilidades
   Los datos viven en Supabase.
   Este archivo solo guarda estado
   temporal de la interfaz.
   ══════════════════════════════════════ */

// ── Cache local (se recarga desde Supabase al navegar) ──
const cache = {
  services:     [],
  clients:      [],
  appointments: [],
  finances:     [],
};

// ── Variables de UI ──
let calDate         = new Date();
let selectedDate    = null;
let apptFilter      = 'todas';
let finFilter       = 'todos';
let finSearch       = '';
let finSort         = { col: 'date', asc: false };
let finPage         = 1;
const FIN_PAGE_SIZE = 15;
let clientFilter    = 'todas';
let currentApptId   = null;
let currentClientId = null;

// ── Utilidades ──

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function fmt(n) {
  return '$' + (n || 0).toLocaleString('es-CO');
}

function fmtDate(d) {
  if (!d) return '';
  const [y, m, dd] = d.slice(0, 10).split('-');
  return `${dd}/${m}/${y}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(d1, d2) {
  return Math.round((new Date(d2) - new Date(d1)) / 86400000);
}

function getWeekRange(date) {
  const d   = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d); mon.setDate(diff);
  const sun = new Date(mon); sun.setDate(sun.getDate() + 6);
  return {
    mon: mon.toISOString().slice(0, 10),
    sun: sun.toISOString().slice(0, 10),
  };
}

// ── Capitalización automática ──
// Primera letra de la frase en mayúscula, resto en minúsculas.
function capitalize(str) {
  if (!str) return '';
  const s = str.trim().toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Utilidades de cumpleaños (formato MM-DD o YYYY-MM-DD) ──

function parseBirthday(bd) {
  if (!bd) return null;
  const parts = bd.split('-');
  if (parts.length === 3) return { m: parseInt(parts[1]), d: parseInt(parts[2]) }; // YYYY-MM-DD legacy
  if (parts.length === 2) return { m: parseInt(parts[0]), d: parseInt(parts[1]) }; // MM-DD nuevo
  return null;
}

function fmtBirthday(bd) {
  const p = parseBirthday(bd);
  if (!p) return '—';
  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  return `${p.d} de ${months[p.m - 1] || ''}`;
}

// ── Indicador de carga global ──
function setLoading(visible) {
  document.getElementById('globalLoader').style.display = visible ? 'flex' : 'none';
}
