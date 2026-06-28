import { config } from "./config.js";
import { games } from "./gameCatalog.js";
import { SupabaseDatabase } from "./supabaseDatabase.js";

export function createDatabase() {
  return new SupabaseDatabase({
    supabaseUrl: config.supabaseUrl,
    serviceRoleKey: config.supabaseServiceRoleKey,
    games,
  });
}
