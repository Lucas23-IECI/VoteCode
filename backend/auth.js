import crypto from "node:crypto";

import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

export function configurePassport({ database, googleEnabled, baseUrl }) {
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser((id, done) => done(null, database.findUserById(id) || false));

  if (!googleEnabled) return passport;

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
          const user = database.upsertUser({
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

  return passport;
}

export function createDevUser(database, displayName) {
  const cleanName = String(displayName || "").trim() || "Jugador local";
  const providerId = crypto.createHash("sha256").update(cleanName.toLowerCase()).digest("hex");

  return database.upsertUser({
    provider: "dev",
    providerId,
    email: null,
    displayName: cleanName,
    avatarUrl: null,
  });
}
