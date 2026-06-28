import "dotenv/config";

import express from "express";
import session from "express-session";

import { configurePassport, createDevUser } from "./auth.js";
import { config } from "./config.js";
import { games, gameIds, minVotes } from "./gameCatalog.js";
import { JsonDatabase } from "./jsonDatabase.js";

const database = new JsonDatabase({
  databasePath: config.databasePath,
  games,
});

const passport = configurePassport({
  database,
  googleEnabled: config.googleEnabled,
  baseUrl: config.baseUrl,
});

function requireAuth(req, res, next) {
  if (req.isAuthenticated?.()) return next();
  return res.status(401).json({ error: "Necesitas iniciar sesion para votar." });
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

function buildBootstrapPayload(req) {
  return {
    auth: {
      googleEnabled: config.googleEnabled,
      devLoginEnabled: config.devLoginEnabled,
    },
    rules: {
      minVotes,
      maxVotes: games.length,
    },
    user: database.publicUser(req.user),
    games,
    myVotes: database.getUserVotes(req.user?.id),
    recentBallots: database.getRecentBallots(),
    ...database.getResults(),
  };
}

const app = express();

app.use(express.json());
app.use(
  session({
    name: "votecode.sid",
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: config.baseUrl.startsWith("https://"),
      maxAge: 1000 * 60 * 60 * 24 * 30,
    },
  }),
);
app.use(passport.initialize());
app.use(passport.session());

app.get(
  "/auth/google",
  (req, res, next) => {
    if (!config.googleEnabled) return res.redirect("/?auth=google-missing");
    return next();
  },
  passport.authenticate("google", { scope: ["profile", "email"] }),
);

app.get(
  "/auth/google/callback",
  (req, res, next) => {
    if (!config.googleEnabled) return res.redirect("/?auth=google-missing");
    return next();
  },
  passport.authenticate("google", { failureRedirect: "/?auth=failed" }),
  (_req, res) => res.redirect("/"),
);

app.get("/auth/dev", (req, res) => {
  if (!config.devLoginEnabled) return res.status(404).send("Dev login disabled.");

  const user = createDevUser(database, req.query.name);
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
  res.json(buildBootstrapPayload(req));
});

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    databasePath: config.databasePath,
    googleEnabled: config.googleEnabled,
  });
});

app.post("/api/votes", requireAuth, (req, res) => {
  const validation = validateBallot(req.body?.gameIds);
  if (!validation.ok) {
    return res.status(400).json({ error: validation.message });
  }

  database.saveVotes(req.user.id, validation.selected);
  return res.json({ ok: true, ...buildBootstrapPayload(req) });
});

app.use(express.static(config.frontendDir));

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: "Algo fallo en el servidor." });
});

app.listen(config.port, () => {
  console.log(`VoteCode running at ${config.baseUrl}`);
  console.log(`Frontend: ${config.frontendDir}`);
  console.log(`Database: ${config.databasePath}`);
  if (!config.googleEnabled) {
    console.log("Google OAuth is not configured; local dev login is available.");
  }
});
