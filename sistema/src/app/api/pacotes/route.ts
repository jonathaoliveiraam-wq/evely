import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const { patient_id, price_cents, payment_status, start_date, completed_sessions } = body;

  if (!patient_id || !price_cents || !payment_status || !start_date || completed_sessions === undefined) {
    return NextResponse.json({ error: "Campos obrigatórios faltando." }, { status: 400 });
  }

  if (completed_sessions < 0 || completed_sessions > 10) {
    return NextResponse.json({ error: "completed_sessions deve ser entre 0 e 10." }, { status: 400 });
  }

  const supabase = await createAdminClient();

  const { data: pkg, error: pkgError } = await supabase
    .from("packages")
    .insert({
      patient_id,
      price_cents,
      payment_status,
      start_date,
      paid_at: payment_status === "paid" ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (pkgError) {
    return NextResponse.json({ error: pkgError.message }, { status: 400 });
  }

  const now = new Date().toISOString();
  const sessions = Array.from({ length: 10 }, (_, i) => {
    const sessionNumber = i + 1;
    const isCompleted = sessionNumber <= completed_sessions;
    return {
      package_id: pkg.id,
      session_number: sessionNumber,
      // Sessões já feitas usam start_date; as pendentes ficam em 2099 até serem agendadas na agenda
      scheduled_date: isCompleted ? start_date : "2099-12-31",
      scheduled_time: "08:00",
      status: isCompleted ? "completed" : "scheduled",
      completed_at: isCompleted ? now : null,
    };
  });

  const { error: sessionsError } = await supabase.from("sessions").insert(sessions);

  if (sessionsError) {
    await supabase.from("packages").delete().eq("id", pkg.id);
    return NextResponse.json({ error: sessionsError.message }, { status: 400 });
  }

  const { error: patientError } = await supabase
    .from("patients")
    .update({ status: "active" })
    .eq("id", patient_id);

  if (patientError) {
    return NextResponse.json({ error: patientError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, package_id: pkg.id });
}
