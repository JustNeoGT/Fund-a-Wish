const wishes = [];
const donors = {};

function addWish() {
  const title = document.getElementById('wishTitle').value;
  const amount = parseFloat(document.getElementById('wishAmount').value);
  const desc = document.getElementById('wishDesc').value;
  if (!title || !amount || !desc) return alert("Alle Felder sind erforderlich!");
  wishes.push({ id: Date.now(), title, amount, desc, collected: 0 });
  renderWishes();
}

function donate(id) {
  const wish = wishes.find(w => w.id === id);
  const donor = prompt("Gib deinen Namen ein:");
  const amount = parseFloat(prompt("Spendenbetrag in €:"));
  if (!donor || isNaN(amount) || amount <= 0) return;
  wish.collected += amount;
  donors[donor] = (donors[donor] || 0) + amount;
  renderWishes();
  renderLeaderboard();
}

function renderWishes() {
  const container = document.getElementById('wishes');
  container.innerHTML = '';
  wishes.forEach(w => {
    const progressPercent = Math.min((w.collected / w.amount) * 100, 100);
    container.innerHTML += `
      <div class="wish">
        <h3>${w.title}</h3>
        <p>${w.desc}</p>
        <div class="progress"><div class="progress-bar" style="width: ${progressPercent}%"></div></div>
        <p>${w.collected.toFixed(2)} € von ${w.amount.toFixed(2)} € gesammelt</p>
        <button onclick="donate(${w.id})">Spenden</button>
      </div>`;
  });
}

function renderLeaderboard() {
  const list = Object.entries(donors).sort((a,b) => b[1] - a[1]).slice(0, 10);
  document.getElementById('leaders').innerHTML = '';
  list.forEach(([name, amt]) => {
    document.getElementById('leaders').innerHTML += `<li>${name}: ${amt.toFixed(2)} €</li>`;
  });
}
