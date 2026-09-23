import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { Shell } from "./Shell";

vi.mock("../store", () => ({
  useLungisa: () => ({
    employerName: "Test Business",
  }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    signOut: vi.fn(),
  }),
}));

describe("Shell", () => {
  it("shows only the dashboard tab for training partners", () => {
    render(
      <MemoryRouter>
        <Shell
          active="dashboard"
          isTrainingPartner={true}
          onNavigate={vi.fn()}
        >
          <div>content</div>
        </Shell>
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: "Dashboard" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Candidates" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Activity" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Placements" }),
    ).not.toBeInTheDocument();
  });

  it("hides restricted tabs while the role is still loading", () => {
    render(
      <MemoryRouter>
        <Shell
          active="dashboard"
          isTrainingPartner={null}
          onNavigate={vi.fn()}
        >
          <div>content</div>
        </Shell>
      </MemoryRouter>,
    );

    expect(screen.getByRole("button", { name: "Dashboard" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Candidates" }),
    ).not.toBeInTheDocument();
  });
});
