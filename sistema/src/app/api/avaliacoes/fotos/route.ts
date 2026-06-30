import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const formData     = await req.formData();
  const evaluation_id = formData.get("evaluation_id") as string;
  const patient_id   = formData.get("patient_id") as string;

  if (!evaluation_id || !patient_id) {
    return NextResponse.json({ error: "evaluation_id e patient_id são obrigatórios." }, { status: 400 });
  }

  const supabase = await createAdminClient();

  await supabase.storage.createBucket("avaliacoes", { public: true }).catch(() => {});

  const angles = ["front", "back", "right_side", "left_side"] as const;
  let uploaded = 0;

  for (const angle of angles) {
    const file = formData.get(`photo_${angle}`) as File | null;
    if (!file || file.size === 0) continue;

    const ext  = file.name.split(".").pop() ?? "jpg";
    const path = `${patient_id}/${evaluation_id}/${angle}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error: upErr } = await supabase.storage
      .from("avaliacoes")
      .upload(path, Buffer.from(arrayBuffer), { upsert: true, contentType: file.type });

    if (!upErr) {
      await supabase.from("evaluation_photos")
        .upsert({ evaluation_id, angle, storage_path: path }, { onConflict: "evaluation_id,angle" });
      uploaded++;
    }
  }

  return NextResponse.json({ ok: true, uploaded });
}
