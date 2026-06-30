import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { evaluation_id, patient_id, angles } = await req.json() as {
    evaluation_id: string;
    patient_id: string;
    angles: string[];
  };

  if (!evaluation_id || !patient_id || !angles?.length) {
    return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
  }

  const supabase = await createAdminClient();

  const urls: { angle: string; signedUrl: string; path: string }[] = [];

  for (const angle of angles) {
    const path = `${patient_id}/${evaluation_id}/${angle}.jpg`;
    const { data, error } = await supabase.storage
      .from("avaliacoes")
      .createSignedUploadUrl(path);

    if (error || !data) {
      return NextResponse.json({ error: `Erro ao gerar URL para ${angle}: ${error?.message}` }, { status: 500 });
    }

    urls.push({ angle, signedUrl: data.signedUrl, path });
  }

  return NextResponse.json({ urls });
}
