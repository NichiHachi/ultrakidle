import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const BOTS: Record<string, string> = {
  main: Deno.env.get("DISCORD_BOT_TOKEN")!,
  automation: Deno.env.get("DISCORD_AUTOMATION_BOT_TOKEN")!,
};
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DISCORD_API = "https://discord.com/api/v10";

interface Attachment {
  base64: string;
  filename: string;
  content_type?: string;
}

interface MessagePayload {
  channel_id: string;
  message?: string;
  bot?: "main" | "automation";
  components?: unknown[];
  attachments?: Attachment[];
}

function buildForm(
  message: string | undefined,
  components: unknown[] | undefined,
  attachments: Attachment[],
): FormData {
  const form = new FormData();
  const payload: Record<string, unknown> = {};

  if (message) payload.content = message;
  if (components?.length) payload.components = components;

  if (attachments.length) {
    payload.attachments = attachments.map((a, i) => ({
      id: i,
      filename: a.filename,
    }));
  }

  form.append("payload_json", JSON.stringify(payload));

  for (let i = 0; i < attachments.length; i++) {
    const a = attachments[i];
    const raw = atob(a.base64);
    const bytes = new Uint8Array(raw.length);
    for (let j = 0; j < raw.length; j++) bytes[j] = raw.charCodeAt(j);
    form.append(
      `files[${i}]`,
      new Blob([bytes], { type: a.content_type ?? "application/octet-stream" }),
      a.filename,
    );
  }

  return form;
}

async function sendToDiscord(
  token: string,
  channelId: string,
  message: string | undefined,
  components: unknown[] | undefined,
  attachments: Attachment[],
): Promise<{ ok: boolean; error?: string }> {
  const endpoint = `${DISCORD_API}/channels/${channelId}/messages`;
  let attempt = 0;

  while (true) {
    attempt++;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bot ${token}` },
      body: buildForm(message, components, attachments),
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

  const body: MessagePayload = await req.json();
  const { channel_id, message, bot = "main", components, attachments } =
    body;

  if (!channel_id) {
    return Response.json(
      { ok: false, error: "Missing channel_id" },
      { status: 400 },
    );
  }

  if (!message && !attachments?.length) {
    return Response.json(
      { ok: false, error: "Must provide message or attachments" },
      { status: 400 },
    );
  }

  const token = BOTS[bot];
  if (!token) {
    return Response.json(
      { ok: false, error: `Unknown bot: ${bot}` },
      { status: 400 },
    );
  }

  const result = await sendToDiscord(
    token,
    channel_id,
    message,
    components,
    attachments ?? [],
  );
  return Response.json(result, { status: result.ok ? 200 : 502 });
});
