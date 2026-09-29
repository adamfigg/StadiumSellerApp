import { requireUser } from "@/lib/session";
import { WantForm } from "@/components/WantForm";

export default async function NewWantPage() {
  const user = await requireUser("/wants/new");

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Post a want</h1>
      <p className="mt-1 mb-8 text-ink-muted">
        Tell sellers exactly what you&apos;re after. Matching sellers get an alert, and every offer
        shows up publicly on your post.
      </p>
      <WantForm location={`${user.city}, ${user.state}`} />
    </div>
  );
}
