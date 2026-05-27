import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import LandingPage from "../components/LandingPage";

describe("LandingPage", () => {
  it("renders the headline", () => {
    render(<LandingPage onLogin={() => {}} />);
    expect(screen.getByText("Automated Codebase Due Diligence")).toBeDefined();
  });

  it("renders all three feature cards", () => {
    render(<LandingPage onLogin={() => {}} />);
    expect(screen.getByText("Security Audit")).toBeDefined();
    expect(screen.getByText("Market Benchmarking")).toBeDefined();
    expect(screen.getByText("Valuation Engine")).toBeDefined();
  });

  it("calls onLogin when Login button clicked", () => {
    const onLogin = vi.fn();
    render(<LandingPage onLogin={onLogin} />);
    fireEvent.click(screen.getByText("Login with GitHub"));
    expect(onLogin).toHaveBeenCalledTimes(1);
  });

  it("calls onLogin when CTA button clicked", () => {
    const onLogin = vi.fn();
    render(<LandingPage onLogin={onLogin} />);
    fireEvent.click(screen.getByText("Get Started For Free"));
    expect(onLogin).toHaveBeenCalledTimes(1);
  });

  it("renders the Grader branding", () => {
    render(<LandingPage onLogin={() => {}} />);
    expect(screen.getByText("Grader")).toBeDefined();
  });
});
