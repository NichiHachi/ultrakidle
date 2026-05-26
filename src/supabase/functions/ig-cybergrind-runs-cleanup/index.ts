import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "npm:@aws-sdk/client-s3";

const BUCKET = "inferno-cybergrind";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${Deno.env.get("R2_ACCOUNT_ID")!}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: Deno.env.get("R2_ACCESS_KEY_ID")!,
    secretAccessKey: Deno.env.get("R2_SECRET_ACCESS_KEY")!,
  },
});

async function listAllObjects(prefix: string): Promise<string[]> {
  const keys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const res = await s3.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );

    if (res.Contents) {
      for (const obj of res.Contents) {
        if (obj.Key) keys.push(obj.Key);
      }
    }

    continuationToken = res.IsTruncated
      ? res.NextContinuationToken
      : undefined;
  } while (continuationToken);

  return keys;
}

async function deleteAllObjects(keys: string[]): Promise<number> {
  if (keys.length === 0) return 0;

  // DeleteObjects supports max 1000 keys per request
  const batches: string[][] = [];
  for (let i = 0; i < keys.length; i += 1000) {
    batches.push(keys.slice(i, i + 1000));
  }

  let deleted = 0;

  for (const batch of batches) {
    const res = await s3.send(
      new DeleteObjectsCommand({
        Bucket: BUCKET,
        Delete: {
          Objects: batch.map((Key) => ({ Key })),
          Quiet: true,
        },
      }),
    );

    if (res.Errors && res.Errors.length > 0) {
      console.error("Delete errors:", JSON.stringify(res.Errors));
      throw new Error(
        `Failed to delete ${res.Errors.length} objects: ${res.Errors[0].Message}`,
      );
    }

    deleted += batch.length;
  }

  return deleted;
}

Deno.serve(async (req) => {
  const authHeader = req.headers.get("Authorization");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (authHeader !== `Bearer ${serviceKey}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const threshold = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

    const { data: runs, error: fetchErr } = await supabase
      .from("ig_cybergrind_runs")
      .select("id")
      .neq("status", "active")
      .is("cleaned_at", null)
      .lt("created_at", threshold);

    if (fetchErr) throw fetchErr;

    if (!runs || runs.length === 0) {
      return Response.json({ message: "No expired runs to clean." });
    }

    const results = [];

    for (const run of runs) {
      const keys = await listAllObjects(`${run.id}/`);
      console.log(`Run ${run.id}: found ${keys.length} objects`);

      const deleted = await deleteAllObjects(keys);

      const { error: updateErr } = await supabase
        .from("ig_cybergrind_runs")
        .update({ cleaned_at: new Date().toISOString() })
        .eq("id", run.id);

      if (updateErr) throw updateErr;

      results.push({ run_id: run.id, deleted });
    }

    return Response.json({
      processed_runs: runs.length,
      details: results,
    });
  } catch (err) {
    console.error(err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
});
