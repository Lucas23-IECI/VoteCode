import { createClient } from "@supabase/supabase-js";

export class SupabaseDatabase {
  constructor({ supabaseUrl, serviceRoleKey, games }) {
    this.games = games;
    this.gameIds = new Set(games.map((game) => game.id));
    this.client = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  async findUserById(id) {
    const { data, error } = await this.client
      .from("users")
      .select("*")
      .eq("id", Number(id))
      .maybeSingle();

    if (error) throw error;
    return data ? this.toAppUser(data) : null;
  }

  async findUserByProvider(provider, providerId) {
    const { data, error } = await this.client
      .from("users")
      .select("*")
      .eq("provider", provider)
      .eq("provider_id", providerId)
      .maybeSingle();

    if (error) throw error;
    return data ? this.toAppUser(data) : null;
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

  async upsertUser(profile) {
    const existing = await this.findUserByProvider(profile.provider, profile.providerId);
    const payload = {
      provider: profile.provider,
      provider_id: profile.providerId,
      email: profile.email || null,
      display_name: profile.displayName || "Jugador",
      avatar_url: profile.avatarUrl || null,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      const { data, error } = await this.client
        .from("users")
        .update(payload)
        .eq("id", existing.id)
        .select("*")
        .single();

      if (error) throw error;
      return this.toAppUser(data);
    }

    const { data, error } = await this.client
      .from("users")
      .insert(payload)
      .select("*")
      .single();

    if (error) throw error;
    return this.toAppUser(data);
  }

  async getResults() {
    const { data: voteRows, error } = await this.client.from("votes").select("user_id, game_id");
    if (error) throw error;

    const userIdsWithVotes = new Set(voteRows.map((vote) => vote.user_id));
    const totalBallots = userIdsWithVotes.size;
    const counts = new Map();

    for (const vote of voteRows) {
      counts.set(vote.game_id, (counts.get(vote.game_id) || 0) + 1);
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
      totalSelections: voteRows.length,
      results,
    };
  }

  async getUserVotes(userId) {
    if (!userId) return [];

    const { data, error } = await this.client
      .from("votes")
      .select("game_id")
      .eq("user_id", Number(userId))
      .order("game_id");

    if (error) throw error;
    return data.map((vote) => vote.game_id);
  }

  async getRecentBallots(limit = 8) {
    const { data, error } = await this.client
      .from("votes")
      .select("user_id, created_at, users(display_name, avatar_url)");

    if (error) throw error;

    const grouped = new Map();

    for (const vote of data) {
      const current = grouped.get(vote.user_id) || {
        userId: vote.user_id,
        displayName: vote.users?.display_name || "Jugador",
        avatarUrl: vote.users?.avatar_url || null,
        votedAt: vote.created_at,
        picks: 0,
      };

      current.picks += 1;
      if (vote.created_at > current.votedAt) current.votedAt = vote.created_at;
      grouped.set(vote.user_id, current);
    }

    return [...grouped.values()]
      .sort((a, b) => b.votedAt.localeCompare(a.votedAt))
      .slice(0, limit);
  }

  async saveVotes(userId, selectedIds) {
    const normalizedUserId = Number(userId);
    const createdAt = new Date().toISOString();

    const { error: deleteError } = await this.client
      .from("votes")
      .delete()
      .eq("user_id", normalizedUserId);

    if (deleteError) throw deleteError;

    const rows = selectedIds.map((gameId) => ({
      user_id: normalizedUserId,
      game_id: gameId,
      created_at: createdAt,
    }));

    const { error: insertError } = await this.client.from("votes").insert(rows);
    if (insertError) throw insertError;
  }

  toAppUser(row) {
    return {
      id: row.id,
      provider: row.provider,
      providerId: row.provider_id,
      email: row.email,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
