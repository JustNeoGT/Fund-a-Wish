const wishes = [];
const donors = {};
let currentUser = localStorage.getItem("username") || null;

function login() {
  const user = document.getElementById("username").value;
  const pass = document.getElementById("password").value;

  if (!user || !pass) return alert("Bitte Benutzername und Passwort eingeben!");
  
  currentUser = user;
  localStorage.setItem("username", user);
  
  document.getElementById("loginStatus").innerText = `Eingeloggt als: ${user}`;
  document.getElementById("wish-form").style.display = "block";
  document.getElementById("logoutBtn").style.display = "inline-block";
}

function logout() {
  localStorage.removeItem("username");
  currentUser = null;
  
  document.getElementById("loginStatus").innerText = "";
  document.getElementById("wish-form").style.display = "none";
  document.getElementById("logoutBtn").style.display = "none";
}

function addWish() {
  if (!currentUser) return alert("Bitte zuerst einloggen!");
  
  const title = document.getElementById('wishTitle').value;
  const amount = parseFloat(document.getElementById('wishAmount').value);
  const desc = document.getElementById('wishDesc').value;
  
  if (!title || !amount || !desc) return alert("Alle Felder sind erforderlich!");
  
  wishes.push({ id: Date.now(), title, amount, desc, collected: 0, owner: currentUser });
  renderWishes();
}

function donate(id) {
  if (!currentUser) return alert("Bitte zuerst einloggen!");
  
  const wish = wishes.find(w => w.id === id);
  const amount = parseFloat(prompt("Spendenbetrag in €:"));
  
  if (isNaN(amount) || amount <= 0) return;
  
  wish.collected += amount;
  donors[currentUser] = (donors[currentUser] || 0) + amount;
  
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
        <p>Erstellt von: ${w.owner}</p>
        <div class="progress"><div class="progress-bar" style="width: ${progressPercent}%"></div></div>
        <p>${w.collected.toFixed(2)} € von ${w.amount.toFixed(2)} € gesammelt</p>
        <button onclick="donate(${w.id})">Spenden</button>
      </div>`;
  });
}

function renderLeaderboard() {
  const list = Object.entries(donors).sort((a,b) => b[1] - a[1]).slice(0, 10);
  document.getElementById('leaders').innerHTML = '';
  list.forEach(([name, amt]) => {
    document.getElementById('leaders').innerHTML += `<li>${name}: ${amt.toFixed(2)} €</li>`;
  });
}

window.onload = () => {
  if (currentUser) {
    document.getElementById("loginStatus").innerText = `Eingeloggt als: ${currentUser}`;
    document.getElementById("wish-form").style.display = "block";
    document.getElementById("logoutBtn").style.display = "inline-block";
  }
};
