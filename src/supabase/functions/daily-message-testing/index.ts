import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { initWasm, Resvg } from "https://esm.sh/@resvg/resvg-wasm@2.6.2";
import resvgWasm from "https://esm.sh/@resvg/resvg-wasm@2.6.2/index_bg.wasm?module";

const BOT_TOKEN = Deno.env.get("DISCORD_BOT_TOKEN")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const BATCH_SIZE = 10;
const MAX_RETRIES = 10;
const AVATAR_CONCURRENCY = 10;

let wasmInitialized = false;
async function ensureWasm() {
  if (!wasmInitialized) {
    await initWasm(resvgWasm);
    wasmInitialized = true;
  }
}

const avatarCache = new Map<string, string>();

async function fetchAvatarBase64(url: string): Promise<string> {
  if (avatarCache.has(url)) return avatarCache.get(url)!;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const mime = res.headers.get("content-type") || "image/png";
    const dataUri = `data:${mime};base64,${btoa(binary)}`;
    avatarCache.set(url, dataUri);
    return dataUri;
  } catch {
    avatarCache.set(url, "");
    return "";
  }
}

async function fetchAvatarsBatched(
  urls: (string | undefined)[],
): Promise<string[]> {
  const results: string[] = new Array(urls.length).fill("");
  const queue = urls.map((url, i) => ({ url, i })).filter((x) => x.url);
  let cursor = 0;

  async function next(): Promise<void> {
    while (cursor < queue.length) {
      const item = queue[cursor++];
      results[item.i] = await fetchAvatarBase64(item.url!);
    }
  }

  const workers = Array.from(
    { length: Math.min(AVATAR_CONCURRENCY, queue.length) },
    () => next(),
  );
  await Promise.all(workers);
  return results;
}

const COLOR_MAP: Record<string, string> = {
  GREEN: "#00C950",
  YELLOW: "#F0B100",
  RED: "#FB2C36",
};

function infernoRoundColor(score: number): string {
  if (score >= 100) return COLOR_MAP.GREEN;
  if (score > 0) return COLOR_MAP.YELLOW;
  return COLOR_MAP.RED;
}

