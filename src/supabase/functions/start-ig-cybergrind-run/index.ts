import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.208.0/crypto/mod.ts";
import { extname } from "https://deno.land/std@0.208.0/path/mod.ts";
import {
  S3Client,
  PutObjectCommand,
} from "https://esm.sh/@aws-sdk/client-s3@3.484.0";

const DEST_BUCKET = "inferno-cybergrind";
const PUBLIC_DOMAIN = "https://cgimages.ultrakidle.online";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${Deno.env.get("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: Deno.env.get("R2_ACCESS_KEY_ID")!,
    secretAccessKey: Deno.env.get("R2_SECRET_ACCESS_KEY")!,
  },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization")!;
  const body = await req.json().catch(() => ({}));
  const version = body.version;
  const start_wave = body.start_wave ?? 1;

  try {
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !user) throw new Error("Invalid token");

    const { data: runData, error: runErr } = await supabase.rpc(
      "start_ig_cybergrind_run",
      {
        version,
        start_wave,
        caller_id: user.id,
      }
    );

  if (runErr) throw runErr;

    const roundIds = runData.rounds.map((r: any) => r.round_id);
    const { data: roundsInfo, error: fetchErr } = await supabase
      .from("ig_cybergrind_rounds")
      .select(`
        id,
        round_number,
        image_submissions ( storage_path, image_url ),
        submitter_profiles ( discord_name, discord_avatar_url )
      `)
      .in("id", roundIds);

    if (fetchErr) throw fetchErr;

    const processedRounds = await Promise.all(
      roundsInfo.map(async (round) => {
        const sub = round.image_submissions;
        const ext = extname(sub.storage_path || sub.image_url || ".png");
        const destPath = `${runData.run_id}/${round.id}/${crypto.randomUUID()}${ext}`;

        const res = await fetch(
          sub.storage_path
            ? `https://gallery.ultrakidle.online/${sub.storage_path}`
            : sub.image_url
        );
        const fileBuffer = await res.arrayBuffer();

        await r2Client.send(new PutObjectCommand({
          Bucket: DEST_BUCKET,
          Key: destPath,
          Body: new Uint8Array(fileBuffer),
          ContentType: `image/${ext.replace(".", "")}`,
        }));

        const publicUrl = `${PUBLIC_DOMAIN}/${destPath}`;
        await supabase.from("ig_cybergrind_rounds").update({ public_image_url: publicUrl }).eq("id", round.id);

        return {
          round_id: round.id,
          round_number: round.round_number,
          public_image_url: publicUrl,
          submitter_name: round.submitter_profiles?.discord_name,
          submitter_avatar: round.submitter_profiles?.discord_avatar_url,
        };
      })
    );

    return Response.json({
      run_id: runData.run_id,
      rounds: processedRounds.sort((a, b) => a.round_number - b.round_number),
      started_at: runData.started_at,
      is_first_round: true,
    }, { headers: corsHeaders });
  } catch (err) {
    console.error(err);
    return Response.json({ error: String(err) }, { status: 500, headers: corsHeaders });
  }
});
