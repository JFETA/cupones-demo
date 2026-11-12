const API_ORIGIN = 'https://cupones-restaurante-demo.jf3t4.chatgpt.site';
const form = document.querySelector('#visit-form');
const message = document.querySelector('#form-message');
const tableInput = document.querySelector('#table-number');
const button = form.querySelector('button');
const tableFromQr = Number(new URLSearchParams(window.location.search).get('mesa'));
const validTable = Number.isInteger(tableFromQr) && tableFromQr >= 1 && tableFromQr <= 50;

if (validTable) tableInput.value = tableFromQr;
else {
  button.disabled = true;
  message.textContent = 'Escanea el código QR de tu mesa para registrar tu visita.';
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  button.disabled = true;
  message.textContent = 'Enviando tu solicitud al equipo…';
  try {
    const response = await fetch(API_ORIGIN + '/api/requests', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableNumber: tableFromQr, rut: document.querySelector('#customer-rut').value, phone: document.querySelector('#customer-phone').value, optedIn: document.querySelector('#opted-in').checked }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    window.location.href = `./solicitud.html?id=${encodeURIComponent(result.id)}`;
  } catch (error) {
    message.textContent = error.message || 'No pudimos enviar la solicitud. Intenta otra vez.';
    button.disabled = false;
  }
});
