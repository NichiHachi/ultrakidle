import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const BOT_TOKEN = Deno.env.get("DISCORD_AUTOMATION_BOT_TOKEN")!;
const DISCORD_API = "https://discord.com/api/v10";

const discordHeaders = {
  Authorization: `Bot ${BOT_TOKEN}`,
  "Content-Type": "application/json",
};

async function discordFetch(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url, init);
    if (res.ok || res.status === 404) return res;
    if (res.status === 429) {
      const body = await res.json();
      const retryAfter = (body.retry_after ?? 1) * 1000;
      console.warn(`[discord] 429, retrying in ${retryAfter}ms`);
      await new Promise((r) => setTimeout(r, retryAfter));
      continue;
    }
    if (res.status >= 500) {
      const backoff = 1000 * 2 ** attempt;
      console.warn(
        `[discord] ${res.status}, retrying in ${backoff}ms`,
      );
      await new Promise((r) => setTimeout(r, backoff));
      continue;
    }
    return res;
  }
  throw new Error(`All retries exhausted for ${url}`);
}

serve(async (req) => {
  const authHeader = req.headers.get("Authorization");
  if (
    authHeader !==
    `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: forums } = await supabase
    .from("submission_forums")
    .select("channel_id, guild_id");

  if (!forums?.length) {
    return Response.json({ threads: [], total: 0 });
  }

  const allNewThreads: Array<{
    id: string;
    name: string;
    guild_id: string;
    forum_channel_id: string;
  }> = [];

  for (const forum of forums) {
    const res = await discordFetch(
      `${DISCORD_API}/guilds/${forum.guild_id}/threads/active`,
      { headers: discordHeaders },
    );
    if (!res.ok) continue;

    const body = await res.json();
    const activeThreads = (body.threads ?? []).filter(
      (t: any) =>
        t.parent_id === forum.channel_id &&
        !t.thread_metadata?.archived,
    );

    if (!activeThreads.length) continue;

    const threadIds = activeThreads.map((t: any) => t.id);

    const { data: existing } = await supabase
      .from("image_submissions")
      .select("message_id")
      .in("message_id", threadIds);

    const { data: rejected } = await supabase
      .from("rejected_threads")
      .select("thread_id")
      .in("thread_id", threadIds);

    const existingIds = new Set(
      existing?.map((e) => e.message_id) ?? [],
    );
    const rejectedIds = new Set(
      rejected?.map((r) => r.thread_id) ?? [],
    );

    for (const t of activeThreads) {
      if (!existingIds.has(t.id) && !rejectedIds.has(t.id)) {
        allNewThreads.push({
          id: t.id,
          name: t.name ?? "",
          guild_id: forum.guild_id,
          forum_channel_id: forum.channel_id,
        });
      }
    }
  }

  console.log(
    `[discover] Found ${allNewThreads.length} new thread(s)`,
  );

  return Response.json({
    threads: allNewThreads,
    total: allNewThreads.length,
  });
});
