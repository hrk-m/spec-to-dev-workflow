import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { HomePage } from "@/pages/home/ui/HomePage";

vi.mock("@/pages/home/ui/GroupList", () => ({
  GroupList: () => <div>mock group list</div>,
}));

describe("HomePage", () => {
  it("GroupList をレンダリングする", () => {
    render(<HomePage />);

    expect(screen.getByText("mock group list")).toBeInTheDocument();
  });
});
