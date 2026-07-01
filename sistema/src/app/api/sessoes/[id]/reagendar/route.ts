import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { date, time } = await req.json();

  if (!date || !time) return NextResponse.json({ error: "date e time obrigatórios." }, { status: 400 });

  const supabase = await createAdminClient();

  const { error } = await supabase
    .from("sessions")
    .update({ scheduled_date: date, scheduled_time: time, status: "rescheduled" })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
