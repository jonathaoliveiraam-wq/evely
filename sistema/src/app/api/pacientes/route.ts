import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { full_name, phone, guardian_name, birth_date, diagnosis, notes, portal_username, password } =
    await req.json();

  if (!full_name || !phone || !portal_username || !password) {
    return NextResponse.json({ error: "Campos obrigatórios faltando." }, { status: 400 });
  }

  const supabase = await createAdminClient();
  const slug = portal_username.toLowerCase().trim();
  const email = slug.includes("@") ? slug : `${slug}@portal.evelypassinho.com`;

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: "patient" },
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  const { data: patient, error: patientError } = await supabase
    .from("patients")
    .insert({
      full_name,
      phone,
      guardian_name: guardian_name || null,
      birth_date: birth_date || null,
      diagnosis: diagnosis || null,
      notes: notes || null,
      portal_username: portal_username.toLowerCase().trim(),
      auth_user_id: authData.user.id,
      status: "awaiting_evaluation",
    })
    .select()
    .single();

  if (patientError) {
    await supabase.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json({ error: patientError.message }, { status: 400 });
  }

  return NextResponse.json({ patient });
}
