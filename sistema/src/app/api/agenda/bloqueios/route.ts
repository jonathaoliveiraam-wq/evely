import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  if (!date) return NextResponse.json({ slots: [] });

  try {
    const supabase = await createAdminClient();
    const { data, error } = await supabase
      .from("blocked_slots")
      .select("id, slot_time, reason")
      .eq("slot_date", date)
      .order("slot_time");

    if (error) return NextResponse.json({ slots: [] });
    return NextResponse.json({ slots: data ?? [] });
  } catch {
    return NextResponse.json({ slots: [] });
  }
}

export async function POST(req: Request) {
  const { date, time, reason } = await req.json();
  if (!date || !time) return NextResponse.json({ error: "date e time obrigatórios." }, { status: 400 });

  try {
    const supabase = await createAdminClient();
    const { error } = await supabase
      .from("blocked_slots")
      .upsert({ slot_date: date, slot_time: time, reason: reason ?? "" }, { onConflict: "slot_date,slot_time" });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Tabela blocked_slots não existe ainda. Crie via SQL no Supabase." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id obrigatório." }, { status: 400 });

  try {
    const supabase = await createAdminClient();
    const { error } = await supabase.from("blocked_slots").delete().eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro." }, { status: 500 });
  }
}