function formatTime(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toFixed(1).padStart(4, "0")}`;
}

async function generateResultsImage(
  results: {
    name: string;
    is_win: boolean;
    attempts: number;
    avatar_url?: string;
    colors?: string[][];
  }[],
): Promise<Uint8Array> {
  await ensureWasm();

  const CELL = 16;
  const GAP = 3;
  const GRID_COLS = 6;
  const GRID_ROWS = 5;
  const GRID_W = GRID_COLS * (CELL + GAP) - GAP;
  const GRID_H = GRID_ROWS * (CELL + GAP) - GAP;
  const AVATAR_R = 24;
  const CARD_PAD = 12;
  const CARD_W = AVATAR_R * 2 + CARD_PAD + GRID_W + CARD_PAD * 2;
  const CARD_H = GRID_H + CARD_PAD * 2;
  const CARD_GAP = 16;
  const PAD = 24;
  const TARGET_RATIO = 16 / 9;

  let bestCols = 1;
  let bestDiff = Infinity;
  for (let c = 1; c <= results.length; c++) {
    const rows = Math.ceil(results.length / c);
    const w = PAD * 2 + c * CARD_W + (c - 1) * CARD_GAP;
    const h = PAD * 2 + rows * CARD_H + (rows - 1) * CARD_GAP;
    const diff = Math.abs(w / h - TARGET_RATIO);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestCols = c;
    }
  }

  const COLS = bestCols;
  const totalRows = Math.ceil(results.length / COLS);
  const totalW = PAD * 2 + COLS * CARD_W + (COLS - 1) * CARD_GAP;
  const totalH = PAD * 2 + totalRows * CARD_H + (totalRows - 1) * CARD_GAP;

  const avatars = await fetchAvatarsBatched(results.map((r) => r.avatar_url));

  let defs = "";
  let cards = "";

  results.forEach((r, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const cx = PAD + col * (CARD_W + CARD_GAP);
    const cy = PAD + row * (CARD_H + CARD_GAP);

    cards += `<rect x="${cx}" y="${cy}" width="${CARD_W}" height="${CARD_H}" fill="#0D0D0D" stroke="#ffffff" stroke-width="1"/>`;

    const ax = cx + CARD_PAD + AVATAR_R;
    const ay = cy + CARD_H / 2;

    if (avatars[i]) {
      defs += `<clipPath id="clip-${i}"><circle cx="${ax}" cy="${ay}" r="${AVATAR_R}"/></clipPath>`;
      cards += `<image href="${avatars[i]}" x="${ax - AVATAR_R}" y="${ay - AVATAR_R}" width="${AVATAR_R * 2}" height="${AVATAR_R * 2}" clip-path="url(#clip-${i})"/>`;
    } else {
      cards += `<circle cx="${ax}" cy="${ay}" r="${AVATAR_R}" fill="#444"/>`;
    }

    cards += `<circle cx="${ax}" cy="${ay}" r="${AVATAR_R}" fill="none" stroke="#ffffff" stroke-width="2"/>`;

    const gridX = cx + CARD_PAD * 2 + AVATAR_R * 2;
    const gridY = cy + CARD_PAD;

    for (let gr = 0; gr < GRID_ROWS; gr++) {
      for (let gc = 0; gc < GRID_COLS; gc++) {
        const x = gridX + gc * (CELL + GAP);
        const y = gridY + gr * (CELL + GAP);
        let fill = "#3a3a3c";
        if (r.colors && r.colors[gr]) {
          const hint = r.colors[gr][gc];
          if (hint && COLOR_MAP[hint]) fill = COLOR_MAP[hint];
        }
        cards += `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" fill="${fill}"/>`;
      }
    }
  });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${totalW}" height="${totalH}">
    <defs>${defs}</defs>
    ${cards}
  </svg>`;

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: totalW * 2 },
  });
  return resvg.render().asPng();
}

async function generateInfernoImage(
  results: {
    name: string;
    total_score: number;
    total_time_seconds: number;
    score_history: number[];
    avatar_url?: string;
  }[],
): Promise<Uint8Array> {
  await ensureWasm();

  const CELL = 24;
  const GAP = 4;
  const ROUNDS = 5;
  const GRID_W = ROUNDS * (CELL + GAP) - GAP;
  const AVATAR_R = 24;
  const CARD_PAD = 12;
  const CARD_W = AVATAR_R * 2 + CARD_PAD + GRID_W + CARD_PAD * 2;
  const CARD_H = AVATAR_R * 2 + CARD_PAD * 2;
  const CARD_GAP = 16;
  const PAD = 24;
  const TARGET_RATIO = 16 / 9;

  let bestCols = 1;
  let bestDiff = Infinity;
  for (let c = 1; c <= results.length; c++) {
    const rows = Math.ceil(results.length / c);
    const w = PAD * 2 + c * CARD_W + (c - 1) * CARD_GAP;
    const h = PAD * 2 + rows * CARD_H + (rows - 1) * CARD_GAP;
    const diff = Math.abs(w / h - TARGET_RATIO);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestCols = c;
    }
  }

  const COLS = bestCols;
  const totalRows = Math.ceil(results.length / COLS);
  const totalW = PAD * 2 + COLS * CARD_W + (COLS - 1) * CARD_GAP;
  const totalH = PAD * 2 + totalRows * CARD_H + (totalRows - 1) * CARD_GAP;

  const avatars = await fetchAvatarsBatched(results.map((r) => r.avatar_url));

  let defs = "";
  let cards = "";

  results.forEach((r, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const cx = PAD + col * (CARD_W + CARD_GAP);
    const cy = PAD + row * (CARD_H + CARD_GAP);

    cards += `<rect x="${cx}" y="${cy}" width="${CARD_W}" height="${CARD_H}" fill="#0D0D0D" stroke="#ffffff" stroke-width="1"/>`;

    const ax = cx + CARD_PAD + AVATAR_R;
    const ay = cy + CARD_H / 2;

    if (avatars[i]) {
      defs += `<clipPath id="iclip-${i}"><circle cx="${ax}" cy="${ay}" r="${AVATAR_R}"/></clipPath>`;
      cards += `<image href="${avatars[i]}" x="${ax - AVATAR_R}" y="${ay - AVATAR_R}" width="${AVATAR_R * 2}" height="${AVATAR_R * 2}" clip-path="url(#iclip-${i})"/>`;
    } else {
      cards += `<circle cx="${ax}" cy="${ay}" r="${AVATAR_R}" fill="#444"/>`;
    }

    cards += `<circle cx="${ax}" cy="${ay}" r="${AVATAR_R}" fill="none" stroke="#ffffff" stroke-width="2"/>`;

    const gridX = cx + CARD_PAD * 2 + AVATAR_R * 2;
    const gridY = cy + (CARD_H - CELL) / 2;

    const history = r.score_history || [];
    for (let gc = 0; gc < ROUNDS; gc++) {
      const x = gridX + gc * (CELL + GAP);
      const fill =
        gc < history.length ? infernoRoundColor(history[gc]) : "#3a3a3c";
      cards += `<rect x="${x}" y="${gridY}" width="${CELL}" height="${CELL}" fill="${fill}"/>`;
    }
  });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${totalW}" height="${totalH}">
    <defs>${defs}</defs>
    ${cards}
  </svg>`;

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: totalW * 2 },
  });
  return resvg.render().asPng();
}

