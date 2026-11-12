const API_ORIGIN = 'https://cupones-restaurante-demo.jf3t4.chatgpt.site';
const loginPanel = document.querySelector('#login-panel');
const dashboard = document.querySelector('#dashboard');
const dashboardMessage = document.querySelector('#dashboard-message');
let refreshHandle;

async function api(url, options = {}) {
  const token = sessionStorage.getItem('demoSession');
  const response = await fetch(API_ORIGIN + url, { ...options, headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) } });
  const result = await response.json();
  if (response.ok && url === '/api/login') sessionStorage.setItem('demoSession', result.token);
  if (response.ok && url === '/api/logout') sessionStorage.removeItem('demoSession');
  if (!response.ok) throw new Error(result.error || 'No pudimos completar la acción.');
  return result;
}

function textElement(tag, className, text) {
  const element = document.createElement(tag);
  element.className = className;
  element.textContent = text;
  return element;
}

function formatDate(value) {
  return new Intl.DateTimeFormat('es-CL', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }).format(new Date(value));
}

function renderDashboard(data) {
  const pending = data.requests.filter(request => request.status === 'pending');
  const rewards = data.customers.reduce((sum, customer) => sum + customer.availableRewards, 0);
  const visitTotal = data.customers.reduce((sum, customer) => sum + customer.visitCount, 0);
  const optedIn = data.customers.filter(customer => customer.opted_in).length;
  const stats = document.querySelector('#stats');
  stats.replaceChildren();
  for (const [value, label] of [[pending.length, 'Solicitudes pendientes'], [rewards, 'Almuerzos disponibles'], [visitTotal, 'Visitas en curso'], [optedIn, 'Clientes con avisos']]) {
    const card = document.createElement('article'); card.className = 'stat-card';
    card.append(textElement('strong', 'stat-number', String(value)), textElement('span', 'stat-label', label)); stats.append(card);
  }

  const requestsList = document.querySelector('#requests-list');
  requestsList.replaceChildren();
  document.querySelector('#pending-count').textContent = `${pending.length} pendiente${pending.length === 1 ? '' : 's'}`;
  if (!data.requests.length) requestsList.append(textElement('p', 'empty-state', 'Las solicitudes que envíen tus clientes aparecerán aquí.'));
  for (const request of data.requests) {
    const card = document.createElement('article'); card.className = `request-card request-${request.status}`;
    const top = document.createElement('div'); top.className = 'request-top';
    top.append(textElement('strong', 'request-name', request.name), textElement('span', `status-pill status-${request.status}`, request.status === 'pending' ? 'PENDIENTE' : request.status === 'approved' ? 'APROBADA' : 'RECHAZADA'));
    card.append(top, textElement('p', 'request-meta', `Mesa ${request.table_number} · ${request.phone} · ${formatDate(request.created_at)}`));
    if (request.status === 'pending') {
      const form = document.createElement('form'); form.className = 'resolve-form';
      const receipt = document.createElement('input'); receipt.name = 'receiptNumber'; receipt.placeholder = 'Folio de boleta'; receipt.minLength = 3; receipt.maxLength = 40; receipt.pattern = '[A-Za-z0-9][A-Za-z0-9-]{2,39}'; receipt.required = true; receipt.setAttribute('aria-label', `Folio de boleta de ${request.name}`);
      const approve = document.createElement('button'); approve.type = 'submit'; approve.className = 'button button-green'; approve.textContent = 'Aprobar visita';
      const reject = document.createElement('button'); reject.type = 'button'; reject.className = 'button button-text'; reject.textContent = 'Rechazar';
      form.append(receipt, approve, reject); card.append(form);
      form.addEventListener('submit', async event => {
        event.preventDefault(); approve.disabled = true;
        try { await api(`/api/requests/${request.id}/resolve`, { method: 'POST', body: JSON.stringify({ decision: 'approve', receiptNumber: receipt.value }) }); await refresh(); }
        catch (error) { dashboardMessage.textContent = error.message; approve.disabled = false; }
      });
      reject.addEventListener('click', async () => {
        reject.disabled = true;
        try { await api(`/api/requests/${request.id}/resolve`, { method: 'POST', body: JSON.stringify({ decision: 'reject' }) }); await refresh(); }
        catch (error) { dashboardMessage.textContent = error.message; reject.disabled = false; }
      });
    } else if (request.receipt_number) card.append(textElement('p', 'request-meta', `Boleta ${request.receipt_number}`));
    requestsList.append(card);
  }

  const rewardsList = document.querySelector('#rewards-list'); rewardsList.replaceChildren();
  const eligible = data.customers.filter(customer => customer.availableRewards > 0);
  if (!eligible.length) rewardsList.append(textElement('p', 'empty-state', 'Aún no hay almuerzos disponibles para canjear.'));
  for (const customer of eligible) {
    const row = document.createElement('article'); row.className = 'reward-row';
    const detail = document.createElement('div'); detail.append(textElement('strong', '', customer.name), textElement('span', 'request-meta', `${customer.phone} · ${customer.availableRewards} almuerzo${customer.availableRewards === 1 ? '' : 's'}`));
    const redeem = document.createElement('button'); redeem.type = 'button'; redeem.className = 'button button-dark'; redeem.textContent = 'Entregar premio';
    redeem.addEventListener('click', async () => {
      redeem.disabled = true;
      try { await api('/api/redeem', { method: 'POST', body: JSON.stringify({ customerId: customer.id }) }); dashboardMessage.textContent = `Almuerzo entregado a ${customer.name}.`; await refresh(); }
      catch (error) { dashboardMessage.textContent = error.message; redeem.disabled = false; }
    });
    row.append(detail, redeem); rewardsList.append(row);
  }

  const notifications = document.querySelector('#notifications-list'); notifications.replaceChildren();
  if (!data.notifications.length) notifications.append(textElement('p', 'empty-state', 'Los avisos de prueba aparecerán aquí cuando el cliente haya aceptado recibirlos.'));
  for (const item of data.notifications) {
    const row = document.createElement('article'); row.className = 'notification-row';
    const icon = textElement('span', 'notification-icon', item.event_type === 'one_visit_left' ? '4/5' : '★');
    const detail = document.createElement('div'); detail.append(textElement('strong', '', item.name), textElement('p', 'notification-copy', item.message), textElement('span', 'request-meta', `${item.phone} · ${formatDate(item.created_at)}`));
    row.append(icon, detail); notifications.append(row);
  }
}

