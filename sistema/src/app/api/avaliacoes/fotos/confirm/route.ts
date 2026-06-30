import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { evaluation_id, paths } = await req.json() as {
    evaluation_id: string;
    paths: { angle: string; path: string }[];
  };

  if (!evaluation_id || !paths?.length) {
    return NextResponse.json({ error: "Parâmetros inválidos." }, { status: 400 });
  }

  const supabase = await createAdminClient();

  for (const { angle, path } of paths) {
    await supabase.from("evaluation_photos")
      .upsert({ evaluation_id, angle, storage_path: path }, { onConflict: "evaluation_id,angle" });
  }

  return NextResponse.json({ ok: true, saved: paths.length });
}
