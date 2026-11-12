import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Workspace from "./Workspace";

describe("Milestone", () => {
  it("renders the polished public landing screen", () => {
    window.history.pushState({}, "", "/");
    render(<Workspace />);
    expect(screen.getByRole("heading", { name: /clear work.*fair outcomes/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /explore the live demo/i })).toHaveAttribute("href", "/login");
    expect(screen.getByText(/PayPal handles the payment.*People make every decision/i)).toBeInTheDocument();
  });

  it("offers separate freelancer and client demo identities", () => {
    window.history.pushState({}, "", "/login");
    render(<Workspace />);
    expect(screen.getByText("Frankie Morgan")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /client review work/i }));
    expect(screen.getByText("Casey Nguyen")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continue as casey/i })).toBeEnabled();
  });
});
