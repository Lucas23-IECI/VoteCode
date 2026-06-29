const games = [
  {
    id: "rv-there-yet",
    name: "RV THERE YET",
    price: 3290,
    accent: "#19736f",
    image: "./assets/rv-there-yet.jpg",
  },
  {
    id: "sons-of-the-forest",
    name: "SONS OF THE FOREST",
    price: 4650,
    accent: "#263238",
    image: "./assets/sons-of-the-forest.jpg",
  },
  {
    id: "risk-of-rain-2",
    name: "RISK OF RAIN 2",
    price: 3960,
    accent: "#bd4f2f",
    image: "./assets/risk-of-rain-2.jpg",
  },
  {
    id: "plague-inc",
    name: "PLAGUE INC",
    price: 830,
    accent: "#566b2f",
    image: "./assets/plague-inc.jpg",
  },
  {
    id: "super-battle-golf",
    name: "SUPER BATTLE GOLF",
    price: 2800,
    accent: "#2f6fca",
    image: "./assets/super-battle-golf.jpg",
  },
  {
    id: "gamble-with-your-friends",
    name: "GAMBLE WITH YOUR FRIENDS",
    price: 2914,
    accent: "#8f3f97",
    image: "./assets/gamble-with-your-friends.jpg",
  },
  {
    id: "golf-with-your-friends",
    name: "GOLF WITH YOUR FRIENDS",
    price: 1190,
    accent: "#1f8a63",
    image: "./assets/golf-with-your-friends.jpg",
  },
  {
    id: "escape-the-backrooms",
    name: "ESCAPE THE BACKROOMS",
    price: 3384,
    accent: "#c99b38",
    image: "./assets/escape-the-backrooms.jpg",
  },
  {
    id: "gang-beasts",
    name: "GANG BEASTS",
    price: 4200,
    accent: "#d95d39",
    image: "./assets/gang-beast.jpg",
  },
  {
    id: "deathsprint-66",
    name: "DEATHSPRINT 66",
    price: 1925,
    accent: "#4657a8",
    image: "./assets/deathsprint-66.jpg",
  },
];

const minVotes = 3;
const maxVotes = games.length;
const pesoFormatter = new Intl.NumberFormat("es-CL");
const config = window.VOTECODE_CONFIG || {};

const els = {
  gamesList: document.querySelector("#games-list"),
  podium: document.querySelector("#podium"),
  rankingList: document.querySelector("#ranking-list"),
  voteHistory: document.querySelector("#vote-history"),
  totalVotes: document.querySelector("#total-votes"),
  totalVotesLabel: document.querySelector("#total-votes-label"),
  statusMessage: document.querySelector("#status-message"),
  authPanel: document.querySelector("#auth-panel"),
  saveVotes: document.querySelector("#save-votes"),
  clearSelection: document.querySelector("#clear-selection"),
  selectionCounter: document.querySelector("#selection-counter"),
};

let supabaseClient = null;
let state = {
  configured: false,
  user: null,
  games,
  results: [],
  myVotes: new Set(),
  totalBallots: 0,
  totalSelections: 0,
  recentBallots: [],
};

function isConfigured() {
  return (
    Boolean(config.supabaseUrl) &&
    Boolean(config.supabaseAnonKey) &&
    config.supabaseAnonKey !== "PEGA_AQUI_TU_SUPABASE_ANON_KEY"
  );
}

function formatPrice(value) {
  return `$${pesoFormatter.format(value)}`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };

    return entities[char];
  });
}

function getUserDisplay(user) {
  const meta = user?.user_metadata || {};

  return {
    id: user.id,
    name: meta.full_name || meta.name || user.email || "Jugador",
    email: user.email || "",
    avatarUrl: meta.avatar_url || "",
  };
}

async function initialize() {
  state.configured = isConfigured();

  if (!state.configured) {
    state.results = buildResults([]);
    render();
    els.statusMessage.textContent = "Falta configurar la anon key de Supabase en frontend/config.js.";
    return;
  }

  supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);

  state.results = buildResults([]);
  render();

  supabaseClient.auth.onAuthStateChange(async () => {
    await loadStateSafely();
  });

  await loadStateSafely();
}

async function loadStateSafely() {
  try {
    await loadState();
  } catch (error) {
    console.error("Error loading VoteCode state:", error);
    state.results = state.results.length ? state.results : buildResults([]);
    render();
    els.statusMessage.textContent = "No se pudo cargar Supabase. Revisa SQL/RLS o recarga la pagina.";
  }
}

async function loadState() {
  const { data: sessionData, error: sessionError } = await supabaseClient.auth.getSession();
  if (sessionError) throw sessionError;

  const user = sessionData.session?.user || null;
  state.user = user ? getUserDisplay(user) : null;

  if (user) {
    await upsertProfile(user);
  }

  const [votes, myVotes] = await Promise.all([fetchVotes(), user ? fetchMyVotes(user.id) : []]);
  state.results = buildResults(votes);
  state.myVotes = new Set(myVotes);
  state.recentBallots = buildRecentBallots(votes);

  render();
}

