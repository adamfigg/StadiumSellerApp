import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { safeNext } from "@/lib/safe-next";
import { SignInForm } from "@/components/AccountForms";

export const metadata: Metadata = { title: "Sign in · Stadium" };

export default async function SignInPage({ searchParams }: PageProps<"/signin">) {
  const next = safeNext((await searchParams).next);
  if (await getCurrentUser()) redirect(next ?? "/");

  return (
    <div className="mx-auto max-w-md">
      <section className="panel space-y-6 p-6 sm:p-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-1 text-ink-muted">Sign in to post wants, make offers and check your alerts.</p>
        </div>
        <SignInForm next={next} />
      </section>
    </div>
  );
}
