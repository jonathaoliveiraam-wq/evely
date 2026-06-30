import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Cliente puro com service role — bypassa RLS do storage
function adminStorage() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(req: Request) {
  const { evaluation_id, patient_id, angles } = await req.json() as {
    evaluation_id: string;
    patient_id: string;
    angles: string[];
  };

  if (!evaluation_id || !patient_id || !angles?.length) {
    return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
  }

  const supabase = adminStorage();
  const urls: { angle: string; signedUrl: string; path: string }[] = [];

  for (const angle of angles) {
    const path = `${patient_id}/${evaluation_id}/${angle}.jpg`;
    const { data, error } = await supabase.storage
      .from("avaliacoes")
      .createSignedUploadUrl(path);

    if (error || !data) {
      return NextResponse.json(
        { error: `Erro ao gerar URL para ${angle}: ${error?.message}` },
        { status: 500 }
      );
    }

    urls.push({ angle, signedUrl: data.signedUrl, path });
  }

  return NextResponse.json({ urls });
}
