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
  fireEvent.click(screen.getByRole("button", { name: "Send sign-in link" }));
}

describe("SignIn", () => {
  beforeEach(() => {
    signInWithOtpMock.mockReset();
    verifyOtpMock.mockReset();
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
    expect(await screen.findByText(/we've sent you a link and a 6-digit code/i)).toBeInTheDocument();
    expect(screen.queryByText(/Signups not allowed/i)).toBeNull();
  });

  it("shows a code form after sending the sign-in link and enables it only for six digits", async () => {
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
