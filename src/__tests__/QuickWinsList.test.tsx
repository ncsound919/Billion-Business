import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import QuickWinsList from "../components/QuickWinsList";

const mockQuickWins = [
  {
    id: "win-1",
    title: "Rotate AWS Keys",
    severity: "High" as const,
    category: "Security" as const,
    description: "Hardcoded secret detected.",
    actionableSteps: "Move to env vars.",
  },
  {
    id: "win-2",
    title: "Add LICENSE file",
    severity: "Medium" as const,
    category: "Documentation" as const,
    description: "Missing license file.",
    actionableSteps: "Create LICENSE.",
  },
  {
    id: "win-3",
    title: "Deduplicate Hooks",
    severity: "High" as const,
    category: "Quality" as const,
    description: "Code overlap in fetch layer.",
    actionableSteps: "Refactor to custom hooks.",
  },
];

describe("QuickWinsList", () => {
  it("renders all quick wins", () => {
    render(<QuickWinsList quickWins={mockQuickWins} completedWins={[]} onToggleWin={() => {}} />);
    expect(screen.getByText("Rotate AWS Keys")).toBeDefined();
    expect(screen.getByText("Add LICENSE file")).toBeDefined();
    expect(screen.getByText("Deduplicate Hooks")).toBeDefined();
  });

  it("shows completed count", () => {
    render(<QuickWinsList quickWins={mockQuickWins} completedWins={["win-1"]} onToggleWin={() => {}} />);
    expect(screen.getByText(/Completed: 1 \/ 3/)).toBeDefined();
  });

  it("shows action steps for incomplete wins", () => {
    render(<QuickWinsList quickWins={mockQuickWins} completedWins={[]} onToggleWin={() => {}} />);
    expect(screen.getByText("Move to env vars.")).toBeDefined();
    expect(screen.getByText("Create LICENSE.")).toBeDefined();
  });

  it("calls onToggleWin when a win checkbox is clicked", () => {
    const onToggle = vi.fn();
    render(<QuickWinsList quickWins={mockQuickWins} completedWins={[]} onToggleWin={onToggle} />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]);
    expect(onToggle).toHaveBeenCalledWith("win-1");
  });

  it("shows High and Medium priority badges", () => {
    render(<QuickWinsList quickWins={mockQuickWins} completedWins={[]} onToggleWin={() => {}} />);
    const highPriorityBadges = screen.getAllByText("High Priority");
    expect(highPriorityBadges.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Medium Priority")).toBeDefined();
  });
});
