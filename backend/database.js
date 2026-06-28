import { config } from "./config.js";
import { games } from "./gameCatalog.js";
import { JsonDatabase } from "./jsonDatabase.js";
import { SupabaseDatabase } from "./supabaseDatabase.js";

export function createDatabase() {
  if (config.supabaseEnabled) {
    return new SupabaseDatabase({
      supabaseUrl: config.supabaseUrl,
      serviceRoleKey: config.supabaseServiceRoleKey,
      games,
    });
  }

  return new JsonDatabase({
    databasePath: config.databasePath,
    games,
  });
}
