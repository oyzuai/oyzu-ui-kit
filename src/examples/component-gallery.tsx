import { useRef, useState } from "react";
import {
  ArrowUpRight,
  Boxes,
  ChevronRight,
  Copy,
  Ellipsis,
  Plus,
  RotateCcw,
  Trash2,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Checkbox } from "../components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Skeleton } from "../components/ui/skeleton";
import { Progress } from "../components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "../components/ui/tooltip";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  StatusBadge,
  PendingIndicator,
  type ResourceStatus,
} from "../components/patterns/status-badge";
import { EmptyState } from "../components/patterns/empty-state";
import { FeedbackBanner } from "../components/patterns/feedback-banner";
import { SearchField } from "../components/patterns/search-field";
import { SettingRow } from "../components/patterns/setting-row";
import { ConfirmAction } from "../components/patterns/confirm-action";
import {
  ResourceTable,
  type ResourceColumn,
} from "../components/patterns/resource-table";
import { TextField } from "../components/patterns/text-field";
import { FlowDialog } from "../components/patterns/flow-dialog";
import "./component-gallery.css";

type Resource = {
  name: string;
  identifier: string;
  type: string;
  status: ResourceStatus;
  owner: string;
};
const sampleResources: Resource[] = [
  {
    name: "Production API",
    identifier: "production-api",
    type: "Service",
    status: "healthy",
    owner: "Platform",
  },
  {
    name: "Design assets",
    identifier: "design-assets",
    type: "Storage",
    status: "healthy",
    owner: "Design",
  },
  {
    name: "Release workflow",
    identifier: "release-workflow",
    type: "Pipeline",
    status: "warning",
    owner: "Platform",
  },
  {
    name: "Staging database",
    identifier: "staging-db",
    type: "Database",
    status: "paused",
    owner: "Engineering",
  },
  {
    name: "Documentation build",
    identifier: "docs-build",
    type: "Pipeline",
    status: "pending",
    owner: "Developer experience",
  },
  {
    name: "Legacy import",
    identifier: "legacy-import",
    type: "Service",
    status: "failed",
    owner: "Engineering",
  },
];
function SectionHeading({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="gallery-section-heading">
      <span>{number}</span>
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
    </div>
  );
}
export function ComponentGallery() {
  const [resources, setResources] = useState(sampleResources);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [state, setState] = useState("ready");
  const [failRemoval, setFailRemoval] = useState(false);
  const [delivery, setDelivery] = useState("weekly");
  const [description, setDescription] = useState("");
  const [subscribed, setSubscribed] = useState(true);
  const [approvals, setApprovals] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [formError, setFormError] = useState("");
  const [inspect, setInspect] = useState<Resource | null>(null);
  const detailReturnFocus = useRef<HTMLElement | null>(null);
  const query = search.trim().toLowerCase();
  const filtered = resources.filter(
    (row) =>
      (filter === "all" || row.status === filter) &&
      (row.name + " " + row.identifier).toLowerCase().includes(query),
  );
  function clearFilters() {
    setSearch("");
    setFilter("all");
  }
  async function removeSelected() {
    await new Promise((resolve) => setTimeout(resolve, 650));
    if (failRemoval)
      throw new Error(
        "Removal failed. Nothing was removed. Try again or cancel.",
      );
    setResources((rows) =>
      rows.filter((row) => !selected.includes(row.identifier)),
    );
    setNotice(
      selected.length +
        " resource" +
        (selected.length === 1 ? "" : "s") +
        " removed from this demo.",
    );
    setSelected([]);
  }
  const columns: ResourceColumn<Resource>[] = [
    {
      key: "name",
      label: "Resource",
      sortValue: (row) => row.name,
      render: (row) => (
        <div className="resource-name">
          <span className="resource-icon">
            <Boxes size={16} />
          </span>
          <div>
            <strong>{row.name}</strong>
            <code>{row.identifier}</code>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortValue: (row) => row.status,
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "type",
      label: "Type",
      sortValue: (row) => row.type,
      render: (row) => row.type,
    },
    {
      key: "owner",
      label: "Team",
      sortValue: (row) => row.owner,
      render: (row) => row.owner,
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              id={"resource-actions-" + row.identifier}
              aria-label={"Actions for " + row.name}
            >
              <Ellipsis size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onSelect={() => {
                detailReturnFocus.current = document.getElementById(
                  "resource-actions-" + row.identifier,
                );
                setInspect(row);
              }}
            >
              View details
              <ArrowUpRight size={13} />
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={async () => {
                try {
                  await navigator.clipboard.writeText(row.identifier);
                  setNotice("Identifier copied.");
                } catch {
                  setNotice(
                    "Could not copy. The identifier is available in resource details.",
                  );
                }
              }}
            >
              <Copy size={13} />
              Copy identifier
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => {
                setResources((rows) =>
                  rows.map((item) =>
                    item.identifier === row.identifier
                      ? {
                          ...item,
                          status:
                            item.status === "paused" ? "healthy" : "paused",
                        }
                      : item,
                  ),
                );
                setNotice(
                  row.name +
                    (row.status === "paused" ? " resumed." : " paused."),
                );
              }}
            >
              {row.status === "paused" ? "Resume resource" : "Pause resource"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
  return (
    <TooltipProvider>
      <div className="component-gallery">
        <div className="page-heading">
          <div>
            <span className="eyebrow">OYZU / COMPONENT LIBRARY</span>
            <h1>The details, together.</h1>
            <p>Reusable pieces. Familiar interactions. One visual language.</p>
          </div>
          <Badge variant="outline">Exploration 02</Badge>
        </div>
        <nav className="gallery-jumps" aria-label="Component sections">
          {[
            ["resources", "Resources"],
            ["controls", "Controls"],
            ["feedback", "Feedback"],
            ["states", "Empty & loading"],
          ].map(([id, label]) => (
            <a href={"#" + id} key={id}>
              {label}
              <ChevronRight size={12} />
            </a>
          ))}
        </nav>
        <section id="resources" className="gallery-section">
          <SectionHeading
            number="01"
            title="Resources, at a glance"
            description="Find it, inspect it, act on it. A common home for your resources."
          />
          {notice && (
            <div className="gallery-notice">
              <FeedbackBanner
                tone="info"
                title={notice}
                onDismiss={() => setNotice("")}
              />
            </div>
          )}
          <div className="gallery-card">
            <div className="resource-toolbar">
              <SearchField value={search} onChange={setSearch} />
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger aria-label="Filter by status">
                  <SlidersHorizontal size={13} />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {(
                    [
                      "healthy",
                      "pending",
                      "paused",
                      "warning",
                      "failed",
                    ] as const
                  ).map((status) => (
                    <SelectItem key={status} value={status}>
                      {status === "warning"
                        ? "Needs attention"
                        : status[0].toUpperCase() + status.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selected.length > 0 && (
              <div className="selection-toolbar">
                <span>{selected.length} selected</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelected([])}
                >
                  Clear selection
                </Button>
                <ConfirmAction
                  title={
                    "Remove " +
                    selected.length +
                    " selected resource" +
                    (selected.length === 1 ? "?" : "s?")
                  }
                  description="This removes the selected resources from this demo. This action cannot be undone."
                  actionLabel="Remove resources"
                  confirmText="remove"
                  onConfirm={removeSelected}
                  trigger={
                    <Button variant="destructive" size="sm">
                      <Trash2 size={13} />
                      Remove selected
                    </Button>
                  }
                />
              </div>
            )}
            <ResourceTable
              rows={filtered}
              columns={columns}
              getId={(row) => row.identifier}
              getLabel={(row) => row.name}
              selected={selected}
              onSelectionChange={setSelected}
              empty={
                <EmptyState
                  filtered={!!query || filter !== "all"}
                  title={
                    resources.length ? "No matching resources" : "A fresh start"
                  }
                  description={
                    resources.length
                      ? "Try a different name, identifier or status."
                      : "Add the sample resources to explore this pattern again."
                  }
                  action={
                    <Button
                      variant="outline"
                      onClick={
                        resources.length
                          ? clearFilters
                          : () => setResources(sampleResources)
                      }
                    >
                      {resources.length ? "Clear filters" : "Restore samples"}
                    </Button>
                  }
                />
              }
            />
          </div>
          <div className="gallery-demo-options">
            <label>
              <Checkbox
                checked={failRemoval}
                onCheckedChange={(value) => setFailRemoval(value === true)}
              />
              Simulate removal failure
            </label>
            <button
              onClick={() => {
                setResources(sampleResources);
                setSelected([]);
                clearFilters();
                setNotice("");
                setFailRemoval(false);
              }}
            >
              <RotateCcw size={12} />
              Reset sample data
            </button>
            <span>Fictional data · session only</span>
          </div>
        </section>
        <section id="controls" className="gallery-section">
          <SectionHeading
            number="02"
            title="Make the next step obvious"
            description="Clear labels, small decisions, useful feedback."
          />
          <div className="gallery-two-columns">
            <form
              className="gallery-card control-form"
              onSubmit={(event) => {
                event.preventDefault();
                if (displayName.trim().length < 2) {
                  setFormError("Use at least 2 characters.");
                  return;
                }
                setFormError("");
                setNotice("Example preferences saved.");
              }}
            >
              <div className="mini-heading">
                <h3>Form controls</h3>
                <span>Names, choices & longer thoughts</span>
              </div>
              <TextField
                label="Display name"
                value={displayName}
                onChange={(value) => {
                  setDisplayName(value);
                  setFormError("");
                }}
                error={formError}
                placeholder="e.g. Platform team"
                maxLength={80}
              />
              <div className="text-field">
                <Label htmlFor="delivery">Summary frequency</Label>
                <Select value={delivery} onValueChange={setDelivery}>
                  <SelectTrigger id="delivery">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Every day</SelectItem>
                    <SelectItem value="weekly">Once a week</SelectItem>
                    <SelectItem value="never">Never</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="text-field">
                <Label htmlFor="description">
                  Description <span className="optional">Optional</span>
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  maxLength={240}
                  placeholder="What does this team look after?"
                  aria-describedby="description-count"
                />
                <p id="description-count" className="field-hint">
                  {description.length}/240 characters
                </p>
              </div>
              <label className="checkbox-label">
                <Checkbox
                  checked={subscribed}
                  onCheckedChange={(value) => setSubscribed(value === true)}
                />
                Include a link to recent activity
              </label>
              <div className="control-actions">
                <Button type="submit">Save preferences</Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Reset form"
                      onClick={() => {
                        setDisplayName("");
                        setDescription("");
                        setDelivery("weekly");
                        setSubscribed(true);
                        setFormError("");
                      }}
                    >
                      <RotateCcw size={15} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Reset this example</TooltipContent>
                </Tooltip>
              </div>
            </form>
            <div className="gallery-card control-stack">
              <div className="mini-heading">
                <h3>Preferences</h3>
                <span>Explain the impact beside the choice</span>
              </div>
              <SettingRow
                title="Review changes"
                description="Ask for approval before changes are applied."
                checked={approvals}
                onCheckedChange={setApprovals}
              />
              <SettingRow
                title="Activity summaries"
                description="Keep your team informed with a regular digest."
                checked={subscribed}
                onCheckedChange={setSubscribed}
              />
              <SettingRow
                title="Organization policy"
                description="This setting is managed by your organization."
                checked
                disabled
                onCheckedChange={() => {}}
                badge={<Badge variant="secondary">Managed</Badge>}
              />
              <div className="button-samples">
                <span className="eyebrow">ACTION HIERARCHY</span>
                <div>
                  <Button onClick={() => setNotice("Primary action selected.")}>
                    <Plus size={14} />
                    Primary
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setNotice("Secondary action selected.")}
                  >
                    Secondary
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setNotice("Quiet action selected.")}
                  >
                    Quiet
                  </Button>
                  <Button disabled>Unavailable</Button>
                </div>
              </div>
              <Accordion type="single" collapsible>
                <AccordionItem value="help">
                  <AccordionTrigger>
                    When should I use a dialog?
                  </AccordionTrigger>
                  <AccordionContent>
                    Use a dialog for a focused task with a clear finish. Keep
                    longer work on a dedicated page, and preserve input when a
                    save fails.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </section>
        <section id="feedback" className="gallery-section">
          <SectionHeading
            number="03"
            title="Always know where things stand"
            description="Status has a name and a shape, as well as a color."
          />
          <div className="gallery-card status-samples">
            {(
              ["healthy", "pending", "paused", "warning", "failed"] as const
            ).map((status) => (
              <StatusBadge key={status} status={status} />
            ))}
            <PendingIndicator>Synchronizing</PendingIndicator>
          </div>
          <div className="feedback-grid">
            <FeedbackBanner tone="info" title="A little context">
              Changes will apply to new sessions.
            </FeedbackBanner>
            <FeedbackBanner tone="success" title="Everything is up to date">
              Your latest changes have been saved.
            </FeedbackBanner>
            <FeedbackBanner tone="warning" title="Review before continuing">
              One connection needs your attention.
            </FeedbackBanner>
            <FeedbackBanner tone="error" title="We couldn’t finish the request">
              Your work is safe. Try again in a moment.
            </FeedbackBanner>
          </div>
        </section>
        <section id="states" className="gallery-section">
          <SectionHeading
            number="04"
            title="Design the moments in between"
            description="First use, waiting, failure and recovery deserve the same care."
          />
          <div className="gallery-card">
            <div
              className="state-switcher"
              role="group"
              aria-label="Preview state"
            >
              {[
                ["ready", "First use"],
                ["loading", "Loading"],
                ["error", "Error"],
              ].map(([value, label]) => (
                <Button
                  key={value}
                  variant={state === value ? "secondary" : "ghost"}
                  aria-pressed={state === value}
                  size="sm"
                  onClick={() => setState(value)}
                >
                  {label}
                </Button>
              ))}
            </div>
            {state === "ready" && (
              <EmptyState
                title="Your next workflow starts here"
                description="Create a resource when you’re ready. We’ll guide you through the details."
                action={
                  <Button
                    onClick={() => {
                      setState("loading");
                    }}
                  >
                    <Plus size={14} />
                    Preview loading
                  </Button>
                }
              />
            )}
            {state === "loading" && (
              <div
                className="loading-example"
                role="status"
                aria-label="Loading resources"
              >
                <PendingIndicator>Loading your resources</PendingIndicator>
                <Progress
                  value={45}
                  aria-label="Loading progress"
                  aria-valuetext="45 percent"
                />
                {[1, 2, 3].map((item) => (
                  <div className="skeleton-row" key={item} aria-hidden="true">
                    <Skeleton className="size-9 rounded-lg" />
                    <div>
                      <Skeleton className="h-3 w-36" />
                      <Skeleton className="mt-2 h-2 w-24" />
                    </div>
                    <Skeleton className="ml-auto h-5 w-16" />
                  </div>
                ))}
                <p className="field-hint">
                  Static loading preview. Choose another state above.
                </p>
              </div>
            )}
            {state === "error" && (
              <div className="error-example">
                <FeedbackBanner
                  tone="error"
                  title="Resources couldn’t be loaded"
                >
                  Check your connection and try again.
                </FeedbackBanner>
                <Button
                  variant="outline"
                  onClick={() => {
                    setState("ready");
                    setNotice("Demo recovery complete.");
                  }}
                >
                  <RotateCcw size={14} />
                  Try again
                </Button>
              </div>
            )}
          </div>
        </section>
        {inspect && (
          <FlowDialog
            returnFocusRef={detailReturnFocus}
            open
            title={inspect.name}
            description="A resource detail preview."
            trigger={<span />}
            onOpenChange={(open) => {
              if (!open) setInspect(null);
            }}
            dirty={false}
            submitLabel="Done"
            onSubmit={async () => setInspect(null)}
          >
            <dl className="resource-detail">
              <div>
                <dt>Identifier</dt>
                <dd>
                  <code>{inspect.identifier}</code>
                </dd>
              </div>
              <div>
                <dt>Type</dt>
                <dd>{inspect.type}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>
                  <StatusBadge status={inspect.status} />
                </dd>
              </div>
              <div>
                <dt>Team</dt>
                <dd>{inspect.owner}</dd>
              </div>
            </dl>
          </FlowDialog>
        )}
        <footer className="page-footer">
          <span>OYZU / DESIGN IN PROGRESS</span>
          <span>Built to be used together.</span>
        </footer>
      </div>
    </TooltipProvider>
  );
}
