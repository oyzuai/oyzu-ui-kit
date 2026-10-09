import { ProjectActions } from "./project-actions";
import { useState } from "react";
import {
  ArrowUpRight,
  ArrowLeft,
  ArrowRight,
  Plus,
  Check,
  Clock3,
} from "lucide-react";
import { ResourcePicker } from "../components/patterns/resource-picker";
import { PageLayout } from "../components/patterns/page-layout";
import {
  ResourceTable,
  type ResourceColumn,
} from "../components/patterns/resource-table";
import { SearchField } from "../components/patterns/search-field";
import { StatusBadge } from "../components/patterns/status-badge";
import { Button } from "../components/ui/button";
import "./full-pages.css";
type Project = { name: string; id: string; owner: string; updated: string };
const samples: Project[] = [
  {
    name: "Developer tools",
    id: "developer-tools",
    owner: "Platform",
    updated: "12 minutes ago",
  },
  {
    name: "Customer experience",
    id: "customer-experience",
    owner: "Product",
    updated: "2 hours ago",
  },
  {
    name: "Internal operations",
    id: "internal-operations",
    owner: "Operations",
    updated: "Yesterday",
  },
  {
    name: "Documentation",
    id: "documentation",
    owner: "Developer experience",
    updated: "Yesterday",
  },
  {
    name: "Design system",
    id: "design-system",
    owner: "Design",
    updated: "2 days ago",
  },
  {
    name: "Data services",
    id: "data-services",
    owner: "Platform",
    updated: "3 days ago",
  },
];
const events = [
  {
    title: "Project details updated",
    who: "Alex Morgan",
    time: "12 minutes ago",
    detail:
      "Updated the description of Developer tools. The project identifier remains developer-tools.",
  },
  {
    title: "Connection added",
    who: "Sam Rivera",
    time: "48 minutes ago",
    detail:
      "Added a read-only connection named Source control to Developer tools.",
  },
  {
    title: "Member joined",
    who: "Jamie Chen",
    time: "2 hours ago",
    detail: "Jamie joined the Platform team with member access.",
  },
];
export function FullPages({
  section,
  projectId,
}: {
  section: string;
  projectId?: string;
}) {
  const [projects, setProjects] = useState(samples);
  const [notice, setNotice] = useState("");
  const project = projects.find((row) => row.id === projectId) ?? samples[0];
  const page = ["resources", "detail", "activity"].includes(section)
    ? section
    : "resources";
  const [density, setDensity] = useState("sparse");
  const [query, setQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState<string | null>(null);
  const [recentProjects, setRecentProjects] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [event, setEvent] = useState(0);
  const [activityFilter, setActivityFilter] = useState("");
  const rows =
    density === "empty"
      ? []
      : density === "sparse"
        ? projects.slice(0, 2)
        : projects;
  const visible = rows.filter(
    (row) =>
      (!projectFilter || row.id === projectFilter) &&
      (row.name + row.id + row.owner)
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const columns: ResourceColumn<Project>[] = [
    {
      key: "name",
      label: "Project",
      sortValue: (row) => row.name,
      render: (row) => (
        <div className="project-name-cell">
          <a className="project-title" href={"#pages/detail/" + row.id}>
            <strong>{row.name}</strong>
          </a>
          <code>{row.id}</code>
        </div>
      ),
    },
    {
      key: "owner",
      label: "Team",
      sortValue: (row) => row.owner,
      render: (row) => row.owner,
    },
    {
      key: "status",
      label: "Status",
      render: () => <StatusBadge status="healthy" />,
    },
    { key: "updated", label: "Last updated", render: (row) => row.updated },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
        <ProjectActions
          project={row}
          onEdit={async (name) => {
            setProjects((items) =>
              items.map((item) =>
                item.id === row.id
                  ? { ...item, name, updated: "Just now" }
                  : item,
              ),
            );
            setNotice("Project updated.");
          }}
          onDelete={async () => {
            setProjects((items) => items.filter((item) => item.id !== row.id));
            setSelected((ids) => ids.filter((id) => id !== row.id));
            if (projectFilter === row.id) setProjectFilter(null);
            setNotice(row.name + " deleted.");
            requestAnimationFrame(() =>
              document
                .querySelector<HTMLInputElement>(".page-list-toolbar input")
                ?.focus(),
            );
          }}
        />
      ),
    },
  ];
  return (
    <div className="page-examples">
      <nav className="page-example-nav" aria-label="Page examples">
        <span>PAGE STUDIES</span>
        {[
          ["resources", "Resource list"],
          ["detail", "Detail page"],
          ["activity", "Activity"],
          ["connection", "Connection form"],
          ["connection-wizard", "Connection wizard"],
          ["secrets", "Secret selector"],
          ["members", "Members & access"],
        ].map(([id, label]) => (
          <a
            key={id}
            href={"#pages/" + id}
            aria-current={page === id ? "page" : undefined}
          >
            {label}
            <ArrowUpRight size={12} />
          </a>
        ))}
      </nav>
      {page === "resources" && (
        <PageLayout
          eyebrow="WORKSPACE / PROJECTS"
          title="Projects"
          description="The places your teams organize their work."
          actions={
            <Button
              onClick={() => {
                setDensity("populated");
                setQuery("");
              }}
            >
              Load sample projects <Plus size={15} />
            </Button>
          }
        >
          {notice && (
            <p role="status" className="page-action-notice">
              {notice}
            </p>
          )}
          <div className="page-list-toolbar">
            <SearchField
              value={query}
              onChange={setQuery}
              placeholder="Find a project…"
            />
            <ResourcePicker
              label="Filter by project"
              placeholder="All projects"
              items={projects.map((row) => ({
                id: row.id,
                name: row.name,
                description: row.owner,
              }))}
              value={projectFilter}
              recentIds={recentProjects}
              onChange={(id) => {
                setProjectFilter(id);
                setQuery("");
                setSelected([]);
                if (id) {
                  setDensity("populated");
                  setRecentProjects((previous) =>
                    [id, ...previous.filter((item) => item !== id)].slice(0, 5),
                  );
                }
              }}
            />
            <div className="density-control">
              <label htmlFor="project-density">Example content</label>
              <select
                id="project-density"
                value={density}
                onChange={(e) => {
                  setDensity(e.target.value);
                  setSelected([]);
                }}
              >
                <option value="sparse">Just two projects</option>
                <option value="populated">Six projects</option>
                <option value="empty">No projects yet</option>
              </select>
            </div>
          </div>
          {selected.length > 0 && (
            <div className="page-selection">
              {selected.length} selected
              <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
                Clear selection
              </Button>
            </div>
          )}
          <ResourceTable
            rows={visible}
            columns={columns}
            getId={(row) => row.id}
            getLabel={(row) => row.name}
            selected={selected}
            onSelectionChange={setSelected}
            pageSize={10}
            empty={
              <div className="page-empty">
                <span className="eyebrow">
                  {query || projectFilter ? "NO MATCHES" : "A PLACE TO START"}
                </span>
                <h2>
                  {query || projectFilter
                    ? "No projects match your search"
                    : "Your first project starts here"}
                </h2>
                <p>
                  {query || projectFilter
                    ? "Try a different name, identifier or team."
                    : "Group related work in a project. Add a sample to explore how this page grows."}
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setQuery("");
                    setProjectFilter(null);
                    setDensity("populated");
                  }}
                >
                  {query ? "Reset list" : "Explore sample projects"}
                  <ArrowRight size={14} />
                </Button>
              </div>
            }
          />
          <div className="page-list-foot">
            <span>Fictional workspace · session-only examples</span>
            <p>Each project has a friendly name and a stable identifier.</p>
          </div>
        </PageLayout>
      )}
      {page === "detail" && (
        <PageLayout
          eyebrow={"PROJECT / " + project.id.toUpperCase()}
          title={project.name}
          description="Shared infrastructure for the people building our products."
          actions={
            <a className="page-text-link" href="#pages/resources">
              <ArrowLeft size={14} /> All projects
            </a>
          }
          aside={
            <>
              <h2>Project details</h2>
              <dl className="page-facts">
                <div>
                  <dt>Identifier</dt>
                  <dd>
                    <code>{project.id}</code>
                  </dd>
                </div>
                <div>
                  <dt>Team</dt>
                  <dd>{project.owner}</dd>
                </div>
                <div>
                  <dt>Created by</dt>
                  <dd>Alex Morgan</dd>
                </div>
                <div>
                  <dt>Visibility</dt>
                  <dd>Workspace members</dd>
                </div>
              </dl>
              <div className="page-rail-note">
                <Check size={16} />
                <p>This project is up to date. Last changed 12 minutes ago.</p>
              </div>
            </>
          }
        >
          <section className="page-detail-section">
            <div className="page-section-title">
              <h2>Overview</h2>
              <StatusBadge status="healthy" />
            </div>
            <p className="page-prose">
              A shared home for build tooling, source control and the services
              our engineering teams use every day.
            </p>
          </section>
          <section className="page-detail-section">
            <div className="page-section-title">
              <h2>
                Connections <span>01</span>
              </h2>
            </div>
            <div className="page-connection">
              <div>
                <strong>Source control</strong>
                <code>source-control</code>
              </div>
              <span>Read only</span>
              <StatusBadge status="healthy" />
            </div>
          </section>
          <section className="page-detail-section">
            <div className="page-section-title">
              <h2>Latest activity</h2>
              <a href="#pages/activity" className="page-text-link">
                View activity <ArrowRight size={14} />
              </a>
            </div>
            <div className="page-recent">
              <Clock3 size={17} />
              <div>
                <strong>Project details updated</strong>
                <p>Alex Morgan · 12 minutes ago</p>
              </div>
            </div>
          </section>
        </PageLayout>
      )}
      {page === "activity" && (
        <PageLayout
          eyebrow="WORKSPACE / HISTORY"
          title="Activity"
          description="A clear record of what changed and who changed it."
          aside={
            <div aria-live="polite">
              <span className="eyebrow">EVENT DETAILS</span>
              <h2 className="event-detail-title">{events[event].title}</h2>
              <p>{events[event].detail}</p>
              <dl className="page-facts">
                <div>
                  <dt>By</dt>
                  <dd>{events[event].who}</dd>
                </div>
                <div>
                  <dt>When</dt>
                  <dd>{events[event].time}</dd>
                </div>
              </dl>
            </div>
          }
        >
          <div className="activity-search">
            <SearchField
              value={activityFilter}
              onChange={setActivityFilter}
              placeholder="Search activity…"
            />
          </div>
          <div className="activity-day">
            TODAY{" "}
            <span>
              {
                events.filter((item) =>
                  (item.title + item.who)
                    .toLowerCase()
                    .includes(activityFilter.toLowerCase()),
                ).length
              }{" "}
              events
            </span>
          </div>
          <div className="activity-list">
            {events.map(
              (item, i) =>
                (item.title + item.who)
                  .toLowerCase()
                  .includes(activityFilter.toLowerCase()) && (
                  <button
                    key={item.title}
                    className="activity-entry"
                    aria-pressed={event === i}
                    onClick={() => setEvent(i)}
                  >
                    <span className="activity-dot" />
                    <span>
                      <strong>{item.title}</strong>
                      <small>{item.who}</small>
                    </span>
                    <time>{item.time}</time>
                    <ArrowRight size={15} />
                  </button>
                ),
            )}
          </div>
          {!events.some((item) =>
            (item.title + item.who)
              .toLowerCase()
              .includes(activityFilter.toLowerCase()),
          ) && (
            <div className="page-empty">
              <h2>No matching activity</h2>
              <Button variant="ghost" onClick={() => setActivityFilter("")}>
                Clear search
              </Button>
            </div>
          )}
        </PageLayout>
      )}
    </div>
  );
}
