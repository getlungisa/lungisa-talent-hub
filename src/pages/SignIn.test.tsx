import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SignIn from "./SignIn";

const { signInWithOtpMock } = vi.hoisted(() => ({ signInWithOtpMock: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { signInWithOtp: signInWithOtpMock } },
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ session: null, loading: false }) }));

function submit() {
  render(
    <MemoryRouter>
      <SignIn />
    </MemoryRouter>,
  );
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "someone@example.com" } });
  fireEvent.click(screen.getByRole("button", { name: "Send magic link" }));
}

describe("SignIn", () => {
  beforeEach(() => signInWithOtpMock.mockReset());

  it("never creates users for unknown emails", async () => {
    signInWithOtpMock.mockResolvedValue({ error: null });
    submit();
    await waitFor(() => expect(signInWithOtpMock).toHaveBeenCalled());
    expect(signInWithOtpMock.mock.calls[0][0].options.shouldCreateUser).toBe(false);
  });

  it("does not reveal whether an email has an account", async () => {
    signInWithOtpMock.mockResolvedValue({
      error: { code: "otp_disabled", message: "Signups not allowed for otp" },
    });
    submit();
    expect(await screen.findByText(/we've sent you a link/i)).toBeInTheDocument();
    expect(screen.queryByText(/Signups not allowed/i)).toBeNull();
  });

  it("links to /join for new businesses", () => {
    render(
      <MemoryRouter>
        <SignIn />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: "Join Lungisa" })).toHaveAttribute("href", "/join");
  });
});