function formatMessage(data: {
  results: { name: string; is_win: boolean; attempts: number }[];
  streak: number;
  day_number: number;
  inferno?: {
    set_number: number;
    results: {
      name: string;
      total_score: number;
      total_time_seconds: number;
    }[];
  };
}): string {
  const grouped = new Map<string, string[]>();

  for (const r of data.results) {
    const key = r.is_win ? `${r.attempts}/5` : "X/5";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(r.name);
  }

  const sorted = [...grouped.entries()].sort((a, b) => {
    const aVal = a[0] === "X/5" ? 99 : parseInt(a[0]);
    const bVal = b[0] === "X/5" ? 99 : parseInt(b[0]);
    return aVal - bVal;
  });

  const bestKey = sorted[0]?.[0];
  const lines = sorted.map(([key, names]) => {
    const prefix = key === bestKey && key !== "X/5" ? "👑 " : "";
    return `${prefix}${key}: ${names.join("  ")}`;
  });

  let streakLine = "";
  if (data.streak === 1) {
    streakLine = "The streak begins... 👀 ";
  } else if (data.streak > 1) {
    streakLine = `This server is on a ${data.streak} day streak! 🔥`;
  }

  let msg =
    `🔴 ULTRAKIDLE #${data.day_number} has ended!\n${streakLine}\nHere are yesterday's results:\n` +
    lines.join("\n") +
    `\n\nA new enemy is waiting!`;

  if (data.inferno && data.inferno.results.length > 0) {
    const infernoNames = data.inferno.results
      .map(
        (r) =>
          `${r.name} ${r.total_score} (${formatTime(Number(r.total_time_seconds))})`,
      )
      .join("  ·  ");
    msg += `\n\n🔥 INFERNOGUESSR #${data.inferno.set_number}\n${infernoNames}`;
  }

  return msg;
}

function buildForm(
  message: string,
  images: { png: Uint8Array; name: string }[],
): FormData {
  const form = new FormData();
  form.append(
    "payload_json",
    JSON.stringify({
      content: message,
      attachments: images.map((img, i) => ({ id: i, filename: img.name })),
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
    }),
  );
  images.forEach((img, i) => {
    form.append(
      `files[${i}]`,
      new Blob([img.png], { type: "image/png" }),
      img.name,
    );
  });
  return form;
}