async function upsertProfile(user) {
  const profile = getUserDisplay(user);
  const { error } = await supabaseClient.from("profiles").upsert({
    user_id: user.id,
    display_name: profile.name,
    email: profile.email,
    avatar_url: profile.avatarUrl,
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
}

async function fetchVotes() {
  return fetchPublicRows(
    "votes?select=user_id,game_id,created_at,profiles(display_name,avatar_url)&order=created_at.desc"
  );
}

async function fetchMyVotes(userId) {
  const data = await fetchPublicRows(`votes?select=game_id&user_id=eq.${encodeURIComponent(userId)}&order=game_id.asc`);
  return (data || []).map((vote) => vote.game_id);
}

async function fetchPublicRows(path) {
  const baseUrl = config.supabaseUrl.replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/rest/v1/${path}`, {
    headers: {
      apikey: config.supabaseAnonKey,
      Authorization: `Bearer ${config.supabaseAnonKey}`,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Supabase respondio ${response.status}`);
  }

  return response.json();
}

function buildResults(votes) {
  const counts = new Map();
  const userIds = new Set();

  for (const vote of votes) {
    userIds.add(vote.user_id);
    counts.set(vote.game_id, (counts.get(vote.game_id) || 0) + 1);
  }

  state.totalBallots = userIds.size;
  state.totalSelections = votes.length;

  return games
    .map((game, index) => {
      const voteCount = counts.get(game.id) || 0;
      const percentage = state.totalBallots ? Math.round((voteCount / state.totalBallots) * 100) : 0;

      return {
        ...game,
        index,
        votes: voteCount,
        percentage,
      };
    })
    .sort((a, b) => b.votes - a.votes || a.index - b.index);
}

function buildRecentBallots(votes) {
  const grouped = new Map();

  for (const vote of votes) {
    const profile = vote.profiles || {};
    const current = grouped.get(vote.user_id) || {
      userId: vote.user_id,
      displayName: profile.display_name || "Jugador",
      avatarUrl: profile.avatar_url || "",
      votedAt: vote.created_at,
      picks: 0,
    };

    current.picks += 1;
    if (vote.created_at > current.votedAt) current.votedAt = vote.created_at;
    grouped.set(vote.user_id, current);
  }

  return [...grouped.values()]
    .sort((a, b) => b.votedAt.localeCompare(a.votedAt))
    .slice(0, 8);
}

function sortedResults() {
  return [...state.results].sort((a, b) => b.votes - a.votes || a.index - b.index);
}

function selectionIsValid() {
  const count = state.myVotes.size;
  return state.user && count >= minVotes && count <= maxVotes;
}

function renderAuth() {
  if (!state.configured) {
    els.authPanel.innerHTML = `
      <div>
        <strong>Configura Supabase</strong>
        <span>Pega la anon key en frontend/config.js.</span>
      </div>
    `;
    return;
  }

  if (state.user) {
    const avatar = state.user.avatarUrl
      ? `<img class="avatar" src="${state.user.avatarUrl}" alt="" />`
      : `<span class="avatar avatar-fallback">${escapeHtml(state.user.name.slice(0, 1).toUpperCase())}</span>`;

    els.authPanel.innerHTML = `
      <div class="account-card">
        ${avatar}
        <div>
          <strong>${escapeHtml(state.user.name)}</strong>
          <span>${escapeHtml(state.user.email || "Sesion iniciada")}</span>
        </div>
      </div>
      <button id="logout-button" class="ghost-button" type="button">Salir</button>
    `;

    document.querySelector("#logout-button").addEventListener("click", logout);
    return;
  }

  els.authPanel.innerHTML = `
    <div>
      <strong>Inicia sesion para guardar tu voto</strong>
      <span>Cada cuenta puede editar su papeleta.</span>
    </div>
    <div class="auth-actions">
      <button id="google-login-button" class="login-button" type="button">Entrar con Google</button>
    </div>
  `;

  document.querySelector("#google-login-button").addEventListener("click", loginWithGoogle);
}

function renderGames() {
  const resultById = Object.fromEntries(state.results.map((result) => [result.id, result]));

  els.gamesList.innerHTML = games
    .map((game) => {
      const result = resultById[game.id] || { votes: 0, percentage: 0 };
      const voteLabel = result.votes === 1 ? "1 voto" : `${result.votes} votos`;
      const selected = state.myVotes.has(game.id);

      return `
        <article class="game-card ${selected ? "selected" : ""}">
          <button class="game-toggle" type="button" data-game-id="${game.id}" aria-pressed="${selected}">
            <div class="game-art" style="--accent: ${game.accent}">
              <img src="${game.image}" alt="Imagen de ${game.name}" loading="lazy" />
              <span class="checkmark">OK</span>
              <span class="game-price-badge">${formatPrice(game.price)}</span>
            </div>
            <div class="game-body">
              <h3 class="game-title">${game.name}</h3>
              <div class="game-meta">
                <span>${voteLabel}</span>
                <span>${result.percentage}%</span>
              </div>
            </div>
          </button>
        </article>
      `;
    })
    .join("");

  els.gamesList.querySelectorAll("[data-game-id]").forEach((button) => {
    button.addEventListener("click", () => toggleGame(button.dataset.gameId));
  });
}

