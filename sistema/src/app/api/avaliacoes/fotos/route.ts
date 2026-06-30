import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(req: Request) {
  const formData     = await req.formData();
  const evaluation_id = formData.get("evaluation_id") as string;
  const patient_id   = formData.get("patient_id") as string;

  if (!evaluation_id || !patient_id) {
    return NextResponse.json({ error: "evaluation_id e patient_id são obrigatórios." }, { status: 400 });
  }

  const supabase = adminClient();
  const angles   = ["front", "back", "right_side", "left_side"] as const;
  let uploaded   = 0;

  for (const angle of angles) {
    const file = formData.get(`photo_${angle}`) as File | null;
    if (!file || file.size === 0) continue;

    const path = `${patient_id}/${evaluation_id}/${angle}.jpg`;
    const buf  = Buffer.from(await file.arrayBuffer());

    const { error: upErr } = await supabase.storage
      .from("avaliacoes")
      .upload(path, buf, { upsert: true, contentType: "image/jpeg" });

    if (!upErr) {
      await supabase.from("evaluation_photos")
        .upsert({ evaluation_id, angle, storage_path: path }, { onConflict: "evaluation_id,angle" });
      uploaded++;
    }
  }

  return NextResponse.json({ ok: true, uploaded });
}
