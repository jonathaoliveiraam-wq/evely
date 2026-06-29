import { createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { patient_id, diagnosis, short_term_goal, medium_term_goal, long_term_goal } =
    await req.json();

  if (!patient_id || !diagnosis || !short_term_goal || !medium_term_goal || !long_term_goal) {
    return NextResponse.json({ error: "Todos os campos são obrigatórios." }, { status: 400 });
  }

  const supabase = await createAdminClient();

  // Busca o auth_user_id do admin logado para o campo created_by
  const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
  const adminUser = users?.find((u) => u.user_metadata?.role === "admin");
  if (!adminUser) return NextResponse.json({ error: "Admin não encontrado." }, { status: 400 });

  // Salva a avaliação
  const { error: evalError } = await supabase
    .from("evaluations")
    .insert({ patient_id, diagnosis, short_term_goal, medium_term_goal, long_term_goal, created_by: adminUser.id });

  if (evalError) return NextResponse.json({ error: evalError.message }, { status: 400 });

  // Atualiza o diagnóstico e status do paciente
  const { error: patientError } = await supabase
    .from("patients")
    .update({ diagnosis, status: "awaiting_payment" })
    .eq("id", patient_id);

  if (patientError) return NextResponse.json({ error: patientError.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
