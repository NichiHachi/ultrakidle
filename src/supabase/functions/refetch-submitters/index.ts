import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const BOT_TOKEN = Deno.env.get("DISCORD_AUTOMATION_BOT_TOKEN")!;
const DISCORD_API = "https://discord.com/api/v10";

interface UserResult {
  discord_user_id: string;
  discord_name: string | null;
  discord_avatar_url: string | null;
  error?: string;
}

async function fetchUser(uid: string): Promise<UserResult> {
  const maxRetries = 3;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const res = await fetch(`${DISCORD_API}/users/${uid}`, {
      headers: {
        Authorization: `Bot ${BOT_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    if (res.status === 429) {
      const retryAfter = parseFloat(
        res.headers.get("retry-after") ?? "1"
      );
      if (retryAfter > 30) {
        return { discord_user_id: uid, discord_name: null, discord_avatar_url: null, error: `rate_limited_${retryAfter}s` };
      }
      await new Promise((r) => setTimeout(r, retryAfter * 1000));
      continue;
    }

    if (!res.ok) {
      return { discord_user_id: uid, discord_name: null, discord_avatar_url: null, error: `http_${res.status}` };
    }

    const user = await res.json();
    const displayName = user.global_name ?? user.username ?? null;
    const avatarHash = user.avatar;
    let avatarUrl: string | null = null;

    if (avatarHash) {
      const ext = avatarHash.startsWith("a_") ? "gif" : "png";
      avatarUrl = `https://cdn.discordapp.com/avatars/${uid}/${avatarHash}.${ext}?size=128`;
    }

    return { discord_user_id: uid, discord_name: displayName, discord_avatar_url: avatarUrl };
  }

  return { discord_user_id: uid, discord_name: null, discord_avatar_url: null, error: "max_retries" };
}

serve(async (req) => {
  try {
    const { user_ids } = await req.json() as { user_ids: string[] };

    if (!Array.isArray(user_ids) || user_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: "user_ids required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const results: UserResult[] = [];

    for (let i = 0; i < user_ids.length; i++) {
      results.push(await fetchUser(user_ids[i]));
      if (i < user_ids.length - 1) {
        await new Promise((r) => setTimeout(r, 1500));
      }
    }

    return new Response(
      JSON.stringify({ ok: true, results }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: String(e) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
