import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import express from "express";
import session from "express-session";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.join(__dirname, "data");
const dataPath = path.join(dataDir, "votecode.json");
const port = Number(process.env.PORT || 5177);
const baseUrl = (process.env.BASE_URL || `http://127.0.0.1:${port}`).replace(/\/$/, "");
const sessionSecret = process.env.SESSION_SECRET || "votecode-local-secret";
const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
const devLoginEnabled = process.env.ENABLE_DEV_LOGIN !== "false" && process.env.NODE_ENV !== "production";
const minVotes = 3;

const games = [
  {
    id: "rv-there-yet",
    name: "RV THERE YET",
    price: 3290,
    accent: "#19736f",
    image: "/assets/rv-there-yet.jpg",
  },
  {
    id: "sons-of-the-forest",
    name: "SONS OF THE FOREST",
    price: 4650,
    accent: "#263238",
    image: "/assets/sons-of-the-forest.jpg",
  },
  {
    id: "risk-of-rain-2",
    name: "RISK OF RAIN 2",
    price: 3960,
    accent: "#bd4f2f",
    image: "/assets/risk-of-rain-2.jpg",
  },
  {
    id: "plague-inc",
    name: "PLAGUE INC",
    price: 830,
    accent: "#566b2f",
    image: "/assets/plague-inc.jpg",
  },
  {
    id: "super-battle-golf",
    name: "SUPER BATTLE GOLF",
    price: 2800,
    accent: "#2f6fca",
    image: "/assets/super-battle-golf.jpg",
  },
  {
    id: "gamble-with-your-friends",
    name: "GAMBLE WITH YOUR FRIENDS",
    price: 2914,
    accent: "#8f3f97",
    image: "/assets/gamble-with-your-friends.jpg",
  },
  {
    id: "golf-with-your-friends",
    name: "GOLF WITH YOUR FRIENDS",
    price: 1190,
    accent: "#1f8a63",
    image: "/assets/golf-with-your-friends.jpg",
  },
  {
    id: "escape-the-backrooms",
    name: "ESCAPE THE BACKROOMS",
    price: 3384,
    accent: "#c99b38",
    image: "/assets/escape-the-backrooms.jpg",
  },
  {
    id: "gang-beasts",
    name: "GANG BEASTS",
    price: 4200,
    accent: "#d95d39",
    image: "/assets/gang-beast.jpg",
  },
  {
    id: "deathsprint-66",
    name: "DEATHSPRINT 66",
    price: 1925,
    accent: "#4657a8",
    image: "/assets/deathsprint-66.jpg",
  },
];

const gameIds = new Set(games.map((game) => game.id));

function loadDatabase() {
  fs.mkdirSync(dataDir, { recursive: true });

  if (!fs.existsSync(dataPath)) {
    return { nextUserId: 1, users: [], votes: [] };
  }

  const parsed = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  return {
    nextUserId: parsed.nextUserId || 1,
    users: Array.isArray(parsed.users) ? parsed.users : [],
    votes: Array.isArray(parsed.votes) ? parsed.votes : [],
  };
}

let database = loadDatabase();

