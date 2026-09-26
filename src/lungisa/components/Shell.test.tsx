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
    expect(screen.getByTestId("primary-nav-group")).not.toHaveClass(
      "lg:w-[70%]",
      "lg:justify-between",
      "lg:gap-0",
    );
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

  it("keeps About separate while primary nav items stay grouped", () => {
    render(
      <MemoryRouter>
        <Shell
          active="dashboard"
          isTrainingPartner={false}
          onNavigate={vi.fn()}
        >
          <div>content</div>
        </Shell>
      </MemoryRouter>,
    );

    const primaryGroup = screen.getByTestId("primary-nav-group");
    const aboutButton = screen.getByRole("button", { name: "About" });

    expect(primaryGroup).toHaveClass("lg:w-[70%]", "lg:justify-between", "lg:gap-0");
    expect(primaryGroup).not.toContainElement(aboutButton);
    expect(aboutButton).toHaveClass("ml-auto");
  });
});
