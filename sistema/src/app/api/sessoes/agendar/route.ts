import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { patient_id, date, time } = await req.json();
  if (!patient_id || !date || !time) {
    return NextResponse.json({ error: "patient_id, date e time são obrigatórios." }, { status: 400 });
  }

  const supabase = await createAdminClient();

  // Find most recent active package for the patient
  const { data: pkg, error: pkgErr } = await supabase
    .from("packages")
    .select("id")
    .eq("patient_id", patient_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (pkgErr || !pkg) {
    return NextResponse.json({ error: "Nenhum pacote ativo encontrado para esse paciente." }, { status: 400 });
  }

  // Find next available session (lowest session_number with status 'scheduled')
  const { data: nextSession, error: sessErr } = await supabase
    .from("sessions")
    .select("id, session_number")
    .eq("package_id", pkg.id)
    .eq("status", "scheduled")
    .order("session_number")
    .limit(1)
    .single();

  if (sessErr || !nextSession) {
    return NextResponse.json({ error: "Nenhuma sessão disponível neste pacote." }, { status: 400 });
  }

  const { error: updateErr } = await supabase
    .from("sessions")
    .update({ scheduled_date: date, scheduled_time: time })
    .eq("id", nextSession.id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, session_id: nextSession.id, session_number: nextSession.session_number });
}
