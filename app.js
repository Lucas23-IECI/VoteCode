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
    id: "risk-of-ran-2",
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
    id: "gang-beast",
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

const storageKey = "votacion-juegos:v1";
const pesoFormatter = new Intl.NumberFormat("es-CL");

const els = {
  friendName: document.querySelector("#friend-name"),
  gamesList: document.querySelector("#games-list"),
  podium: document.querySelector("#podium"),
  rankingList: document.querySelector("#ranking-list"),
  voteHistory: document.querySelector("#vote-history"),
  totalVotes: document.querySelector("#total-votes"),
  statusMessage: document.querySelector("#status-message"),
  undoVote: document.querySelector("#undo-vote"),
  resetVotes: document.querySelector("#reset-votes"),
};

let state = normalizeState(loadState());
saveState();

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey));
    if (stored && Array.isArray(stored.votes)) {
      return stored;
    }
  } catch {
    // Start fresh if the browser has invalid saved data.
  }

  return { votes: [] };
}

function normalizeName(value) {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function normalizeState(rawState) {
  const votesByPerson = new Map();

  for (const vote of rawState.votes) {
    const game = getGame(vote.gameId);
    const friend = String(vote.friend || "").trim();
    const voterKey = vote.voterKey || normalizeName(friend);

    if (!game || !friend || !voterKey) continue;

    votesByPerson.set(voterKey, {
      id: vote.id || createVoteId(),
      friend,
      voterKey,
      gameId: game.id,
      createdAt: vote.createdAt || new Date().toISOString(),
    });
  }

  return { votes: [...votesByPerson.values()] };
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function formatPrice(value) {
  return `$${pesoFormatter.format(value)}`;
}

function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 3)
    .map((word) => word[0])
    .join("");
}

