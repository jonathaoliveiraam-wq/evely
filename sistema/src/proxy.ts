import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

const supabaseConfigured =
  SUPABASE_URL.startsWith("http") && SUPABASE_ANON.length > 10;

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;

  // Rotas sempre públicas
  if (pathname.startsWith("/api") || pathname === "/login") {
    return response;
  }

  // Sem Supabase configurado → deixa passar (modo desenvolvimento)
  if (!supabaseConfigured) {
    return response;
  }

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Sem sessão → login
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const role = user.user_metadata?.role as "admin" | "patient" | undefined;

  // Raiz → redireciona conforme role
  if (pathname === "/") {
    if (role === "admin") return NextResponse.redirect(new URL("/gestao", request.url));
    if (role === "patient") return NextResponse.redirect(new URL("/portal", request.url));
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Admin → só /gestao
  if (role === "admin" && pathname.startsWith("/portal")) {
    return NextResponse.redirect(new URL("/gestao", request.url));
  }

  // Paciente → só /portal
  if (role === "patient" && pathname.startsWith("/gestao")) {
    return NextResponse.redirect(new URL("/portal", request.url));
  }

  // Paciente: controla acesso conforme status
  if (role === "patient" && pathname.startsWith("/portal")) {
    const { data: patient } = await supabase
      .from("patients")
      .select("status")
      .eq("auth_user_id", user.id)
      .single();

    const status = patient?.status;

    if (status === "awaiting_evaluation" && pathname !== "/portal/aguardando-avaliacao") {
      return NextResponse.redirect(new URL("/portal/aguardando-avaliacao", request.url));
    }

    if (status === "awaiting_payment" && pathname !== "/portal/aguardando-pagamento") {
      return NextResponse.redirect(new URL("/portal/aguardando-pagamento", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