function persistDatabase() {
  fs.mkdirSync(dataDir, { recursive: true });
  const tempPath = `${dataPath}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(database, null, 2));
  fs.renameSync(tempPath, dataPath);
}

function findUserById(id) {
  return database.users.find((user) => user.id === Number(id)) || null;
}

function findUserByProvider(provider, providerId) {
  return (
    database.users.find(
      (user) => user.provider === provider && user.providerId === providerId,
    ) || null
  );
}

function publicUser(user) {
  if (!user) return null;

  return {
    id: user.id,
    name: user.displayName,
    email: user.email,
    avatarUrl: user.avatarUrl,
    provider: user.provider,
  };
}

function upsertUser(profile) {
  const now = new Date().toISOString();
  const existing = findUserByProvider(profile.provider, profile.providerId);

  if (existing) {
    existing.email = profile.email || null;
    existing.displayName = profile.displayName || "Jugador";
    existing.avatarUrl = profile.avatarUrl || null;
    existing.updatedAt = now;
    persistDatabase();
    return existing;
  }

  const user = {
    id: database.nextUserId,
    provider: profile.provider,
    providerId: profile.providerId,
    email: profile.email || null,
    displayName: profile.displayName || "Jugador",
    avatarUrl: profile.avatarUrl || null,
    createdAt: now,
    updatedAt: now,
  };

  database.nextUserId += 1;
  database.users.push(user);
  persistDatabase();
  return user;
}

function getResults() {
  const userIdsWithVotes = new Set(database.votes.map((vote) => vote.userId));
  const totalBallots = userIdsWithVotes.size;
  const counts = new Map();

  for (const vote of database.votes) {
    counts.set(vote.gameId, (counts.get(vote.gameId) || 0) + 1);
  }

  const results = games
    .map((game, index) => {
      const votes = counts.get(game.id) || 0;
      const percentage = totalBallots ? Math.round((votes / totalBallots) * 100) : 0;

      return {
        ...game,
        index,
        votes,
        percentage,
      };
    })
    .sort((a, b) => b.votes - a.votes || a.index - b.index);

  return {
    totalBallots,
    totalSelections: database.votes.length,
    results,
  };
}

function getUserVotes(userId) {
  if (!userId) return [];
  return database.votes
    .filter((vote) => vote.userId === Number(userId))
    .map((vote) => vote.gameId)
    .sort();
}

function getRecentBallots() {
  const grouped = new Map();

  for (const vote of database.votes) {
    const current = grouped.get(vote.userId) || {
      userId: vote.userId,
      voted_at: vote.createdAt,
      picks: 0,
    };

    current.picks += 1;
    if (vote.createdAt > current.voted_at) current.voted_at = vote.createdAt;
    grouped.set(vote.userId, current);
  }

  return [...grouped.values()]
    .sort((a, b) => b.voted_at.localeCompare(a.voted_at))
    .slice(0, 8)
    .map((ballot) => {
      const user = findUserById(ballot.userId);
      return {
        display_name: user?.displayName || "Jugador",
        avatar_url: user?.avatarUrl || null,
        voted_at: ballot.voted_at,
        picks: ballot.picks,
      };
    });
}

function saveVotes(userId, selectedIds) {
  const now = new Date().toISOString();
  database.votes = database.votes.filter((vote) => vote.userId !== Number(userId));

  for (const gameId of selectedIds) {
    database.votes.push({
      userId: Number(userId),
      gameId,
      createdAt: now,
    });
  }

  persistDatabase();
}

function validateBallot(gameIdsPayload) {
  if (!Array.isArray(gameIdsPayload)) {
    return { ok: false, message: "La papeleta debe venir como lista de juegos." };
  }

  const selected = [...new Set(gameIdsPayload.map(String))];
  const invalid = selected.find((gameId) => !gameIds.has(gameId));

  if (invalid) {
    return { ok: false, message: "Hay un juego invalido en la papeleta." };
  }

  if (selected.length < minVotes) {
    return { ok: false, message: `Elige al menos ${minVotes} juegos para guardar.` };
  }

  if (selected.length > games.length) {
    return { ok: false, message: "No puedes votar por mas juegos de los disponibles." };
  }

  return { ok: true, selected };
}

function requireAuth(req, res, next) {
  if (req.isAuthenticated?.()) return next();
  return res.status(401).json({ error: "Necesitas iniciar sesion para votar." });
}

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => done(null, findUserById(id) || false));

if (googleEnabled) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${baseUrl}/auth/google/callback`,
      },
      (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value || null;
          const avatarUrl = profile.photos?.[0]?.value || null;
          const user = upsertUser({
            provider: "google",
            providerId: profile.id,
            email,
            displayName: profile.displayName,
            avatarUrl,
          });
          done(null, user);
        } catch (error) {
          done(error);
        }
      },
    ),
  );
}

const app = express();

app.use(express.json());
app.use(
  session({
    name: "votecode.sid",
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: baseUrl.startsWith("https://"),
      maxAge: 1000 * 60 * 60 * 24 * 30,
    },
  }),
);
app.use(passport.initialize());
app.use(passport.session());

app.get(
  "/auth/google",
  (req, res, next) => {
    if (!googleEnabled) return res.redirect("/?auth=google-missing");
    return next();
  },
  passport.authenticate("google", { scope: ["profile", "email"] }),
);

app.get(
  "/auth/google/callback",
  (req, res, next) => {
    if (!googleEnabled) return res.redirect("/?auth=google-missing");
    return next();
  },
  passport.authenticate("google", { failureRedirect: "/?auth=failed" }),
  (_req, res) => res.redirect("/"),
);

app.get("/auth/dev", (req, res) => {
  if (!devLoginEnabled) return res.status(404).send("Dev login disabled.");

  const displayName = String(req.query.name || "").trim() || "Jugador local";
  const providerId = crypto.createHash("sha256").update(displayName.toLowerCase()).digest("hex");
  const user = upsertUser({
    provider: "dev",
    providerId,
    email: null,
    displayName,
    avatarUrl: null,
  });

  req.login(user, (error) => {
    if (error) return res.status(500).send("No se pudo iniciar sesion local.");
    return res.redirect("/");
  });
});

app.post("/auth/logout", (req, res, next) => {
  req.logout((error) => {
    if (error) return next(error);
    req.session.destroy(() => {
      res.clearCookie("votecode.sid");
      res.json({ ok: true });
    });
  });
});

app.get("/api/bootstrap", (req, res) => {
  const results = getResults();
  res.json({
    auth: {
      googleEnabled,
      devLoginEnabled,
    },
    rules: {
      minVotes,
      maxVotes: games.length,
    },
    user: publicUser(req.user),
    games,
    myVotes: getUserVotes(req.user?.id),
    recentBallots: getRecentBallots(),
    ...results,
  });
});

app.post("/api/votes", requireAuth, (req, res) => {
  const validation = validateBallot(req.body?.gameIds);
  if (!validation.ok) {
    return res.status(400).json({ error: validation.message });
  }

  saveVotes(req.user.id, validation.selected);
  const results = getResults();

  return res.json({
    ok: true,
    myVotes: getUserVotes(req.user.id),
    recentBallots: getRecentBallots(),
    ...results,
  });
});

app.use(express.static(__dirname));

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: "Algo fallo en el servidor." });
});

app.listen(port, () => {
  console.log(`VoteCode running at ${baseUrl}`);
  if (!googleEnabled) {
    console.log("Google OAuth is not configured; local dev login is available.");
  }
});
