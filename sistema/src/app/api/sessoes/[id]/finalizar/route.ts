import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const {
    evolution_notes,
    activities_notes,
    recommendation_notes,
    was_punctual,
    did_activities,
    location,
    requires_certificate,
    photos,
  } = body;

  const supabase = await createAdminClient();

  const { error } = await supabase
    .from("sessions")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      evolution_notes,
      activities_notes,
      recommendation_notes,
      was_punctual,
      did_activities,
      location,
      requires_certificate,
      photos: photos ?? [],
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
