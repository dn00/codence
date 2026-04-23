// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { SessionTimer } from "./SessionTimer";

describe("SessionTimer", () => {
  test("renders warmup countdown by default", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    render(<SessionTimer limitMinutes={null} startedAt={fiveMinAgo} />);

    expect(screen.getByText(/starting in 3/i)).toBeTruthy();
    expect(screen.getByTitle(/skip warmup/i)).toBeTruthy();
  });

  test("renders paused count-up when autoStart is disabled", () => {
    const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();

    render(<SessionTimer limitMinutes={null} startedAt={twoMinAgo} autoStart={false} />);

    expect(screen.getByText("0:00")).toBeTruthy();
    expect(screen.getByTitle(/resume timer/i)).toBeTruthy();
  });

  test("renders full countdown when limit is set and autoStart is disabled", () => {
    const fortyMinAgo = new Date(Date.now() - 40 * 60 * 1000).toISOString();

    render(<SessionTimer limitMinutes={30} startedAt={fortyMinAgo} autoStart={false} />);

    const text = screen.getByText("30:00");
    expect(text).toBeTruthy();
  });

  test("displays with muted styling during normal countdown", () => {
    const oneMinAgo = new Date(Date.now() - 60 * 1000).toISOString();

    render(<SessionTimer limitMinutes={30} startedAt={oneMinAgo} autoStart={false} />);

    const text = screen.getByText("30:00");
    expect(text.className).toContain("muted");
  });
});