async function refresh() {
  const data = await api('/api/dashboard');
  renderDashboard(data);
}

function renderQrGrid() {
  const grid = document.querySelector('#qr-grid');
  for (let table = 1; table <= 12; table += 1) {
    const card = document.createElement('article'); card.className = 'qr-card';
    const img = document.createElement('img'); img.src = `./qr/mesa-${table}.svg`; img.alt = `Código QR de la mesa ${table}`;
    card.append(img, textElement('strong', 'qr-label', `MESA ${String(table).padStart(2, '0')}`)); grid.append(card);
  }
}

async function showDashboard() {
  loginPanel.hidden = true; dashboard.hidden = false;
  renderQrGrid(); await refresh();
  clearInterval(refreshHandle);
  refreshHandle = setInterval(() => {
    const active = document.activeElement;
    if (active && (active.matches('input') || active.matches('button') || active.matches('select'))) return;
    refresh().catch(() => { dashboardMessage.textContent = 'No se pudo actualizar. Revisa la conexión.'; });
  }, 5000);
}

document.querySelector('#login-form').addEventListener('submit', async event => {
  event.preventDefault();
  const button = event.currentTarget.querySelector('button'); button.disabled = true;
  const message = document.querySelector('#login-message'); message.textContent = 'Validando…';
  try { await api('/api/login', { method: 'POST', body: JSON.stringify({ key: document.querySelector('#admin-key').value }) }); await showDashboard(); }
  catch (error) { message.textContent = error.message; }
  finally { button.disabled = false; }
});

document.querySelector('#logout').addEventListener('click', async () => {
  await api('/api/logout', { method: 'POST' }); clearInterval(refreshHandle); dashboard.hidden = true; loginPanel.hidden = false;
});
document.querySelector('#print-qrs').addEventListener('click', () => window.print());

api('/api/auth').then(showDashboard).catch(() => {});
