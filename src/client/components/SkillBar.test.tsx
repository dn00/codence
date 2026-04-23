// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { SkillBar } from "./SkillBar";

describe("SkillBar", () => {
  test("renders skill name and score", () => {
    render(<SkillBar name="Hash Map" score={8.2} />);

    expect(screen.getByText("Hash Map")).toBeTruthy();
    expect(screen.getByText("8.2")).toBeTruthy();
  });

  test("renders a progressbar with correct value", () => {
    render(<SkillBar name="Sliding Window" score={7.1} />);

    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-valuenow")).toBe("7.1");
    expect(bar.getAttribute("aria-valuemin")).toBe("0");
    expect(bar.getAttribute("aria-valuemax")).toBe("10");
  });

  test("uses sage color for score >= 5", () => {
    const { container } = render(<SkillBar name="High" score={5.0} />);
    const fill = container.querySelector("[data-fill]");
    expect(fill?.className).toContain("bg-secondary");
  });

  test("uses coral color for score < 5", () => {
    const { container } = render(<SkillBar name="Low" score={4.9} />);
    const fill = container.querySelector("[data-fill]");
    expect(fill?.className).toContain("bg-primary");
  });
});