function createVoteId() {
  return crypto.randomUUID ? crypto.randomUUID() : String(Date.now());
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => {
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

function getGame(gameId) {
  return games.find((game) => game.id === gameId);
}

function getResults() {
  const counts = Object.fromEntries(games.map((game) => [game.id, 0]));

  for (const vote of state.votes) {
    if (counts[vote.gameId] !== undefined) {
      counts[vote.gameId] += 1;
    }
  }

  return games
    .map((game, index) => ({
      ...game,
      index,
      votes: counts[game.id],
    }))
    .sort((a, b) => b.votes - a.votes || a.index - b.index);
}

function voteFor(gameId) {
  const name = els.friendName.value.trim();
  const voterKey = normalizeName(name);
  const game = getGame(gameId);

  if (!voterKey) {
    els.statusMessage.textContent = "Primero escribe el nombre de quien vota.";
    els.friendName.focus();
    return;
  }

  const previousVoteIndex = state.votes.findIndex((vote) => vote.voterKey === voterKey);
  const previousVote = state.votes[previousVoteIndex];

  if (previousVote?.gameId === gameId) {
    els.statusMessage.textContent = `${name} ya tenia su voto en ${game.name}.`;
    els.friendName.value = "";
    return;
  }

  if (previousVote) {
    const previousGame = getGame(previousVote.gameId);
    state.votes.splice(previousVoteIndex, 1);
    state.votes.push({
      ...previousVote,
      friend: name,
      voterKey,
      gameId,
      createdAt: new Date().toISOString(),
    });
    els.statusMessage.textContent = `${name} cambio su voto: ${previousGame.name} -> ${game.name}.`;
  } else {
    state.votes.push({
      id: createVoteId(),
      friend: name,
      voterKey,
      gameId,
      createdAt: new Date().toISOString(),
    });
    els.statusMessage.textContent = `${name} voto por ${game.name}.`;
  }

  saveState();
  els.friendName.value = "";
  render();
}

function undoLastVote() {
  const lastVote = state.votes.pop();

  if (!lastVote) {
    els.statusMessage.textContent = "Todavia no hay votos para deshacer.";
    return;
  }

  const game = getGame(lastVote.gameId);
  saveState();
  els.statusMessage.textContent = `Se deshizo el voto de ${lastVote.friend} por ${game.name}.`;
  render();
}

function resetVotes() {
  if (!state.votes.length) {
    els.statusMessage.textContent = "La votacion ya esta en cero.";
    return;
  }

  const confirmed = confirm("Esto borrara todos los votos guardados en este navegador. Continuar?");
  if (!confirmed) return;

  state = { votes: [] };
  saveState();
  els.statusMessage.textContent = "Votacion reiniciada.";
  render();
}

function renderGames(results) {
  const resultById = Object.fromEntries(results.map((result) => [result.id, result]));

  els.gamesList.innerHTML = games
    .map((game) => {
      const result = resultById[game.id];
      const voteLabel = result.votes === 1 ? "1 voto" : `${result.votes} votos`;

      return `
        <article class="game-card">
          <div class="game-art" style="--accent: ${game.accent}">
            <img src="${game.image}" alt="Imagen de ${game.name}" loading="lazy" />
            <span class="game-initials">${getInitials(game.name)}</span>
            <span class="game-price-badge">${formatPrice(game.price)}</span>
          </div>
          <div>
            <h3 class="game-title">${game.name}</h3>
            <div class="game-meta">
              <span>Precio</span>
              <span>${voteLabel}</span>
            </div>
          </div>
          <button class="vote-button" type="button" data-game-id="${game.id}">Sumar voto</button>
        </article>
      `;
    })
    .join("");

  els.gamesList.querySelectorAll("[data-game-id]").forEach((button) => {
    button.addEventListener("click", () => voteFor(button.dataset.gameId));
  });
}

function renderPodium(results) {
  const podium = results.slice(0, 3);
  const classes = ["first", "second", "third"];

  if (!state.votes.length) {
    els.podium.innerHTML = '<p class="empty-state">El podio aparecera cuando entren los primeros votos.</p>';
    return;
  }

  els.podium.innerHTML = podium
    .map((game, index) => {
      const voteLabel = game.votes === 1 ? "1 voto" : `${game.votes} votos`;
      const height = `${100 - index * 18}%`;

      return `
        <article class="podium-card ${classes[index]}" style="--height: ${height}; --accent: ${game.accent}">
          <img src="${game.image}" alt="Imagen de ${game.name}" />
          <span class="place">#${index + 1}</span>
          <div>
            <p class="podium-name">${game.name}</p>
            <div class="podium-meta">
              <span>${voteLabel}</span>
              <span>${formatPrice(game.price)}</span>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderRanking(results) {
  const topVotes = Math.max(...results.map((game) => game.votes), 1);

  els.rankingList.innerHTML = results
    .map((game, index) => {
      const percentage = Math.round((game.votes / topVotes) * 100);
      const voteLabel = game.votes === 1 ? "1 voto" : `${game.votes} votos`;

      return `
        <div class="ranking-item">
          <div class="ranking-head">
            <span class="ranking-title">#${index + 1} ${game.name}</span>
            <span class="ranking-score">${voteLabel}</span>
          </div>
          <div class="ranking-price">${formatPrice(game.price)}</div>
          <div class="bar-track" aria-hidden="true">
            <div class="bar-fill" style="--width: ${percentage}%"></div>
          </div>
        </div>
      `;
    })
    .join("");
}

function renderHistory() {
  const lastVotes = [...state.votes].reverse().slice(0, 8);

  if (!lastVotes.length) {
    els.voteHistory.innerHTML = '<li class="empty-state">Sin votos todavia.</li>';
    return;
  }

  els.voteHistory.innerHTML = lastVotes
    .map((vote) => {
      const game = getGame(vote.gameId);
      return `<li><strong>${escapeHtml(vote.friend)}</strong>: ${game.name}</li>`;
    })
    .join("");
}

function render() {
  const results = getResults();

  els.totalVotes.textContent = state.votes.length;
  renderGames(results);
  renderPodium(results);
  renderRanking(results);
  renderHistory();
}

els.undoVote.addEventListener("click", undoLastVote);
els.resetVotes.addEventListener("click", resetVotes);
els.friendName.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    els.statusMessage.textContent = "Elige un juego para registrar el voto.";
  }
});

render();
