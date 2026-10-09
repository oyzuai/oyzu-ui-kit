import { useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "../ui/table";
export type ResourceColumn<T> = {
  key: string;
  label: string;
  render: (row: T) => ReactNode;
  sortValue?: (row: T) => string | number;
};
export function ResourceTable<T>({
  rows,
  columns,
  getId,
  getLabel,
  selected,
  onSelectionChange,
  empty,
  pageSize = 4,
  noun = "resources",
  label = "Resource table",
}: {
  rows: readonly T[];
  columns: readonly ResourceColumn<T>[];
  getId: (row: T) => string;
  getLabel: (row: T) => string;
  selected: readonly string[];
  onSelectionChange: (ids: string[]) => void;
  empty: ReactNode;
  pageSize?: number;
  noun?: string;
  label?: string;
}) {
  const [sorting, setSorting] = useState<{ key: string; ascending: boolean }>();
  const [requestedPage, setPage] = useState(0);
  const size = Math.max(1, pageSize);
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const page = Math.min(requestedPage, pages - 1);
  const column = columns.find((item) => item.key === sorting?.key);
  const ordered = [...rows].sort((a, b) => {
    if (!column?.sortValue) return 0;
    const left = column.sortValue(a),
      right = column.sortValue(b);
    const difference =
      typeof left === "number" && typeof right === "number"
        ? left - right
        : String(left).localeCompare(String(right));
    return sorting?.ascending ? difference : -difference;
  });
  const visible = ordered.slice(page * size, (page + 1) * size);
  const ids = visible.map(getId);
  const count = ids.filter((id) => selected.includes(id)).length;
  return (
    <div className="resource-table">
      {!rows.length ? (
        empty
      ) : (
        <>
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label={label}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="selection-cell">
                    <Checkbox
                      aria-label="Select this page"
                      checked={
                        count === ids.length
                          ? true
                          : count
                            ? "indeterminate"
                            : false
                      }
                      onCheckedChange={(checked) =>
                        onSelectionChange(
                          checked
                            ? [...new Set([...selected, ...ids])]
                            : selected.filter((id) => !ids.includes(id)),
                        )
                      }
                    />
                  </TableHead>
                  {columns.map((item) => (
                    <TableHead
                      key={item.key}
                      aria-sort={
                        sorting?.key === item.key
                          ? sorting.ascending
                            ? "ascending"
                            : "descending"
                          : undefined
                      }
                    >
                      {item.sortValue ? (
                        <button
                          className="sort-control"
                          onClick={() => {
                            setSorting({
                              key: item.key,
                              ascending:
                                sorting?.key === item.key
                                  ? !sorting.ascending
                                  : true,
                            });
                            setPage(0);
                          }}
                        >
                          {item.label}
                          {sorting?.key === item.key ? (
                            sorting.ascending ? (
                              <ArrowUp size={12} />
                            ) : (
                              <ArrowDown size={12} />
                            )
                          ) : (
                            <ArrowUpDown size={12} />
                          )}
                        </button>
                      ) : (
                        item.label
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((row) => (
                  <TableRow
                    key={getId(row)}
                    data-state={
                      selected.includes(getId(row)) ? "selected" : undefined
                    }
                  >
                    <TableCell>
                      <Checkbox
                        aria-label={"Select " + getLabel(row)}
                        checked={selected.includes(getId(row))}
                        onCheckedChange={(checked) =>
                          onSelectionChange(
                            checked
                              ? [...new Set([...selected, getId(row)])]
                              : selected.filter((id) => id !== getId(row)),
                          )
                        }
                      />
                    </TableCell>
                    {columns.map((item) => (
                      <TableCell key={item.key}>{item.render(row)}</TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="table-pagination">
            <span>
              {page * size + 1}–{Math.min((page + 1) * size, rows.length)} of{" "}
              {rows.length} {noun}
            </span>
            <div>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Previous page"
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft />
              </Button>
              <span>
                Page {page + 1} of {pages}
              </span>
              <Button
                variant="outline"
                size="icon-sm"
                aria-label="Next page"
                disabled={page + 1 >= pages}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
