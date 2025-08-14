// ======= CONFIG =======
// 1) Fülle deine Supabase Daten hier ein:
const SUPABASE_URL = "https://YOUR-PROJECT-ref.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_PUBLIC_KEY";

// 2) Setze die URL deines Servers (Vercel/Render/Heroku/Local). Muss HTTPS im Live-Betrieb sein.
const SERVER_BASE_URL = "http://localhost:4242";

// Init Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Elements
const authSection = document.getElementById('auth');
const dashboard = document.getElementById('dashboard');
const btnLogin = document.getElementById('btn-login');
const btnLogout = document.getElementById('btn-logout');
const wishForm = document.getElementById('wish-form');
const wishList = document.getElementById('wish-list');
const leaderboard = document.getElementById('leaderboard');

// Auth state listener
supabase.auth.onAuthStateChange(async (evt, session) => {
  const user = session?.user || null;
  btnLogout.classList.toggle('hidden', !user);
  btnLogin.classList.toggle('hidden', !!user);
  authSection.classList.toggle('hidden', !!user);
  dashboard.classList.toggle('hidden', !user);
  if (user) {
    await ensureProfile(user);
    await loadWishes();
    await loadLeaderboard();
  } else {
    wishList.innerHTML = "";
    leaderboard.innerHTML = "";
  }
});

btnLogin.addEventListener('click', () => {
  authSection.scrollIntoView({behavior:'smooth'});
});

btnLogout.addEventListener('click', async () => {
  await supabase.auth.signOut();
});

// OAuth provider buttons
document.querySelectorAll('.provider-grid button').forEach(btn => {
  btn.addEventListener('click', async () => {
    const provider = btn.dataset.provider;
    const redirectTo = window.location.origin; // adjust if needed
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo }
    });
    if (error) alert(error.message);
  });
});

// Email signup
const emailForm = document.getElementById('email-signup');
emailForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return alert(error.message);
  alert('Checke deine E-Mails zur Bestätigung!');
});

// Ensure profile exists
async function ensureProfile(user){
  await supabase.from('profiles').upsert({
    id: user.id,
    email: user.email,
    display_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email.split('@')[0]
  }, { onConflict: 'id' });
}

// Create wish
wishForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('wish-title').value.trim();
  const desc = document.getElementById('wish-desc').value.trim();
  const goal = parseInt(document.getElementById('wish-goal').value, 10);
  const image_url = document.getElementById('wish-image').value.trim() || null;
  if (!title || !desc || !goal) return alert('Bitte alle Felder ausfüllen.');

  const { data, error } = await supabase.from('wishes').insert({ title, description: desc, goal_amount: goal, image_url });
  if (error) return alert(error.message);

  wishForm.reset();
  await loadWishes();
});

// Load wishes
async function loadWishes(){
  const { data: wishes, error } = await supabase.rpc('wishes_with_progress');
  if (error) { console.error(error); return; }

  wishList.innerHTML = '';
  wishes.forEach(w => {
    const pct = Math.min(100, Math.round((w.raised_cents/100) / w.goal_amount * 100)) || 0;
    const card = document.createElement('div');
    card.className = 'wish';

    const img = document.createElement('img');
    img.src = w.image_url || 'https://picsum.photos/seed/' + w.id + '/600/400';
    card.appendChild(img);

    const pad = document.createElement('div');
    pad.className = 'pad';
    pad.innerHTML = \`
      <h3>\${w.title}</h3>
      <p class="small">\${w.description}</p>
      <div class="progress"><div style="width:\${pct}%"></div></div>
      <div class="small">Ziel: \${w.goal_amount.toFixed(2)} € · Aktuell: \${(w.raised_cents/100).toFixed(2)} €</div>
      <div class="row">
        <input type="number" min="1" placeholder="Betrag €" value="5" id="amt-\${w.id}" />
        <button class="primary" data-wish="\${w.id}">Jetzt beitragen</button>
      </div>
    \`;
    card.appendChild(pad);
    wishList.appendChild(card);
  });

  // attach donate handlers
  document.querySelectorAll('button.primary[data-wish]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const wishId = btn.dataset.wish;
      const amtInput = document.getElementById('amt-' + wishId);
      const amountEur = parseInt(amtInput.value,10);
      if (!amountEur || amountEur < 1) return alert('Mindestens 1 €');

      const { data: session, error } = await createCheckoutSession(wishId, amountEur);
      if (error) return alert(error);

      // Redirect to Stripe Checkout
      window.location.href = session.url;
    });
  });
}

// Load leaderboard
async function loadLeaderboard(){
  const { data, error } = await supabase.from('leaderboard_view').select('*').order('total_cents', { ascending:false }).limit(10);
  if (error) { console.error(error); return; }
  leaderboard.innerHTML = '';
  data.forEach((row,i) => {
    const li = document.createElement('li');
    li.textContent = \`\${i+1}. \${row.display_name || row.email} – € \${(row.total_cents/100).toFixed(2)}\`;
    leaderboard.appendChild(li);
  });
}

// Call server to create Stripe Checkout
async function createCheckoutSession(wishId, amountEur){
  const { data: { session } , error } = await postJson('/create-checkout-session', {
    wish_id: wishId,
    amount_eur: amountEur
  });
  return { data: session, error };
}

async function postJson(path, body){
  const token = (await supabase.auth.getSession()).data.session?.access_token;
  const res = await fetch(SERVER_BASE_URL + path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? 'Bearer ' + token : ''
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) return { error: 'Server-Fehler: ' + res.status };
  return await res.json();
}

// Kick off initial auth check
(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    dashboard.classList.remove('hidden');
    btnLogout.classList.remove('hidden');
    btnLogin.classList.add('hidden');
    authSection.classList.add('hidden');
    await ensureProfile(session.user);
    await loadWishes();
    await loadLeaderboard();
  }
})();
