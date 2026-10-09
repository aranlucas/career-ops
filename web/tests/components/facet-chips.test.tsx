import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { FacetChips } from "@/components/inbox/facet-chips";

test("choosing a freshness window notifies the filter state", () => {
  const setWithin = vi.fn();

  render(
    <FacetChips
      within={null}
      setWithin={setWithin}
      sources={new Set()}
      toggleSource={vi.fn()}
      seniorities={new Set()}
      toggleSeniority={vi.fn()}
      locQ=""
      setLocQ={vi.fn()}
      kw=""
      setKw={vi.fn()}
      availSources={[]}
      availSeniorities={[]}
      resultCount={0}
      totalCount={0}
      anyActive={false}
      onClear={vi.fn()}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: "7d" }));

  expect(setWithin).toHaveBeenCalledWith(7);
});
