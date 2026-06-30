import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { patient_id } = await req.json();
  if (!patient_id) return NextResponse.json({ error: "patient_id obrigatório." }, { status: 400 });

  const supabase = await createAdminClient();
  const { error } = await supabase
    .from("patients")
    .update({ status: "suspended_travel" })
    .eq("id", patient_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
