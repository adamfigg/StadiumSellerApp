import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { safeNext } from "@/lib/safe-next";
import { Steps } from "@/components/Steps";

export const metadata: Metadata = { title: "Welcome · Stadium" };

/** Between the two sign-up steps: the account exists (every account can buy); offer the optional seller profile. */
export default async function WelcomePage({ searchParams }: PageProps<"/signup/welcome">) {
  const next = safeNext((await searchParams).next);
  const user = await requireUser("/signup/welcome");
  if (user.seller) redirect(next ?? "/");

  const sellerHref = `/seller/setup?onboarding=1${next ? `&next=${encodeURIComponent(next)}` : ""}`;

  return (
    <div className="mx-auto max-w-xl">
      <section className="panel space-y-6 p-6 sm:p-8">
        <Steps current={1} />
        <div className="space-y-3">
          <span className="grid size-12 place-items-center rounded-full bg-open-soft text-2xl text-open" aria-hidden>
            ✓
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">
            You are all set up to start buying as a collector!
          </h1>
          <p className="text-ink-muted">
            Welcome, {user.name.split(" ")[0]}. You can post wants and accept offers now.
          </p>
        </div>
        <div className="space-y-4 rounded-xl border border-line bg-surface-2 p-5">
          <p className="font-medium">Are you interested in setting up your seller profile details as well?</p>
          <p className="text-sm text-ink-muted">
            Sellers make public offers on buyers&apos; wants and get alerts when someone posts a card they sell.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link href={sellerHref} className="btn-primary py-2.5">
              Yes, set up my seller profile
            </Link>
            <Link href={next ?? "/"} className="btn-secondary py-2.5">
              Not now, start browsing
            </Link>
          </div>
          <p className="text-xs text-ink-muted">
            You can set it up later from your account menu under &ldquo;Start selling.&rdquo;
          </p>
        </div>
      </section>
    </div>
  );
}
