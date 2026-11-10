import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Join from "./Join";

const { signInWithOtpMock, verifyOtpMock, registerBusinessMock, invokeMock, rpcMock, authState } = vi.hoisted(() => ({
  signInWithOtpMock: vi.fn(),
  verifyOtpMock: vi.fn(),
  registerBusinessMock: vi.fn(),
  invokeMock: vi.fn(),
  rpcMock: vi.fn(),
  authState: { session: null as unknown, loading: false },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { signInWithOtp: signInWithOtpMock, verifyOtp: verifyOtpMock },
    functions: { invoke: invokeMock },
    rpc: rpcMock,
  },
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
  beforeEach(async () => {
    signInWithOtpMock.mockReset().mockResolvedValue({ error: null });
    verifyOtpMock.mockReset();
    // Exercise the real registerBusiness helper; only the Supabase client is faked.
    const actual = await vi.importActual<typeof import("@/lungisa/lib/business")>("@/lungisa/lib/business");
    registerBusinessMock.mockReset().mockImplementation(actual.registerBusiness);
    rpcMock.mockReset().mockResolvedValue({ data: "business-1", error: null });
    invokeMock.mockReset().mockResolvedValue({ data: null, error: null });
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
    expect(
      screen.getByText("We've sent a link and a 6-digit code to confirm your email. Open the link on this device, or enter the code below, to finish joining."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("6-digit code")).toBeInTheDocument();
    expect(registerBusinessMock).not.toHaveBeenCalled();
  });

  it("enables code verification only after six digits are entered", async () => {
    renderJoin();
    fillValid();
    fireEvent.click(screen.getByLabelText(/R1,000 on hire/));
    fireEvent.click(screen.getByLabelText(/agree to the terms/i));
    fireEvent.click(screen.getByRole("button", { name: "Join Lungisa" }));
    await screen.findByLabelText("6-digit code");

    const continueButton = screen.getByRole("button", { name: "Continue" });
    expect(continueButton).toBeDisabled();
    fireEvent.change(screen.getByLabelText("6-digit code"), {
      target: { value: "12345" },
    });
    expect(continueButton).toBeDisabled();
    fireEvent.change(screen.getByLabelText("6-digit code"), {
      target: { value: "123456" },
    });
    expect(continueButton).toBeEnabled();
  });

  it("verifies the code against the submitted email", async () => {
    verifyOtpMock.mockResolvedValue({ error: null });
    renderJoin();
    fillValid();
    fireEvent.click(screen.getByLabelText(/R1,000 on hire/));
    fireEvent.click(screen.getByLabelText(/agree to the terms/i));
    fireEvent.click(screen.getByRole("button", { name: "Join Lungisa" }));
    fireEvent.change(await screen.findByLabelText("6-digit code"), {
      target: { value: "654321" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() =>
      expect(verifyOtpMock).toHaveBeenCalledWith({
        email: "thandi@example.com",
        token: "654321",
        type: "email",
      }),
    );
  });

  it("keeps the code form and shows a generic message when verification fails", async () => {
    verifyOtpMock.mockResolvedValue({ error: new Error("invalid token") });
    renderJoin();
    fillValid();
    fireEvent.click(screen.getByLabelText(/R1,000 on hire/));
    fireEvent.click(screen.getByLabelText(/agree to the terms/i));
    fireEvent.click(screen.getByRole("button", { name: "Join Lungisa" }));
    fireEvent.change(await screen.findByLabelText("6-digit code"), {
      target: { value: "654321" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(
      await screen.findByText("That code didn't work. Check it and try again, or request a new one."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("6-digit code")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
  });

  it("resends a code with the original join options and starts the cooldown", async () => {
    renderJoin();
    fillValid();
    fireEvent.click(screen.getByLabelText(/R1,000 on hire/));
    fireEvent.click(screen.getByLabelText(/agree to the terms/i));
    fireEvent.click(screen.getByRole("button", { name: "Join Lungisa" }));
    await screen.findByLabelText("6-digit code");
    fireEvent.click(screen.getByRole("button", { name: "Send a new code" }));

    await waitFor(() => expect(signInWithOtpMock).toHaveBeenCalledTimes(2));
    expect(signInWithOtpMock.mock.calls[1][0]).toEqual({
      email: "thandi@example.com",
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/join`,
      },
    });
    expect(await screen.findByText("A new code is on its way.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Send a new code \(30s\)/ })).toBeDisabled();
  });

  it("returns to the saved registration form after code authentication", async () => {
    verifyOtpMock.mockResolvedValue({ error: null });
    const view = renderJoin();
    fillValid();
    fireEvent.click(screen.getByLabelText(/R1,000 on hire/));
    fireEvent.click(screen.getByLabelText(/agree to the terms/i));
    fireEvent.click(screen.getByRole("button", { name: "Join Lungisa" }));
    fireEvent.change(await screen.findByLabelText("6-digit code"), {
      target: { value: "654321" },
    });
    authState.session = { user: { id: "u1", email: "thandi@example.com" } };
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() =>
      expect(screen.getByLabelText("Business name")).toHaveValue("Corner Cafe"),
    );
    expect(registerBusinessMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Join Lungisa" }));
    await waitFor(() => expect(registerBusinessMock).toHaveBeenCalledTimes(1));
    expect(window.localStorage.getItem("lungisa:pending-registration")).toBeNull();
    view.unmount();
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
    expect(rpcMock).toHaveBeenCalledWith("register_business", expect.any(Object));
    await waitFor(() =>
      expect(invokeMock).toHaveBeenCalledWith("notify-new-business", {
        body: { businessId: "business-1" },
      }),
    );
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
