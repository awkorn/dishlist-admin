import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "./StatusBadge";

describe("StatusBadge", () => {
  it("renders the report status with a status-specific class", () => {
    render(<StatusBadge status="ACTIONED" />);
    expect(screen.getByText("ACTIONED")).toHaveClass("status-actioned");
  });
});
