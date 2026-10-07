import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Seam } from "./Seam";

describe("Seam", () => {
  it("renders one stitch per check-in with an accessible label", () => {
    render(<Seam startedDaysAgo={4} startedAt="2026-01-01" firstName="Sipho" />);

    expect(screen.getAllByTestId("seam-stitch")).toHaveLength(16);
    // Day 5: check-in days 0, 1 and 3 have passed.
    expect(
      screen.getAllByTestId("seam-stitch").filter((s) => s.dataset.passed === "true"),
    ).toHaveLength(3);
    expect(screen.getByRole("img")).toHaveAttribute(
      "aria-label",
      expect.stringContaining("Day 5 of 90"),
    );
    expect(screen.getByText("Day 5 of 90")).toBeInTheDocument();
    expect(screen.getByText(/Next check-in around /)).toBeInTheDocument();
    expect(
      screen.getByText(/R3,000 at day 90 \(.+\), only if Sipho is still with you\./),
    ).toBeInTheDocument();
  });

  it("omits dates and names when the data is missing", () => {
    render(<Seam startedDaysAgo={0} />);

    expect(screen.queryByText(/Next check-in/)).not.toBeInTheDocument();
    expect(screen.queryByText(/R3,000/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\[/)).not.toBeInTheDocument();
  });

  it("fills the day 90 ring once reached", () => {
    render(<Seam startedDaysAgo={200} startedAt="2026-01-01" firstName="A" />);

    expect(screen.getByTestId("seam-day-90")).toHaveAttribute("data-reached", "true");
    expect(screen.getByText("Day 90 reached")).toBeInTheDocument();
    expect(screen.queryByText(/Day \d+ of 90/)).not.toBeInTheDocument();
  });
});
