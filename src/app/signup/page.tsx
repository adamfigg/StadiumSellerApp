import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { safeNext } from "@/lib/safe-next";
import { SignUpForm } from "@/components/AccountForms";
import { Steps } from "@/components/Steps";

export const metadata: Metadata = { title: "Sign up · Stadium" };

export default async function SignUpPage({ searchParams }: PageProps<"/signup">) {
  const next = safeNext((await searchParams).next);
  if (await getCurrentUser()) redirect(next ?? "/");

  return (
    <div className="mx-auto grid max-w-4xl items-start gap-10 md:grid-cols-[1fr_320px]">
      <section className="panel space-y-6 p-6 sm:p-8">
        <Steps current={0} />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Create your free account</h1>
          <p className="mt-1 text-ink-muted">
            Every account starts as a collector account, so you can post the cards you want right away.
          </p>
        </div>
        <SignUpForm next={next} />
      </section>
      <aside className="space-y-4 text-sm md:pt-8">
        <h2 className="font-semibold">How Stadium works</h2>
        <ol className="space-y-3 text-ink-muted">
          <li>
            <span className="font-medium text-ink">1. Post a want.</span> Name the card, condition and budget.
          </li>
          <li>
            <span className="font-medium text-ink">2. Sellers compete.</span> Every offer is public, so they undercut
            each other, not you.
          </li>
          <li>
            <span className="font-medium text-ink">3. You pick.</span> Accept the deal you like best.
          </li>
        </ol>
        <p className="border-t border-line pt-4 text-ink-muted">
          Want to sell too? Add a seller profile right after sign-up, or any time later.
        </p>
      </aside>
    </div>
  );
}
