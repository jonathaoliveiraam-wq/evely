import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { patient_id, days, time } = await req.json();
  if (!patient_id || !days?.length || !time) {
    return NextResponse.json({ error: "Campos obrigatórios faltando." }, { status: 400 });
  }

  const supabase = await createAdminClient();

  const rows = (days as number[]).map((day_of_week: number) => ({
    patient_id,
    day_of_week,
    scheduled_time: time,
    is_active: true,
  }));

  const { error } = await supabase
    .from("patient_recurring_schedules")
    .upsert(rows, { onConflict: "patient_id,day_of_week,scheduled_time" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const patientId = searchParams.get("patient_id");

  const supabase = await createAdminClient();
  let query = supabase
    .from("patient_recurring_schedules")
    .select("*, patients(full_name)")
    .eq("is_active", true);

  if (patientId) query = query.eq("patient_id", patientId);

  const { data, error } = await query.order("day_of_week").order("scheduled_time");
  if (error) return NextResponse.json({ schedules: [] });
  return NextResponse.json({ schedules: data ?? [] });
}
