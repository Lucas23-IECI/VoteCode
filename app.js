const pesoFormatter = new Intl.NumberFormat("es-CL");

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

let state = {
  user: null,
  auth: { googleEnabled: false, devLoginEnabled: false },
  rules: { minVotes: 3, maxVotes: 10 },
  games: [],
  results: [],
  myVotes: new Set(),
  totalBallots: 0,
  totalSelections: 0,
  recentBallots: [],
};

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

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "No se pudo completar la accion.");
  }

  return data;
}

async function loadState() {
  const data = await apiRequest("/api/bootstrap");
  applyServerState(data);
  render();
}

function applyServerState(data) {
  state = {
    ...state,
    ...data,
    myVotes: new Set(data.myVotes || []),
  };
}

function sortedResults() {
  return [...state.results].sort((a, b) => b.votes - a.votes || a.index - b.index);
}

function selectionIsValid() {
  const count = state.myVotes.size;
  return state.user && count >= state.rules.minVotes && count <= state.rules.maxVotes;
}

function renderAuth() {
  if (state.user) {
    const avatar = state.user.avatarUrl
      ? `<img class="avatar" src="${state.user.avatarUrl}" alt="" />`
      : `<span class="avatar avatar-fallback">${escapeHtml(state.user.name.slice(0, 1).toUpperCase())}</span>`;

    els.authPanel.innerHTML = `
      <div class="account-card">
        ${avatar}
        <div>
          <strong>${escapeHtml(state.user.name)}</strong>
          <span>${state.user.email ? escapeHtml(state.user.email) : "Sesion local"}</span>
        </div>
      </div>
      <button id="logout-button" class="ghost-button" type="button">Salir</button>
    `;

    document.querySelector("#logout-button").addEventListener("click", logout);
    return;
  }

  const googleButton = state.auth.googleEnabled
    ? '<a class="login-button" href="/auth/google">Entrar con Google</a>'
    : '<span class="login-disabled">Google falta configurar</span>';
  const devButton = state.auth.devLoginEnabled
    ? `
      <form id="dev-login-form" class="dev-login-form">
        <input id="dev-login-name" type="text" placeholder="Nombre local" autocomplete="off" />
        <button class="ghost-link" type="submit">Probar local</button>
      </form>
    `
    : "";

  els.authPanel.innerHTML = `
    <div>
      <strong>Inicia sesion para guardar tu voto</strong>
      <span>Cada cuenta puede editar su papeleta.</span>
    </div>
    <div class="auth-actions">
      ${googleButton}
      ${devButton}
    </div>
  `;

  document.querySelector("#dev-login-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = document.querySelector("#dev-login-name").value.trim() || "Jugador local";
    window.location.href = `/auth/dev?name=${encodeURIComponent(name)}`;
  });
}

function renderGames() {
  const resultById = Object.fromEntries(state.results.map((result) => [result.id, result]));

  els.gamesList.innerHTML = state.games
    .map((game) => {
      const result = resultById[game.id] || { votes: 0, percentage: 0 };
      const voteLabel = result.votes === 1 ? "1 voto" : `${result.votes} votos`;
      const selected = state.myVotes.has(game.id);

      return `
        <article class="game-card ${selected ? "selected" : ""}">
          <button class="game-toggle" type="button" data-game-id="${game.id}" aria-pressed="${selected}">
            <div class="game-art" style="--accent: ${game.accent}">
              <img src="${game.image}" alt="Imagen de ${game.name}" loading="lazy" />
              <span class="checkmark">✓</span>
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
      return `<li><strong>${escapeHtml(ballot.display_name)}</strong>: ${picks}</li>`;
    })
    .join("");
}

function renderControls() {
  const selectedCount = state.myVotes.size;
  const remaining = Math.max(state.rules.minVotes - selectedCount, 0);

  els.totalVotes.textContent = state.totalBallots;
  els.totalVotesLabel.textContent = state.totalBallots === 1 ? "papeleta" : "papeletas";
  els.selectionCounter.textContent = `${selectedCount}/${state.rules.maxVotes}`;
  els.saveVotes.disabled = !selectionIsValid();
  els.clearSelection.disabled = !state.user || selectedCount === 0;

  if (!state.user) {
    els.statusMessage.textContent = "Entra con una cuenta para votar.";
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
    els.statusMessage.textContent = "Primero inicia sesion.";
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
    const data = await apiRequest("/api/votes", {
      method: "POST",
      body: JSON.stringify({ gameIds: [...state.myVotes] }),
    });
    applyServerState({ ...data, user: state.user, auth: state.auth, rules: state.rules, games: state.games });
    els.statusMessage.textContent = "Papeleta guardada.";
    render();
  } catch (error) {
    els.statusMessage.textContent = error.message;
    renderControls();
  }
}

async function logout() {
  await apiRequest("/auth/logout", { method: "POST" });
  window.location.reload();
}

els.saveVotes.addEventListener("click", saveVotes);
els.clearSelection.addEventListener("click", () => {
  state.myVotes.clear();
  renderGames();
  renderControls();
});

loadState().catch((error) => {
  els.statusMessage.textContent = error.message;
});
