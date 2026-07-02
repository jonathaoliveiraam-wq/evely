import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Arquivo não enviado." }, { status: 400 });

  const admin = await createAdminClient();

  const { data: patient } = await admin
    .from("patients")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();
  if (!patient) return NextResponse.json({ error: "Paciente não encontrado." }, { status: 404 });

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `avatars/${patient.id}.${ext}`;
  const buffer = await file.arrayBuffer();

  const { error: uploadError } = await admin.storage
    .from("patient-photos")
    .upload(path, buffer, { contentType: file.type, upsert: true });

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: { publicUrl } } = admin.storage
    .from("patient-photos")
    .getPublicUrl(path);

  const urlWithBust = `${publicUrl}?t=${Date.now()}`;

  await admin.from("patients").update({ avatar_url: urlWithBust }).eq("id", patient.id);

  return NextResponse.json({ url: urlWithBust });
}
