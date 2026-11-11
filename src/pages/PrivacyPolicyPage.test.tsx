import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { PrivacyPolicyPage } from "./PrivacyPolicyPage";

describe("PrivacyPolicyPage", () => {
  it("links Back to signup when from=signup", () => {
    render(
      <MemoryRouter initialEntries={["/privacy?from=signup"]}>
        <Routes>
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: /^back$/i })).toHaveAttribute(
      "href",
      "/auth?mode=signup",
    );
  });

  it("links Back to auth by default", () => {
    render(
      <MemoryRouter initialEntries={["/privacy"]}>
        <Routes>
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: /^back$/i })).toHaveAttribute("href", "/auth");
  });
});
