import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const formData = await req.formData();

  const patient_id       = formData.get("patient_id") as string;
  const diagnosis        = formData.get("diagnosis") as string;
  const short_term_goal  = formData.get("short_term_goal") as string;
  const medium_term_goal = formData.get("medium_term_goal") as string;
  const long_term_goal   = formData.get("long_term_goal") as string;

  if (!patient_id || !diagnosis || !short_term_goal || !medium_term_goal || !long_term_goal) {
    return NextResponse.json({ error: "Todos os campos são obrigatórios." }, { status: 400 });
  }

  const supabase = await createAdminClient();

  const { data: { users } } = await supabase.auth.admin.listUsers();
  const adminUser = users?.find((u) => u.user_metadata?.role === "admin");
  if (!adminUser) return NextResponse.json({ error: "Admin não encontrado." }, { status: 400 });

  const { data: evaluation, error: evalError } = await supabase
    .from("evaluations")
    .insert({ patient_id, diagnosis, short_term_goal, medium_term_goal, long_term_goal, created_by: adminUser.id })
    .select("id")
    .single();

  if (evalError) return NextResponse.json({ error: evalError.message }, { status: 400 });

  await supabase.from("patients").update({ diagnosis, status: "awaiting_payment" }).eq("id", patient_id);

  // Garante que o bucket existe (público para leitura)
  await supabase.storage.createBucket("avaliacoes", { public: true }).catch(() => {});

  const angles = ["front", "back", "right_side", "left_side"] as const;
  for (const angle of angles) {
    const file = formData.get(`photo_${angle}`) as File | null;
    if (!file || file.size === 0) continue;

    const ext  = file.name.split(".").pop() ?? "jpg";
    const path = `${patient_id}/${evaluation.id}/${angle}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error: upErr } = await supabase.storage
      .from("avaliacoes")
      .upload(path, Buffer.from(arrayBuffer), { upsert: true, contentType: file.type });

    if (!upErr) {
      await supabase.from("evaluation_photos").insert({ evaluation_id: evaluation.id, angle, storage_path: path });
    }
  }

  return NextResponse.json({ ok: true });
}
