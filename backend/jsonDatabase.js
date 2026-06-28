import fs from "node:fs";
import path from "node:path";

export class JsonDatabase {
  constructor({ databasePath, games }) {
    this.databasePath = databasePath;
    this.games = games;
    this.gameIds = new Set(games.map((game) => game.id));
    this.data = this.load();
  }

  load() {
    fs.mkdirSync(path.dirname(this.databasePath), { recursive: true });

    if (!fs.existsSync(this.databasePath)) {
      return this.normalize({ schemaVersion: 1, nextUserId: 1, users: [], votes: [] });
    }

    const parsed = JSON.parse(fs.readFileSync(this.databasePath, "utf8"));
    return this.normalize(parsed);
  }

  normalize(rawData) {
    const users = Array.isArray(rawData.users) ? rawData.users : [];
    const userIds = new Set(users.map((user) => Number(user.id)));
    const seenVotes = new Set();

    const votes = (Array.isArray(rawData.votes) ? rawData.votes : [])
      .map((vote) => ({
        userId: Number(vote.userId),
        gameId: String(vote.gameId),
        createdAt: vote.createdAt || new Date().toISOString(),
      }))
      .filter((vote) => {
        const key = `${vote.userId}:${vote.gameId}`;
        const valid = userIds.has(vote.userId) && this.gameIds.has(vote.gameId) && !seenVotes.has(key);
        if (valid) seenVotes.add(key);
        return valid;
      });

    const nextUserId =
      rawData.nextUserId || Math.max(0, ...users.map((user) => Number(user.id) || 0)) + 1;

    return {
      schemaVersion: 1,
      nextUserId,
      users,
      votes,
    };
  }

  persist() {
    fs.mkdirSync(path.dirname(this.databasePath), { recursive: true });
    const tempPath = `${this.databasePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2));
    fs.renameSync(tempPath, this.databasePath);
  }

  findUserById(id) {
    return this.data.users.find((user) => user.id === Number(id)) || null;
  }

  findUserByProvider(provider, providerId) {
    return (
      this.data.users.find(
        (user) => user.provider === provider && user.providerId === providerId,
      ) || null
    );
  }

  publicUser(user) {
    if (!user) return null;

    return {
      id: user.id,
      name: user.displayName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      provider: user.provider,
    };
  }

  upsertUser(profile) {
    const now = new Date().toISOString();
    const existing = this.findUserByProvider(profile.provider, profile.providerId);

    if (existing) {
      existing.email = profile.email || null;
      existing.displayName = profile.displayName || "Jugador";
      existing.avatarUrl = profile.avatarUrl || null;
      existing.updatedAt = now;
      this.persist();
      return existing;
    }

    const user = {
      id: this.data.nextUserId,
      provider: profile.provider,
      providerId: profile.providerId,
      email: profile.email || null,
      displayName: profile.displayName || "Jugador",
      avatarUrl: profile.avatarUrl || null,
      createdAt: now,
      updatedAt: now,
    };

    this.data.nextUserId += 1;
    this.data.users.push(user);
    this.persist();
    return user;
  }

  getResults() {
    const userIdsWithVotes = new Set(this.data.votes.map((vote) => vote.userId));
    const totalBallots = userIdsWithVotes.size;
    const counts = new Map();

    for (const vote of this.data.votes) {
      counts.set(vote.gameId, (counts.get(vote.gameId) || 0) + 1);
    }

    const results = this.games
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
      totalSelections: this.data.votes.length,
      results,
    };
  }

  getUserVotes(userId) {
    if (!userId) return [];
    return this.data.votes
      .filter((vote) => vote.userId === Number(userId))
      .map((vote) => vote.gameId)
      .sort();
  }

  getRecentBallots(limit = 8) {
    const grouped = new Map();

    for (const vote of this.data.votes) {
      const current = grouped.get(vote.userId) || {
        userId: vote.userId,
        votedAt: vote.createdAt,
        picks: 0,
      };

      current.picks += 1;
      if (vote.createdAt > current.votedAt) current.votedAt = vote.createdAt;
      grouped.set(vote.userId, current);
    }

    return [...grouped.values()]
      .sort((a, b) => b.votedAt.localeCompare(a.votedAt))
      .slice(0, limit)
      .map((ballot) => {
        const user = this.findUserById(ballot.userId);
        return {
          displayName: user?.displayName || "Jugador",
          avatarUrl: user?.avatarUrl || null,
          votedAt: ballot.votedAt,
          picks: ballot.picks,
        };
      });
  }

  saveVotes(userId, selectedIds) {
    const now = new Date().toISOString();
    const normalizedUserId = Number(userId);

    this.data.votes = this.data.votes.filter((vote) => vote.userId !== normalizedUserId);

    for (const gameId of selectedIds) {
      this.data.votes.push({
        userId: normalizedUserId,
        gameId,
        createdAt: now,
      });
    }

    this.persist();
  }
}
