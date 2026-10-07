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
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-background p-6 sm:p-8"
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
            className="font-display text-3xl text-foreground"
          >
            About Lungisa
          </h2>

          <div className="mt-6 space-y-6 text-sm leading-relaxed text-muted-foreground">
            <p>
              We introduce you to capable young people from Cape Town's
              townships, vouched for by the trainers who know them. Then we
              stay close to you both for the first 90 days.
            </p>

            <ol className="space-y-4">
              <li>
                <h3 className="font-display text-xl text-foreground">
                  1. Vouched for by their trainer
                </h3>
                <p className="mt-1">
                  Every candidate has finished a programme with one of our
                  training partners. Their trainer watched them work every day
                  and tells you what they saw. We never pay trainers per hire,
                  so they have no reason to oversell anyone.
                </p>
              </li>
              <li>
                <h3 className="font-display text-xl text-foreground">
                  2. You interview, you decide
                </h3>
                <p className="mt-1">
                  Interviews are free during the pilot. If you hire, they work
                  for you directly, on your terms.
                </p>
              </li>
              <li>
                <h3 className="font-display text-xl text-foreground">
                  3. We stay close for 90 days
                </h3>
                <p className="mt-1">
                  We check in with you and your new starter twice a week for the
                  first fortnight, then weekly. Placements usually break early,
                  over things like transport or a rough first week, so that's
                  where we put the most effort. You can pause your own
                  check-ins; theirs carry on.
                </p>
              </li>
            </ol>

            <p>
              Lungisa is currently running a pilot in Cape Town.
            </p>

            <p>
              Founded by Neil Choudhary, based in London with strong ties to
              South Africa's coffee and hospitality scene through the pilot's
              Cape Town partners.
            </p>

            <section>
              <h3 className="font-display text-xl text-foreground">Contact</h3>
              <p className="mt-2">
                Questions, feedback, or anything else, email{" "}

                  <a
                  href="mailto:hi@lungisa.co"
                  className="text-primary underline-offset-2 hover:underline"
                >
                  hi@lungisa.co
                </a>{" "}
                and we'll get back to you.
              </p>
            </section>

            <section>
              <h3 className="font-display text-xl text-foreground">Privacy</h3>
              <p className="mt-2">
                Lungisa is a UK-registered company. We collect and process
                personal information about candidates and businesses in order to
                run the service, following UK GDPR and South Africa's POPIA.
                Candidate information includes what their trainer has personally
                observed during training, we never share a trainer's raw notes,
                only a summary of a candidate's strengths. If you'd like to see
                our full privacy notice, or have any question about how
                information is used, email{" "}

                  <a
                  href="mailto:hi@lungisa.co"
                  className="text-primary underline-offset-2 hover:underline"
                >
                  hi@lungisa.co
                </a>{" "}
                and we'll get back to you within 48 hours.
              </p>
            </section>

            <section>
              <h3 className="font-display text-xl text-foreground">
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
