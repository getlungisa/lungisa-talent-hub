import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Placements } from "./Placements";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock("../lib/dashboard", () => ({
  fetchDashboardPlacements: vi.fn(),
}));

describe("Placements", () => {
  it("uses the requested page-heading typography", () => {
    render(<Placements />);

    expect(screen.getByRole("heading", { name: "Active placements" })).toHaveClass(
      "text-[28px]",
      "sm:text-[32px]",
      "font-semibold",
      "tracking-[-0.01em]",
    );
  });
});
