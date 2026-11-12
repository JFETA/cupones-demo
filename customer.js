const API_ORIGIN = 'https://cupones-restaurante-demo.jf3t4.chatgpt.site';
const form = document.querySelector('#visit-form');
const message = document.querySelector('#form-message');
const tableInput = document.querySelector('#table-number');
const customerSelect = document.querySelector('#customer-id');

const params = new URLSearchParams(window.location.search);
const tableFromQr = Number(params.get('mesa'));
tableInput.value = Number.isInteger(tableFromQr) && tableFromQr > 0 ? tableFromQr : 1;

async function loadCustomers() {
  const response = await fetch(API_ORIGIN + '/api/customers');
  const customers = await response.json();
  for (const customer of customers) {
    const option = document.createElement('option');
    option.value = customer.id;
    option.textContent = `${customer.name} · ${customer.phone}`;
    customerSelect.append(option);
  }
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  const button = form.querySelector('button');
  button.disabled = true;
  message.textContent = 'Enviando tu solicitud al equipo…';
  try {
    const response = await fetch(API_ORIGIN + '/api/requests', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableNumber: Number(tableInput.value), customerId: customerSelect.value, optedIn: document.querySelector('#opted-in').checked }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    window.location.href = `./solicitud.html?id=${encodeURIComponent(result.id)}`;
  } catch (error) {
    message.textContent = error.message || 'No pudimos enviar la solicitud. Intenta otra vez.';
    button.disabled = false;
  }
});

loadCustomers().catch(() => { message.textContent = 'No pudimos cargar los teléfonos de prueba. Recarga la página.'; });
