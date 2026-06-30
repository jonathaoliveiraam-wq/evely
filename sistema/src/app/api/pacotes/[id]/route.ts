import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const { action } = body;

  if (action !== "desativar" && action !== "reativar") {
    return NextResponse.json({ error: "Action deve ser 'desativar' ou 'reativar'." }, { status: 400 });
  }

  const supabase = await createAdminClient();

  const { data: pkg, error: pkgError } = await supabase
    .from("packages")
    .select("patient_id")
    .eq("id", id)
    .single();

  if (pkgError || !pkg) {
    return NextResponse.json({ error: "Pacote não encontrado." }, { status: 404 });
  }

  const newStatus = action === "desativar" ? "suspended_travel" : "active";

  const { error: patientError } = await supabase
    .from("patients")
    .update({ status: newStatus })
    .eq("id", pkg.patient_id);

  if (patientError) {
    return NextResponse.json({ error: patientError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
