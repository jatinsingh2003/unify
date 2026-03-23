import { createServerClient } from "@supabase/ssr";
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = cookies();

  let clerkToken: string | null = null;
  try {
    const authResult = await auth();
    clerkToken = await authResult.getToken({ template: "supabase" });
  } catch {
    // Token not available (unauthenticated or template not set up yet)
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: clerkToken
          ? { Authorization: `Bearer ${clerkToken}` }
          : {},
      },
      cookies: {
        getAll() { return cookieStore.getAll(); },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setAll(cookiesToSet: any[]) {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            cookiesToSet.forEach(({ name, value, options }: any) =>
              cookieStore.set(name, value, options)
            );
          } catch { }
        },
      },
    }
  );
}

export function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll: () => [],
        setAll: () => { },
      },
    }
  );
}