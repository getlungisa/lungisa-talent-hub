import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AdminBusinesses from "./AdminBusinesses";

const { fetchIsAdminMock, fetchPendingMock, setStatusMock, auth } = vi.hoisted(() => ({
  auth: { user: { id: "admin" } },
  fetchIsAdminMock: vi.fn(),
  fetchPendingMock: vi.fn(),
  setStatusMock: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("@/lungisa/lib/business", () => ({
  fetchIsAdmin: fetchIsAdminMock,
  fetchPendingBusinesses: fetchPendingMock,
  setBusinessStatus: setStatusMock,
}));

const pending = {
  id: "b1",
  name: "<img src=x onerror=alert(1)> Cafe",
  contact_name: "Thandi",
  contact_email: "t@example.com",
  whatsapp_number: "0821234567",
  area: "Sea Point",
  number_of_sites: 2,
  roles_hired: "<script>alert(1)</script>",
  website_or_social: "javascript:alert(1)",
  created_at: new Date().toISOString(),
};

describe("AdminBusinesses", () => {
  beforeEach(() => {
    fetchIsAdminMock.mockReset().mockResolvedValue(true);
    fetchPendingMock.mockReset().mockResolvedValue([pending]);
    setStatusMock.mockReset().mockResolvedValue(undefined);
  });

  it("does not list businesses for non-admins", async () => {
    fetchIsAdminMock.mockResolvedValue(false);
    render(<AdminBusinesses />);
    expect(await screen.findByText("Page not found.")).toBeInTheDocument();
    expect(fetchPendingMock).not.toHaveBeenCalled();
  });

  it("renders user-entered text as text and never as a link or markup", async () => {
    const { container } = render(<AdminBusinesses />);
    expect(await screen.findByText("<img src=x onerror=alert(1)> Cafe")).toBeInTheDocument();
    expect(screen.getByText("<script>alert(1)</script>")).toBeInTheDocument();
    expect(container.querySelector("img, script")).toBeNull();
    expect(screen.getByText("javascript:alert(1)").closest("a")).toBeNull();
  });

  it("approves and rejects through the admin functions and removes the card", async () => {
    render(<AdminBusinesses />);
    fireEvent.click(await screen.findByRole("button", { name: "Approve" }));
    await waitFor(() => expect(setStatusMock).toHaveBeenCalledWith("b1", "approved"));
    expect(await screen.findByText("No businesses waiting for review.")).toBeInTheDocument();

    fetchPendingMock.mockResolvedValue([pending]);
    render(<AdminBusinesses />);
    fireEvent.click((await screen.findAllByRole("button", { name: "Reject" }))[0]);
    await waitFor(() => expect(setStatusMock).toHaveBeenCalledWith("b1", "rejected"));
  });
});
