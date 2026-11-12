const API_ORIGIN = 'https://cupones-restaurante-demo.jf3t4.chatgpt.site';
const requestId = new URLSearchParams(window.location.search).get('id');
const title = document.querySelector('#status-title');
const copy = document.querySelector('#status-copy');
let interval;

async function updateStatus() {
  if (!requestId) throw new Error('No encontramos el número de tu solicitud.');
  const response = await fetch(`${API_ORIGIN}/api/requests/${encodeURIComponent(requestId)}`);
  const request = await response.json();
  if (!response.ok) throw new Error(request.error);
  document.querySelector('#status-name').textContent = request.name;
  document.querySelector('#status-table').textContent = `MESA ${request.table_number}`;
  if (request.status === 'approved') {
    document.querySelector('#status-symbol').textContent = '✓';
    title.textContent = request.total_visits % 5 === 0 ? '¡Tu almuerzo está listo!' : 'Visita confirmada.';
    copy.textContent = request.total_visits % 5 === 0 ? 'Alcanzaste cinco visitas. El equipo puede canjear tu almuerzo gratis desde el panel.' : `Ya llevas ${request.total_visits % 5} de 5 visitas para tu próximo almuerzo.`;
    clearInterval(interval);
  } else if (request.status === 'rejected') {
    document.querySelector('#status-symbol').textContent = '↺'; title.textContent = 'Esta visita no se pudo validar.';
    copy.textContent = 'El equipo rechazó la solicitud. Puedes pedir ayuda en el local y volver a enviar otra solicitud.';
    clearInterval(interval);
  }
}

updateStatus().catch(error => { title.textContent = 'No pudimos cargar la solicitud.'; copy.textContent = error.message; });
interval = setInterval(() => updateStatus().catch(() => {}), 2500);
