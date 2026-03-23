import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

const BOT_TOKEN = Deno.env.get("DISCORD_AUTOMATION_BOT_TOKEN")!;
const DISCORD_API = "https://discord.com/api/v10";
const ASPECT_TOLERANCE = 0.02;
const LEVEL_PATTERN = /^(\d+-\d+|\d+-[A-Z]\d*|P-\d+)$/i;

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
      await new Promise((r) => setTimeout(r, retryAfter));
      continue;
    }
    if (res.status >= 500) {
      const backoff = 1000 * 2 ** attempt;
      await new Promise((r) => setTimeout(r, backoff));
      continue;
    }
    return res;
  }
  throw new Error(`All retries exhausted for ${url}`);
}

async function sendMessage(channelId: string, content: string) {
  const res = await discordFetch(
    `${DISCORD_API}/channels/${channelId}/messages`,
    {
      method: "POST",
      headers: discordHeaders,
      body: JSON.stringify({ content }),
    },
  );
  if (!res.ok)
    console.error(`[msg] Failed in ${channelId}: ${res.status}`);
}

async function closeThread(threadId: string) {
  const res = await discordFetch(
    `${DISCORD_API}/channels/${threadId}`,
    {
      method: "PATCH",
      headers: discordHeaders,
      body: JSON.stringify({ archived: true, locked: true }),
    },
  );
  if (!res.ok)
    console.error(
      `[thread] Failed to close ${threadId}: ${res.status}`,
    );
}

async function addReaction(
  channelId: string,
  messageId: string,
  emoji: string,
) {
  const encoded = encodeURIComponent(emoji);
  await discordFetch(
    `${DISCORD_API}/channels/${channelId}/messages/${messageId}/reactions/${encoded}/@me`,
    { method: "PUT", headers: discordHeaders },
  );
}

async function rejectThread(
  threadId: string,
  messageId: string,
  reason: string,
) {
  await addReaction(threadId, messageId, "❌");
  await sendMessage(
    threadId,
    `❌ **Submission rejected** — ${reason}`,
  );
  await closeThread(threadId);
}

