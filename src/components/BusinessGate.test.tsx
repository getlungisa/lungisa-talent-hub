import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BusinessGate } from "./BusinessGate";

const { fetchOwnBusinessMock, registerBusinessMock, childRender, auth } = vi.hoisted(() => ({
  auth: { user: { id: "u1", email: "o@example.com" }, signOut: () => Promise.resolve() },
  fetchOwnBusinessMock: vi.fn(),
  registerBusinessMock: vi.fn(),
  childRender: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => auth,
}));

vi.mock("@/lungisa/lib/needs", () => ({ fetchOwnBusiness: fetchOwnBusinessMock }));

vi.mock("@/lungisa/lib/business", async () => {
  const actual = await vi.importActual<typeof import("@/lungisa/lib/business")>("@/lungisa/lib/business");
  return { ...actual, registerBusiness: registerBusinessMock };
});

function Candidates() {
  childRender();
  return <p>candidate list</p>;
}

function renderGate() {
  return render(
    <MemoryRouter>
      <BusinessGate>
        <Candidates />
      </BusinessGate>
    </MemoryRouter>,
  );
}

describe("BusinessGate", () => {
  beforeEach(() => {
    fetchOwnBusinessMock.mockReset();
    registerBusinessMock.mockReset();
    childRender.mockReset();
    window.localStorage.clear();
  });

  it("renders the app for approved businesses", async () => {
    fetchOwnBusinessMock.mockResolvedValue({ id: "b", name: "Acme", contact_email: "", status: "approved" });
    renderGate();
    expect(await screen.findByText("candidate list")).toBeInTheDocument();
  });

  it("shows the review screen for pending businesses without mounting candidate screens", async () => {
    fetchOwnBusinessMock.mockResolvedValue({ id: "b", name: "Acme", contact_email: "", status: "pending" });
    renderGate();
    expect(await screen.findByText("We're reviewing your details")).toBeInTheDocument();
    expect(childRender).not.toHaveBeenCalled();
  });

  it("shows the rejected screen with the contact address", async () => {
    fetchOwnBusinessMock.mockResolvedValue({ id: "b", name: "Acme", contact_email: "", status: "rejected" });
    renderGate();
    expect(await screen.findByText("We couldn't approve your business")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "hi@lungisa.co" })).toHaveAttribute("href", "mailto:hi@lungisa.co");
    expect(childRender).not.toHaveBeenCalled();
  });

  it("sends users without a business to /join and never creates one", async () => {
    fetchOwnBusinessMock.mockResolvedValue(null);
    renderGate();
    expect(await screen.findByRole("link", { name: "Join Lungisa" })).toHaveAttribute("href", "/join");
    expect(registerBusinessMock).not.toHaveBeenCalled();
    expect(childRender).not.toHaveBeenCalled();
  });

  it("fails closed when the business cannot be loaded", async () => {
    fetchOwnBusinessMock.mockRejectedValue(new Error("boom"));
    renderGate();
    expect(await screen.findByText("Something went wrong")).toBeInTheDocument();
    expect(childRender).not.toHaveBeenCalled();
  });

  it("finishes a saved /join registration when the user lands on the dashboard", async () => {
    window.localStorage.setItem(
      "lungisa:pending-registration",
      JSON.stringify({ savedAt: Date.now(), draft: { businessName: "Acme", email: "o@example.com" } }),
    );
    fetchOwnBusinessMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "b", name: "Acme", contact_email: "", status: "pending" });
    registerBusinessMock.mockResolvedValue("b");
    renderGate();
    await waitFor(() => expect(registerBusinessMock).toHaveBeenCalled());
    expect(await screen.findByText("We're reviewing your details")).toBeInTheDocument();
  });
});
