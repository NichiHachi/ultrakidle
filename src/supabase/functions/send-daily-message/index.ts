import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const BOT_TOKEN = Deno.env.get("DISCORD_BOT_TOKEN")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DISCORD_API = "https://discord.com/api/v10";

function buildForm(message: string, png?: Uint8Array): FormData {
  const form = new FormData();
  const payload: Record<string, unknown> = {
    content: message,
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            style: 2,
            label: "Play on Discord",
            custom_id: "launch_activity",
            emoji: { name: "🎮" },
          },
          {
            type: 2,
            style: 5,
            label: "Open in browser",
            url: "https://ultrakidle.online/",
            emoji: { name: "🌐" },
          },
        ],
      },
    ],
  };

  if (png) {
    payload.attachments = [{ id: 0, filename: "results.png" }];
  }

  form.append("payload_json", JSON.stringify(payload));

  if (png) {
    form.append(
      "files[0]",
      new Blob([png], { type: "image/png" }),
      "results.png",
    );
  }

  return form;
}

async function sendToDiscord(
  channelId: string,
  message: string,
  png?: Uint8Array,
): Promise<{ ok: boolean; error?: string }> {
  const endpoint = `${DISCORD_API}/channels/${channelId}/messages`;
  let attempt = 0;

  while (true) {
    attempt++;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bot ${BOT_TOKEN}` },
      body: buildForm(message, png),
    });

    if (res.ok) {
      console.log(`[${channelId}] sent (attempt ${attempt})`);
      return { ok: true };
    }

    if (res.status === 429) {
      const retryAfter =
        Number(res.headers.get("retry-after") || "1") + 0.5;
      console.warn(
        `[${channelId}] 429 — attempt ${attempt}, retry in ${retryAfter}s`,
      );
      await res.body?.cancel();
      await new Promise((r) => setTimeout(r, retryAfter * 1000));
      continue;
    }

    const text = await res.text();

    if (res.status >= 400 && res.status < 500) {
      console.error(`[${channelId}] ${res.status}: ${text}`);
      return { ok: false, error: `HTTP ${res.status}: ${text}` };
    }

    const backoff = Math.min(2 ** attempt * 1000, 30_000);
    console.warn(
      `[${channelId}] ${res.status} — attempt ${attempt}, backoff ${backoff}ms`,
    );
    await new Promise((r) => setTimeout(r, backoff));
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204 });
  }

  const auth = req.headers.get("Authorization");
  if (auth !== `Bearer ${SERVICE_KEY}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await req.json();
  const { channel_id, message, png_base64 } = body;

  if (!channel_id || !message) {
    return Response.json(
      { ok: false, error: "Missing channel_id or message" },
      { status: 400 },
    );
  }

  let png: Uint8Array | undefined;
  if (png_base64) {
    const raw = atob(png_base64);
    png = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) png[i] = raw.charCodeAt(i);
  }

  const result = await sendToDiscord(channel_id, message, png);
  return Response.json(result, { status: result.ok ? 200 : 502 });
});
