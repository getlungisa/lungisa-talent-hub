import { useEffect } from "react";
import { X } from "lucide-react";

export function AboutModal({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-primary/40 px-5 py-8"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-lungisa-title"
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-background p-6 shadow-xl sm:p-8"
      >
        <button
          onClick={onClose}
          aria-label="Close About Lungisa"
          className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-primary"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="pr-10">
          <h2
            id="about-lungisa-title"
            className="font-display text-3xl text-primary"
          >
            About Lungisa
          </h2>

          <div className="mt-6 space-y-6 text-sm leading-relaxed text-primary/80">
            <p>
              Lungisa connects Cape Town coffee and hospitality businesses with
              people who've completed real training but often get overlooked
              because they lack a formal CV or industry contacts. Each
              candidate's trainer personally vouches for the things an
              interview can't show, reliability, attitude, and how someone
              handles a hard shift. We stay involved for the candidate's first
              three months, so a hire actually sticks.
            </p>

            <p>
              Free to browse and interview. A small fee only if you hire, with a
              further fee once the placement's held for 90 days.
            </p>

            <p>
              Lungisa is currently running a pilot in Cape Town.
            </p>

            <p>
              Founded by Neil Choudhary, based in London with strong ties to
              South Africa's coffee and hospitality scene through the pilot's
              Cape Town partners.
            </p>

            <section>
              <h3 className="font-display text-xl text-primary">Contact</h3>
              <p className="mt-2">
                Questions, feedback, or anything else, email{" "}
                
                  href="mailto:hi@lungisa.co"
                  className="text-accent underline-offset-2 hover:underline"
                >
                  hi@lungisa.co
                </a>{" "}
                and we'll get back to you.
              </p>
            </section>

            <section>
              <h3 className="font-display text-xl text-primary">Privacy</h3>
              <p className="mt-2">
                Lungisa is a UK-registered company. We collect and process
                personal information about candidates and businesses in order to
                run the service, following UK GDPR and South Africa's POPIA.
                Candidate information includes what their trainer has personally
                observed during training, we never share a trainer's raw notes,
                only a summary of a candidate's strengths. If you'd like to see
                our full privacy notice, or have any question about how
                information is used, email{" "}
                
                  href="mailto:hi@lungisa.co"
                  className="text-accent underline-offset-2 hover:underline"
                >
                  hi@lungisa.co
                </a>{" "}
                and we'll get back to you within 48 hours.
              </p>
            </section>

            <section>
              <h3 className="font-display text-xl text-primary">
                Company details
              </h3>
              <p className="mt-2">
                Lungisa Limited, company number 17198616, registered in the
                United Kingdom.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
