import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  if (!date) return NextResponse.json({ slots: [] });

  try {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("blocked_slots")
      .select("id, slot_time, reason, recurring_group_id")
      .eq("slot_date", date)
      .order("slot_time");

    if (error) return NextResponse.json({ slots: [] });
    return NextResponse.json({ slots: data ?? [] });
  } catch {
    return NextResponse.json({ slots: [] });
  }
}

export async function POST(req: Request) {
  const { date, time, reason, recurring } = await req.json();
  if (!date || !time) return NextResponse.json({ error: "date e time obrigatórios." }, { status: 400 });

  try {
    const supabase = await createAdminClient();

    if (recurring) {
      // Cria entradas para as próximas 52 semanas com o mesmo group_id
      const groupId = randomUUID();
      const rows = [];
      const baseDate = new Date(date + "T12:00:00");
      for (let i = 0; i < 52; i++) {
        const d = new Date(baseDate);
        d.setDate(baseDate.getDate() + i * 7);
        rows.push({
          slot_date: d.toISOString().split("T")[0],
          slot_time: time,
          reason: reason ?? "",
          recurring_group_id: groupId,
        });
      }
      const { error } = await supabase.from("blocked_slots").upsert(rows, { onConflict: "slot_date,slot_time" });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      const { error } = await supabase
        .from("blocked_slots")
        .upsert({ slot_date: date, slot_time: time, reason: reason ?? "" }, { onConflict: "slot_date,slot_time" });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro ao bloquear horário." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const groupId = searchParams.get("group_id");

  if (!id && !groupId) return NextResponse.json({ error: "id ou group_id obrigatório." }, { status: 400 });

  try {
    const supabase = await createAdminClient();
    if (groupId) {
      const { error } = await supabase.from("blocked_slots").delete().eq("recurring_group_id", groupId);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else {
      const { error } = await supabase.from("blocked_slots").delete().eq("id", id!);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro." }, { status: 500 });
  }
}
