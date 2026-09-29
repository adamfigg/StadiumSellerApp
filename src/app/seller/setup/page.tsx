import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { safeNext } from "@/lib/safe-next";
import { SellerSetupForm } from "@/components/AccountForms";
import { Steps } from "@/components/Steps";

export const metadata: Metadata = { title: "Seller profile · Stadium" };

/** Step 2 of sign-up (`?onboarding=1`), or opt in / edit later from the account menu. */
export default async function SellerSetupPage({ searchParams }: PageProps<"/seller/setup">) {
  const params = await searchParams;
  const next = safeNext(params.next);
  const onboarding = params.onboarding === "1";
  const user = await requireUser("/seller/setup");
  const editing = !!user.seller;

  return (
    <div className="mx-auto max-w-xl">
      <section className="panel space-y-6 p-6 sm:p-8">
        {onboarding && <Steps current={1} />}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {editing ? "Your seller profile" : "Set up your seller profile"}
          </h1>
          <p className="mt-1 text-ink-muted">
            {editing
              ? "Update how you appear on offers and which wants you get alerted about."
              : "Nothing changes about how you buy. This adds the ability to make offers and get alerts."}
          </p>
        </div>
        <SellerSetupForm
          next={next}
          initial={user.seller ?? undefined}
          skipHref={onboarding ? (next ?? "/") : undefined}
        />
      </section>
    </div>
  );
}
