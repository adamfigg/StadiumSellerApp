"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";

/**
 * For visitors without an account: renders its children normally, but any attempt to
 * use them (click, tap, keyboard focus, submit) opens a "sign up free" modal instead.
 */
export function SignUpGate({
  children,
  className,
  next,
}: {
  children: React.ReactNode;
  className?: string;
  /** Where to land after signing up. Defaults to the current page. */
  next?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();
  const back = encodeURIComponent(next ?? pathname);

  const block = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const open = (e: React.SyntheticEvent) => {
    block(e);
    if (!dialog.current?.open) dialog.current?.showModal();
  };

  return (
    <>
      <div
        className={className}
        onPointerDownCapture={block} // stops inputs taking focus on click
        onClickCapture={open}
        onSubmitCapture={open}
        onFocusCapture={(e) => {
          (e.target as HTMLElement).blur(); // blur first so closing the modal doesn't refocus and reopen
          open(e);
        }}
      >
        {children}
      </div>
      <dialog
        ref={dialog}
        aria-labelledby="signup-gate-title"
        onClick={(e) => e.target === dialog.current && dialog.current.close()}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-line bg-surface p-0 text-ink shadow-2xl backdrop:bg-ink/40 backdrop:backdrop-blur-sm"
      >
        <div className="space-y-5 p-6">
          <div className="space-y-2">
            <span className="grid size-10 place-items-center rounded-lg bg-brand text-lg font-semibold text-brand-ink">
              S
            </span>
            <h2 id="signup-gate-title" className="text-xl font-semibold tracking-tight">
              Sign up today. It&apos;s free.
            </h2>
            <p className="text-sm text-ink-muted">
              Anyone can browse Stadium. Create a free account to join in:
            </p>
          </div>
          <ul className="space-y-2 text-sm">
            <li className="flex gap-2">
              <Check /> Post the cards you want and let sellers compete on price
            </li>
            <li className="flex gap-2">
              <Check /> Accept the offer you like, with every price out in the open
            </li>
            <li className="flex gap-2">
              <Check /> Add a seller profile any time to make offers and get alerts
            </li>
          </ul>
          <div className="flex flex-col gap-2">
            <Link href={`/signup?next=${back}`} className="btn-primary py-2.5">
              Create my free account
            </Link>
            <p className="text-center text-sm text-ink-muted">
              Already have one?{" "}
              <Link href={`/signin?next=${back}`} className="font-medium text-brand hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
        <form method="dialog" className="border-t border-line p-3 text-center">
          <button className="text-sm text-ink-muted hover:text-ink">Keep browsing</button>
        </form>
      </dialog>
    </>
  );
}

function Check() {
  return (
    <svg viewBox="0 0 16 16" className="mt-0.5 size-4 shrink-0 text-open" aria-hidden>
      <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