async function discordSend(
  channelId: string,
  message: string,
  images: { png: Uint8Array; name: string }[],
): Promise<boolean> {
  const endpoint = `https://discord.com/api/v10/channels/${channelId}/messages`;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bot ${BOT_TOKEN}` },
      body: buildForm(message, images),
    });

    if (res.ok) {
      console.log(`[${channelId}] sent (attempt ${attempt + 1})`);
      return true;
    }

    if (res.status === 429) {
      const retryAfter = Number(res.headers.get("retry-after") || "1") + 0.5;
      console.warn(
        `[${channelId}] 429 — retry ${attempt + 1}/${MAX_RETRIES} in ${retryAfter}s`,
      );
      await res.body?.cancel();
      await new Promise((r) => setTimeout(r, retryAfter * 1000));
      continue;
    }

    const text = await res.text();
    console.error(
      `[${channelId}] HTTP ${res.status} (attempt ${attempt + 1}): ${text}`,
    );

    if (res.status >= 400 && res.status < 500 && res.status !== 429) {
      return false;
    }

    const backoff = Math.min(2 ** attempt * 1000, 30_000);
    await new Promise((r) => setTimeout(r, backoff));
  }

  console.error(`[${channelId}] exhausted ${MAX_RETRIES} retries`);
  return false;
}

async function sendToChannel(
  supabase: ReturnType<typeof createClient>,
  row: { guild_id: string; channel_id: string },
): Promise<{ channel_id: string; ok: boolean; skipped?: boolean }> {
  const [ultrakidleRes, infernoRes] = await Promise.all([
    supabase.rpc("get_guild_daily_summary", {
      p_guild_id: row.guild_id,
    }),
    supabase.rpc("get_guild_inferno_summary", {
      p_guild_id: row.guild_id,
    }),
  ]);

  if (ultrakidleRes.error) {
    console.error(
      `[${row.channel_id}] ULTRAKIDLE RPC error:`,
      ultrakidleRes.error,
    );
  }
  if (infernoRes.error) {
    console.error(`[${row.channel_id}] INFERNO RPC error:`, infernoRes.error);
  }

  const hasUltrakidle = !!ultrakidleRes.data?.results?.length;
  const hasInferno = !!infernoRes.data?.results?.length;

  if (!hasUltrakidle && !hasInferno) {
    return { channel_id: row.channel_id, ok: true, skipped: true };
  }

  const messageData = {
    ...ultrakidleRes.data,
    results: ultrakidleRes.data?.results || [],
    streak: ultrakidleRes.data?.streak || 0,
    day_number: ultrakidleRes.data?.day_number || 0,
    inferno: hasInferno ? infernoRes.data : undefined,
  };

  const message = formatMessage(messageData);
  const images: { png: Uint8Array; name: string }[] = [];

  if (hasUltrakidle) {
    images.push({
      png: await generateResultsImage(ultrakidleRes.data.results),
      name: "results.png",
    });
  }

  if (hasInferno) {
    images.push({
      png: await generateInfernoImage(infernoRes.data.results),
      name: "inferno.png",
    });
  }

  const ok = await discordSend(row.channel_id, message, images);
  return { channel_id: row.channel_id, ok };
}

serve(async (req) => {
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${SERVICE_KEY}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(req.url);
  const testChannel = url.searchParams.get("channel");

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  await ensureWasm();

  let query = supabase
    .from("daily_notification_channels")
    .select("guild_id, channel_id");

  if (testChannel) query = query.eq("channel_id", testChannel);

  const { data: channels, error: channelsError } = await query;

  if (channelsError) {
    console.error("Failed to fetch channels:", channelsError);
    return Response.json(
      { ok: false, error: channelsError.message },
      { status: 500 },
    );
  }

  if (!channels?.length) {
    return Response.json({ ok: true, sent: 0 });
  }

  let succeeded = 0;
  let failed = 0;
  let skipped = 0;
  const failures: string[] = [];

  for (let i = 0; i < channels.length; i += BATCH_SIZE) {
    const batch = channels.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map((row) => sendToChannel(supabase, row)),
    );

    for (const r of results) {
      if (r.status === "fulfilled") {
        if (r.value.skipped) skipped++;
        else if (r.value.ok) succeeded++;
        else {
          failed++;
          failures.push(r.value.channel_id);
        }
      } else {
        console.error("Unhandled rejection:", r.reason);
        failed++;
      }
    }

    if (i + BATCH_SIZE < channels.length) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  avatarCache.clear();

  return Response.json({
    ok: failed === 0,
    succeeded,
    failed,
    skipped,
    failures,
  });
});
