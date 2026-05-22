import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.208.0/crypto/mod.ts";
import { extname } from "https://deno.land/std@0.208.0/path/mod.ts";
import { S3Client, PutObjectCommand } from "https://esm.sh/@aws-sdk/client-s3@3.484.0";

const DEST_BUCKET = "inferno-cybergrind";
const PUBLIC_DOMAIN = "https://cgimages.ultrakidle.online";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${Deno.env.get("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: Deno.env.get("R2_ACCESS_KEY_ID")!,
    secretAccessKey: Deno.env.get("R2_SECRET_ACCESS_KEY")!,
  },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader)
    return Response.json(
      { error: "No auth header" },
      { status: 401, headers: corsHeaders },
    );

  try {
    const body = await req.json().catch(() => ({}));
    const version = body.version;

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !user) throw new Error("Invalid token");

    const { data: advData, error: advErr } = await supabase.rpc(
      "advance_ig_cybergrind_setup",
      { version, caller_id: user.id },
    );

    if (advErr) throw new Error(advErr.message || JSON.stringify(advErr));

    const currentWave = advData.current_wave;

    const ensureImageReady = async (round: any) => {
      if (round.public_image_url) return round.public_image_url;

      const ext = extname(round.storage_path || round.image_url || ".png");
      const destPath = `${advData.run_id}/${
        round.round_id
      }/${crypto.randomUUID()}${ext}`;

      const imgRes = await fetch(
        round.storage_path
          ? `https://gallery.ultrakidle.online/${round.storage_path}`
          : round.image_url,
      );
      if (!imgRes.ok)
        throw new Error(`Fetch failed for round ${round.round_id}`);

      const fileBuffer = await imgRes.arrayBuffer();

      await r2Client.send(
        new PutObjectCommand({
          Bucket: DEST_BUCKET,
          Key: destPath,
          Body: new Uint8Array(fileBuffer),
          ContentType: `image/${ext.replace(".", "")}`,
        }),
      );

      const publicUrl = `${PUBLIC_DOMAIN}/${destPath}`;
      await supabase
        .from("ig_cybergrind_rounds")
        .update({ public_image_url: publicUrl })
        .eq("id", round.round_id);
      return publicUrl;
    };

    // SYNC: Wave and Wave + 1 images AND Start the clock for current wave
    const syncRounds = advData.rounds.filter(
      (r: any) => r.round_number <= currentWave + 1,
    );
    const currentRoundId = advData.rounds.find(
      (r: any) => r.round_number === currentWave,
    )?.round_id;

    await Promise.all([
      ...syncRounds.map((r: any) => ensureImageReady(r)),
      supabase
        .from("ig_cybergrind_rounds")
        .update({ started_at: new Date().toISOString() })
        .eq("id", currentRoundId),
    ]);

    // ASYNC: Wave + 2
    const bgRound = advData.rounds.find(
      (r: any) => r.round_number === currentWave + 2,
    );
    if (bgRound && !bgRound.public_image_url) {
      const bgTask = ensureImageReady(bgRound).catch((err) =>
        console.error("BG Task Error:", err),
      );
      if (typeof (req as any).waitUntil === "function") {
        (req as any).waitUntil(bgTask);
      }
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: state, error: stateErr } = await userClient.rpc(
      "get_ig_cybergrind_state",
    );
    if (stateErr) throw stateErr;

    if (state.status === "no_run") {
      throw new Error("Run was abandoned or is no longer active.");
    }

    return Response.json(
      {
        ...state,
        current_wave: currentWave,
      },
      { headers: corsHeaders },
    );
  } catch (err) {
    console.error("Function Error:", err);
    return Response.json(
      { error: err.message || String(err) },
      { status: 500, headers: corsHeaders },
    );
  }
});
