/* ══════════════════════════════════════
   auth.js — Autenticación de la app
   Usa tabla 'users' en Supabase con
   contraseñas hasheadas con bcrypt.
   ══════════════════════════════════════ */

const SESSION_KEY = 'hoshi_session';

// Referencia compatible a bcryptjs cargado por CDN
function _bc() {
  return window.dcodeIO?.bcrypt || window.bcrypt;
}

function isAuthenticated() {
  return !!sessionStorage.getItem(SESSION_KEY);
}

function checkAuth() {
  if (!isAuthenticated()) {
    _showLogin();
  } else {
    _hideLogin();
  }
}

function _showLogin() {
  const overlay = document.getElementById('loginOverlay');
  const main    = document.getElementById('mainApp');
  const nav     = document.querySelector('nav');
  if (overlay) overlay.style.display = 'flex';
  if (main)    main.style.display    = 'none';
  if (nav)     nav.style.display     = 'none';
}

function _hideLogin() {
  const overlay = document.getElementById('loginOverlay');
  const main    = document.getElementById('mainApp');
  const nav     = document.querySelector('nav');
  if (overlay) overlay.style.display = 'none';
  if (main)    main.style.display    = '';
  if (nav)     nav.style.display     = '';
}

async function login() {
  const usernameEl = document.getElementById('loginUser');
  const passwordEl = document.getElementById('loginPass');
  const username   = (usernameEl?.value || '').trim().toLowerCase();
  const password   = passwordEl?.value || '';

  if (!username || !password) {
    _setLoginError('Completa usuario y contraseña');
    return;
  }

  const btn = document.getElementById('loginBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Verificando...'; }
  _setLoginError('');

  try {
    const { data, error } = await db
      .from('users')
      .select('id, username, password')
      .eq('username', username)
      .maybeSingle();

    if (error || !data) {
      _setLoginError('Usuario o contraseña incorrectos');
      return;
    }

    // Comparar contraseña con el hash almacenado
    const bc    = _bc();
    const match = await new Promise((res, rej) =>
      bc.compare(password, data.password, (err, r) => err ? rej(err) : res(r))
    );

    if (!match) {
      _setLoginError('Usuario o contraseña incorrectos');
      return;
    }

    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id: data.id, username: data.username }));
    _hideLogin();

    // Cargar todos los datos de la app
    setLoading(true);
    await Promise.all([dbGetServices(), dbGetClients(), dbGetAppointments(), dbGetFinances()]);
    await renderDashboard();
    setLoading(false);

  } catch(e) {
    console.error('Login error:', e);
    _setLoginError('Error de conexión. Intenta nuevamente.');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Ingresar'; }
  }
}

function logout() {
  if (!confirm('¿Cerrar sesión?')) return;
  sessionStorage.removeItem(SESSION_KEY);
  _showLogin();
  const u = document.getElementById('loginUser');
  const p = document.getElementById('loginPass');
  if (u) u.value = '';
  if (p) p.value = '';
  _setLoginError('');
}

function _setLoginError(msg) {
  const el = document.getElementById('loginError');
  if (!el) return;
  el.textContent   = msg;
  el.style.display = msg ? 'block' : 'none';
}

// ── Utilidad de consola para generar hashes ──
// Para crear la contraseña de un usuario, abre la consola del navegador y ejecuta:
//   generarHash('mi_contraseña').then(h => console.log(h))
// Luego guarda ese hash en Supabase: INSERT INTO users (username, password) VALUES ('viviana', '<hash>');
async function generarHash(pwd) {
  const bc = _bc();
  return new Promise((res, rej) => bc.hash(pwd, 10, (err, h) => err ? rej(err) : res(h)));
}

// Soporte tecla Enter en formulario de login
document.addEventListener('DOMContentLoaded', () => {
  ['loginPass', 'loginUser'].forEach(id => {
    document.getElementById(id)?.addEventListener('keydown', e => {
      if (e.key === 'Enter') login();
    });
  });
});
