import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "https://esm.sh/@aws-sdk/client-s3@3.484.0";

const DEST_BUCKET = "inferno-cybergrind";

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
  const authHeader = req.headers.get("Authorization");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (authHeader !== `Bearer ${serviceKey}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: runs, error: fetchErr } = await supabase
      .from("ig_cybergrind_runs")
      .select("id")
      .neq("status", "active")
      .lt("created_at", oneDayAgo);

    if (fetchErr) throw fetchErr;

    if (!runs || runs.length === 0) {
      return Response.json({ message: "No expired runs to clean." });
    }

    const results = await Promise.all(
      runs.map(async (run) => {
        const listCommand = new ListObjectsV2Command({
          Bucket: DEST_BUCKET,
          Prefix: `${run.id}/`,
        });

        const list = await r2Client.send(listCommand);

        if (list.Contents && list.Contents.length > 0) {
          const deleteCommand = new DeleteObjectsCommand({
            Bucket: DEST_BUCKET,
            Delete: {
              Objects: list.Contents.map((obj) => ({ Key: obj.Key })),
            },
          });

          await r2Client.send(deleteCommand);
          return { run_id: run.id, deleted: list.Contents.length };
        }

        return { run_id: run.id, deleted: 0 };
      })
    );

    return Response.json({
      processed_runs: runs.length,
      details: results,
    });
  } catch (err) {
    console.error(err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
});
