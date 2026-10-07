import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import Pagination from "../Pagination";

const CompactPaginationHarness = () => {
  const [page, setPage] = useState(1);

  return (
    <>
      <Pagination
        pageNo={page}
        pageSize={5}
        totalCount={10}
        totalPage={2}
        onPageChange={setPage}
        onPageSizeChange={() => {}}
        pageSizeOptions={[5, 10]}
        compact
      />
      <output aria-label="Current page">{page}</output>
    </>
  );
};

describe("Pagination compact layout", () => {
  it("can return from the second page to the first page", async () => {
    const user = userEvent.setup();
    render(<CompactPaginationHarness />);

    await user.click(screen.getByRole("button", { name: "Page 2" }));
    expect(screen.getByLabelText("Current page")).toHaveTextContent("2");

    await user.click(screen.getByRole("button", { name: "Page 1" }));
    expect(screen.getByLabelText("Current page")).toHaveTextContent("1");
  });
});
