import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith("/api") || pathname === "/login") {
    return response;
  }

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const role = user.user_metadata?.role as "admin" | "patient" | undefined;

  if (pathname === "/") {
    if (role === "admin")   return NextResponse.redirect(new URL("/gestao", request.url));
    if (role === "patient") return NextResponse.redirect(new URL("/portal", request.url));
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (role === "admin" && pathname.startsWith("/portal")) {
    return NextResponse.redirect(new URL("/gestao", request.url));
  }

  if (role === "patient" && pathname.startsWith("/gestao")) {
    return NextResponse.redirect(new URL("/portal", request.url));
  }

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