function renderPodium() {
  const podium = sortedResults().slice(0, 3);
  const classes = ["first", "second", "third"];

  if (!state.totalBallots) {
    els.podium.innerHTML = '<p class="empty-state">El podio aparecera cuando entren las primeras papeletas.</p>';
    return;
  }

  els.podium.innerHTML = podium
    .map((game, index) => {
      const voteLabel = game.votes === 1 ? "1 voto" : `${game.votes} votos`;

      return `
        <article class="podium-card ${classes[index]}" style="--accent: ${game.accent}">
          <img src="${game.image}" alt="Imagen de ${game.name}" />
          <span class="place">#${index + 1}</span>
          <div>
            <p class="podium-name">${game.name}</p>
            <div class="podium-meta">
              <span>${voteLabel}</span>
              <span>${game.percentage}%</span>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderRanking() {
  els.rankingList.innerHTML = sortedResults()
    .map((game, index) => {
      const voteLabel = game.votes === 1 ? "1 voto" : `${game.votes} votos`;

      return `
        <div class="ranking-item">
          <div class="ranking-head">
            <span class="ranking-title">#${index + 1} ${game.name}</span>
            <span class="ranking-score">${voteLabel}</span>
          </div>
          <div class="ranking-subline">
            <span>${formatPrice(game.price)}</span>
            <strong>${game.percentage}%</strong>
          </div>
          <div class="bar-track" aria-hidden="true">
            <div class="bar-fill" style="--width: ${game.percentage}%"></div>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderHistory() {
  if (!state.recentBallots.length) {
    els.voteHistory.innerHTML = '<li class="empty-state">Sin papeletas todavia.</li>';
    return;
  }

  els.voteHistory.innerHTML = state.recentBallots
    .map((ballot) => {
      const picks = ballot.picks === 1 ? "1 juego" : `${ballot.picks} juegos`;
      return `<li><strong>${escapeHtml(ballot.displayName)}</strong>: ${picks}</li>`;
    })
    .join("");
}

function renderControls() {
  const selectedCount = state.myVotes.size;
  const remaining = Math.max(minVotes - selectedCount, 0);

  els.totalVotes.textContent = state.totalBallots;
  els.totalVotesLabel.textContent = state.totalBallots === 1 ? "papeleta" : "papeletas";
  els.selectionCounter.textContent = `${selectedCount}/${maxVotes}`;
  els.saveVotes.disabled = !selectionIsValid();
  els.clearSelection.disabled = !state.user || selectedCount === 0;

  if (!state.configured) {
    els.statusMessage.textContent = "Falta configurar Supabase.";
  } else if (!state.user) {
    els.statusMessage.textContent = "Entra con Google para votar.";
  } else if (remaining) {
    els.statusMessage.textContent = `Te faltan ${remaining} seleccion(es) para guardar.`;
  } else {
    els.statusMessage.textContent = "Listo para guardar tu papeleta.";
  }
}

function render() {
  renderAuth();
  renderGames();
  renderPodium();
  renderRanking();
  renderHistory();
  renderControls();
}

function toggleGame(gameId) {
  if (!state.user) {
    els.statusMessage.textContent = "Primero inicia sesion con Google.";
    return;
  }

  if (state.myVotes.has(gameId)) {
    state.myVotes.delete(gameId);
  } else {
    state.myVotes.add(gameId);
  }

  renderGames();
  renderControls();
}

async function saveVotes() {
  if (!selectionIsValid()) return;

  els.saveVotes.disabled = true;
  els.statusMessage.textContent = "Guardando...";

  try {
    const rows = [...state.myVotes].map((gameId) => ({
      user_id: state.user.id,
      game_id: gameId,
      created_at: new Date().toISOString(),
    }));

    const { error: deleteError } = await supabaseClient
      .from("votes")
      .delete()
      .eq("user_id", state.user.id);

    if (deleteError) throw deleteError;

    const { error: insertError } = await supabaseClient.from("votes").insert(rows);
    if (insertError) throw insertError;

    els.statusMessage.textContent = "Papeleta guardada.";
    await loadState();
  } catch (error) {
    els.statusMessage.textContent = error.message;
    renderControls();
  }
}

async function loginWithGoogle() {
  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin + window.location.pathname,
    },
  });

  if (error) {
    els.statusMessage.textContent = error.message;
  }
}

async function logout() {
  await supabaseClient.auth.signOut();
  state.user = null;
  state.myVotes = new Set();
  await loadState();
}

els.saveVotes.addEventListener("click", saveVotes);
els.clearSelection.addEventListener("click", () => {
  state.myVotes.clear();
  renderGames();
  renderControls();
});

initialize().catch((error) => {
  els.statusMessage.textContent = error.message;
});
