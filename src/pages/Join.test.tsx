import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Join from "./Join";

const { signInWithOtpMock, registerBusinessMock, authState } = vi.hoisted(() => ({
  signInWithOtpMock: vi.fn(),
  registerBusinessMock: vi.fn(),
  authState: { session: null as unknown, loading: false },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { signInWithOtp: signInWithOtpMock } },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

vi.mock("@/lungisa/lib/business", async () => {
  const actual = await vi.importActual<typeof import("@/lungisa/lib/business")>("@/lungisa/lib/business");
  return { ...actual, registerBusiness: registerBusinessMock };
});

// Radix Checkbox measures itself with ResizeObserver, which jsdom lacks.
vi.stubGlobal(
  "ResizeObserver",
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

function renderJoin() {
  return render(
    <MemoryRouter initialEntries={["/join"]}>
      <Join />
    </MemoryRouter>,
  );
}

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function fillValid() {
  fill("Business name", "Corner Cafe");
  fill("Your name", "Thandi Nkosi");
  fill("Email", "thandi@example.com");
  fill("WhatsApp number", "0821234567");
  fill("Area", "Sea Point");
  fill("Roles you hire for", "Cashier");
}

describe("Join page", () => {
  beforeEach(() => {
    signInWithOtpMock.mockReset().mockResolvedValue({ error: null });
    registerBusinessMock.mockReset().mockResolvedValue("business-1");
    authState.session = null;
    window.localStorage.clear();
  });

  it("shows the exact fee wording and does not submit an invalid form", async () => {
    renderJoin();
    expect(
      screen.getByText("R1,000 on hire. R3,000 at day 90, only if they're still with you."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Join Lungisa" }));

    expect(await screen.findByText("Please enter your business name.")).toBeInTheDocument();
    expect(screen.getByText("Please accept the terms and privacy policy.")).toBeInTheDocument();
    expect(signInWithOtpMock).not.toHaveBeenCalled();
  });

  it("sends a magic link that may create the user and shows the check-your-email state", async () => {
    renderJoin();
    fillValid();
    fireEvent.click(screen.getByLabelText(/R1,000 on hire/));
    fireEvent.click(screen.getByLabelText(/agree to the terms/i));
    fireEvent.click(screen.getByRole("button", { name: "Join Lungisa" }));

    await waitFor(() => expect(signInWithOtpMock).toHaveBeenCalledTimes(1));
    expect(signInWithOtpMock.mock.calls[0][0].email).toBe("thandi@example.com");
    expect(signInWithOtpMock.mock.calls[0][0].options.shouldCreateUser).toBe(true);
    expect(await screen.findByText("Check your email")).toBeInTheDocument();
    expect(registerBusinessMock).not.toHaveBeenCalled();
  });

  it("silently drops submissions that fill the honeypot", async () => {
    renderJoin();
    fillValid();
    fireEvent.click(screen.getByLabelText(/R1,000 on hire/));
    fireEvent.click(screen.getByLabelText(/agree to the terms/i));
    fireEvent.change(document.getElementById("company_website") as HTMLInputElement, {
      target: { value: "http://spam.example" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Join Lungisa" }));

    expect(await screen.findByText("Check your email")).toBeInTheDocument();
    expect(signInWithOtpMock).not.toHaveBeenCalled();
    expect(registerBusinessMock).not.toHaveBeenCalled();
  });

  it("prefills the form from the saved draft after sign-in without auto-submitting", async () => {
    window.localStorage.setItem(
      "lungisa:pending-registration",
      JSON.stringify({
        savedAt: Date.now(),
        draft: {
          businessName: "Corner Cafe",
          contactName: "Thandi",
          email: "thandi@example.com",
          whatsapp: "0821234567",
          area: "Sea Point",
          numberOfSites: "1",
          rolesHired: "Cashier",
          websiteOrSocial: "",
          acceptTerms: true,
          acceptFee: true,
        },
      }),
    );
    authState.session = { user: { id: "u1", email: "thandi@example.com" } };

    renderJoin();

    await waitFor(() => expect(screen.getByLabelText("Business name")).toHaveValue("Corner Cafe"));
    expect(registerBusinessMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Join Lungisa" }));
    await waitFor(() => expect(registerBusinessMock).toHaveBeenCalledTimes(1));
    expect(window.localStorage.getItem("lungisa:pending-registration")).toBeNull();
  });

  it("shows the complete blank form after sign-in when there is no draft", async () => {
    authState.session = { user: { id: "u1", email: "thandi@example.com" } };

    renderJoin();

    for (const label of [
      "Business name",
      "Your name",
      "Email",
      "WhatsApp number",
      "Area",
      "Roles you hire for",
      "Website or Instagram (optional)",
    ]) {
      expect(screen.getByLabelText(label)).toHaveValue("");
    }
    expect(screen.getByLabelText("Number of sites")).toBeInTheDocument();
    expect(
      screen.getByText("R1,000 on hire. R3,000 at day 90, only if they're still with you."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/agree to the terms/i)).toBeInTheDocument();
    expect(document.getElementById("company_website")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Join Lungisa" })).toBeEnabled();
    expect(registerBusinessMock).not.toHaveBeenCalled();
  });
});
