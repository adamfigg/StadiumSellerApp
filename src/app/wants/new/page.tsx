import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { WantForm } from "@/components/WantForm";

export default async function NewWantPage() {
  const user = await getCurrentUser();

  if (user.role !== "buyer") {
    return (
      <div className="panel mx-auto max-w-lg p-8 text-center">
        <h1 className="text-xl font-semibold">Buyer accounts post wants</h1>
        <p className="mt-2 text-ink-muted">
          Switch to a buyer in the header to try posting, or browse open wants to make offers.
        </p>
        <Link href="/" className="btn-secondary mt-4">
          Browse wants
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Post a want</h1>
      <p className="mt-1 mb-8 text-ink-muted">
        Tell sellers exactly what you&apos;re after. Matching sellers get an alert, and every offer
        shows up publicly on your post.
      </p>
      <WantForm location={`${user.location.city}, ${user.location.state}`} />
    </div>
  );
}