function discordAvatarUrl(
  userId: string,
  avatarHash: string | null,
): string {
  if (!avatarHash) {
    const index = (BigInt(userId) >> 22n) % 6n;
    return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
  }
  const ext = avatarHash.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${ext}`;
}

serve(async (req) => {
  const authHeader = req.headers.get("Authorization");
  if (
    authHeader !==
    `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { threads } = await req.json();
  if (!threads?.length) {
    return Response.json({
      results: [],
      ingested: 0,
      rejected: 0,
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: levels } = await supabase
    .from("levels")
    .select("id, level_number");

  if (!levels?.length) {
    return Response.json(
      { error: "No levels found" },
      { status: 500 },
    );
  }

  const levelMap = new Map(levels.map((l) => [l.level_number, l.id]));

  type Result = {
    thread_id: string;
    action: string;
    reason?: string;
  };
  const results: Result[] = [];
  let ingested = 0;
  let rejected = 0;

  for (const thread of threads) {
    try {
      await new Promise((r) => setTimeout(r, 1000));

      const title = (thread.name ?? "").trim();
      const levelMatch = title.match(LEVEL_PATTERN);

      if (!levelMatch) {
        await rejectThread(
          thread.id,
          thread.id,
          `Post title must be exactly a level name (e.g. \`2-1\`, \`P-2\`, \`0-E\`, \`7-S\`). Got: \`${title}\``,
        );
        await supabase
          .from("rejected_threads")
          .insert({ thread_id: thread.id });
        results.push({
          thread_id: thread.id,
          action: "rejected",
          reason: "invalid_title",
        });
        rejected++;
        continue;
      }

      const levelNumber = levelMatch[1].toUpperCase();
      const levelId = levelMap.get(levelNumber);

      if (!levelId) {
        await rejectThread(
          thread.id,
          thread.id,
          `Level \`${levelNumber}\` was not found in the database. Make sure it's a valid main level.`,
        );
        await supabase
          .from("rejected_threads")
          .insert({ thread_id: thread.id });
        results.push({
          thread_id: thread.id,
          action: "rejected",
          reason: "unknown_level",
        });
        rejected++;
        continue;
      }

      const msgRes = await discordFetch(
        `${DISCORD_API}/channels/${thread.id}/messages/${thread.id}`,
        { headers: discordHeaders },
      );
      if (!msgRes.ok) {
        await closeThread(thread.id);
        results.push({
          thread_id: thread.id,
          action: "error",
          reason: "no_starter_message",
        });
        continue;
      }
      const msg = await msgRes.json();

      const imageAttachments = (msg.attachments ?? []).filter(
        (a: any) =>
          a.content_type?.startsWith("image/") ||
          /\.(png|jpe?g|webp|gif)$/i.test(a.filename ?? ""),
      );

      if (imageAttachments.length === 0) {
        await rejectThread(
          thread.id,
          thread.id,
          "The first message must contain exactly one image attachment.",
        );
        await supabase
          .from("rejected_threads")
          .insert({ thread_id: thread.id });
        results.push({
          thread_id: thread.id,
          action: "rejected",
          reason: "no_image",
        });
        rejected++;
        continue;
      }

      if (imageAttachments.length > 1) {
        await rejectThread(
          thread.id,
          thread.id,
          `The first message must contain exactly one image. Found ${imageAttachments.length}.`,
        );
        await supabase
          .from("rejected_threads")
          .insert({ thread_id: thread.id });
        results.push({
          thread_id: thread.id,
          action: "rejected",
          reason: "multiple_images",
        });
        rejected++;
        continue;
      }

      const attachment = imageAttachments[0];
      const imgRes = await fetch(attachment.url);
      if (!imgRes.ok) {
        await rejectThread(
          thread.id,
          thread.id,
          "Failed to download image.",
        );
        await supabase
          .from("rejected_threads")
          .insert({ thread_id: thread.id });
        results.push({
          thread_id: thread.id,
          action: "rejected",
          reason: "download_failed",
        });
        rejected++;
        continue;
      }

      const imageData = new Uint8Array(await imgRes.arrayBuffer());
      const decoded = await Image.decode(imageData);

      if (
        Math.abs(decoded.width / decoded.height - 16 / 9) >=
        ASPECT_TOLERANCE
      ) {
        await rejectThread(
          thread.id,
          thread.id,
          `Image must be 16:9 aspect ratio. Got ${decoded.width}×${decoded.height}.`,
        );
        await supabase
          .from("rejected_threads")
          .insert({ thread_id: thread.id });
        results.push({
          thread_id: thread.id,
          action: "rejected",
          reason: "bad_aspect_ratio",
        });
        rejected++;
        continue;
      }

      const author = msg.author;
      const displayName = author.global_name || author.username;

      const { error } = await supabase
        .from("image_submissions")
        .insert({
          guild_id: thread.guild_id,
          channel_id: thread.id,
          message_id: thread.id,
          discord_user_id: author.id,
          discord_name: displayName,
          discord_avatar_url: discordAvatarUrl(
            author.id,
            author.avatar,
          ),
          level_id: levelId,
          image_url: attachment.url,
        })
        .single();

      if (error) {
        if (error.code === "23505") {
          results.push({
            thread_id: thread.id,
            action: "skipped",
            reason: "duplicate",
          });
        } else {
          console.error(
            `[ingest] DB error for ${thread.id}:`,
            error,
          );
          results.push({
            thread_id: thread.id,
            action: "error",
            reason: "db_error",
          });
        }
        continue;
      }

      await addReaction(thread.id, thread.id, "👀");
      results.push({ thread_id: thread.id, action: "ingested" });
      ingested++;
      console.log(
        `[ingest] ✓ ${thread.id} — ${levelNumber} by ${displayName}`,
      );
    } catch (e) {
      console.error(`[ingest] Error for ${thread.id}:`, e);
      await closeThread(thread.id).catch(() => {});
      results.push({
        thread_id: thread.id,
        action: "error",
        reason: String(e),
      });
    }
  }

  console.log(
    `[ingest] Done — ${ingested} ingested, ${rejected} rejected`,
  );
  return Response.json({ results, ingested, rejected });
});
