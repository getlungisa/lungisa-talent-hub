import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SignIn from "./SignIn";

const { signInWithOtpMock, verifyOtpMock } = vi.hoisted(() => ({
  signInWithOtpMock: vi.fn(),
  verifyOtpMock: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { signInWithOtp: signInWithOtpMock, verifyOtp: verifyOtpMock } },
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ session: null, loading: false }) }));

function submit() {
  render(
    <MemoryRouter>
      <SignIn />
    </MemoryRouter>,
  );
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "someone@example.com" } });
  fireEvent.click(screen.getByRole("button", { name: "Send code" }));
}

describe("SignIn", () => {
  beforeEach(() => {
    signInWithOtpMock.mockReset();
    verifyOtpMock.mockReset();
    window.sessionStorage.clear();
  });

  const renderSignIn = () =>
    render(
      <MemoryRouter>
        <SignIn />
      </MemoryRouter>,
    );

  it("uses code-only copy and mobile-friendly inputs", () => {
    renderSignIn();
    expect(screen.getByText("Enter your email and we'll send you a 6-digit code.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send code" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Email")).toHaveAttribute("autocomplete", "email");
    expect(document.body).not.toHaveTextContent(/sign-in link/i);
  });

  it("saves the pending email and restores the code step after a reload", async () => {
    signInWithOtpMock.mockResolvedValue({ error: null });
    const { unmount } = render(
      <MemoryRouter>
        <SignIn />
      </MemoryRouter>,
    );
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "someone@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Send code" }));
    const code = await screen.findByLabelText("6-digit code");
    expect(code).toHaveAttribute("inputmode", "numeric");
    expect(code).toHaveAttribute("autocomplete", "one-time-code");
    expect(code).toHaveAttribute("maxlength", "6");
    expect(screen.queryByLabelText("Email")).toBeNull();
    unmount();

    renderSignIn();
    expect(screen.getByLabelText("6-digit code")).toBeInTheDocument();
    expect(screen.queryByLabelText("Email")).toBeNull();
    expect(signInWithOtpMock).toHaveBeenCalledTimes(1);
    verifyOtpMock.mockResolvedValue({ error: null });
    fireEvent.change(screen.getByLabelText("6-digit code"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() =>
      expect(verifyOtpMock).toHaveBeenCalledWith({ email: "someone@example.com", token: "123456", type: "email" }),
    );
    await waitFor(() => expect(window.sessionStorage.length).toBe(0));
  });

  it("ignores a saved entry older than 10 minutes", () => {
    window.sessionStorage.setItem(
      "lungisa-sign-in-pending-code",
      JSON.stringify({ email: "old@example.com", at: Date.now() - 10 * 60 * 1000 - 1 }),
    );
    renderSignIn();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.queryByLabelText("6-digit code")).toBeNull();
    expect(window.sessionStorage.length).toBe(0);
  });

  it("returns to the email form and clears the saved entry for a different email", () => {
    window.sessionStorage.setItem(
      "lungisa-sign-in-pending-code",
      JSON.stringify({ email: "someone@example.com", at: Date.now() }),
    );
    renderSignIn();
    fireEvent.click(screen.getByRole("button", { name: "Use a different email" }));
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.queryByLabelText("6-digit code")).toBeNull();
    expect(window.sessionStorage.length).toBe(0);
  });

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
    expect(await screen.findByText(/we've sent you a 6-digit code/i)).toBeInTheDocument();
    expect(screen.queryByText(/Signups not allowed/i)).toBeNull();
  });

  it("shows a code form after sending the code and enables it only for six digits", async () => {
    signInWithOtpMock.mockResolvedValue({ error: null });
    submit();

    expect(await screen.findByLabelText("6-digit code")).toBeInTheDocument();
    const verifyButton = screen.getByRole("button", { name: "Sign in" });
    expect(verifyButton).toBeDisabled();
    fireEvent.change(screen.getByLabelText("6-digit code"), {
      target: { value: "123 45" },
    });
    expect(screen.getByLabelText("6-digit code")).toHaveValue("12345");
    expect(verifyButton).toBeDisabled();
    fireEvent.paste(screen.getByLabelText("6-digit code"), {
      clipboardData: { getData: () => "123 456" },
    });
    expect(screen.getByLabelText("6-digit code")).toHaveValue("123456");
    expect(verifyButton).toBeEnabled();
  });

  it("verifies the code against the submitted email", async () => {
    signInWithOtpMock.mockResolvedValue({ error: null });
    verifyOtpMock.mockResolvedValue({ error: null });
    submit();
    fireEvent.change(await screen.findByLabelText("6-digit code"), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() =>
      expect(verifyOtpMock).toHaveBeenCalledWith({
        email: "someone@example.com",
        token: "123456",
        type: "email",
      }),
    );
  });

  it("keeps the code form and shows a generic message when verification fails", async () => {
    signInWithOtpMock.mockResolvedValue({ error: null });
    verifyOtpMock.mockResolvedValue({ error: new Error("invalid token") });
    submit();
    fireEvent.change(await screen.findByLabelText("6-digit code"), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByText("That code didn't work. Check it and try again, or request a new one."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("6-digit code")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });

  it("resends a code with the original sign-in options and starts the cooldown", async () => {
    signInWithOtpMock.mockResolvedValue({ error: null });
    submit();
    await screen.findByLabelText("6-digit code");
    fireEvent.click(screen.getByRole("button", { name: "Send a new code" }));

    await waitFor(() => expect(signInWithOtpMock).toHaveBeenCalledTimes(2));
    expect(signInWithOtpMock.mock.calls[1][0]).toEqual({
      email: "someone@example.com",
      options: {
        emailRedirectTo: "https://lungisa.netlify.app",
        shouldCreateUser: false,
      },
    });
    expect(await screen.findByText("A new code is on its way.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Send a new code \(30s\)/ })).toBeDisabled();
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
