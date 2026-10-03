import { WizardModal } from "@/components/patterns/wizard-modal";
import { useState, useRef, useCallback } from "react";
import { ArrowUpRight, Search } from "lucide-react";
import { PageLayout } from "@/components/patterns/page-layout";
import { ConnectionWizard } from "./connection-wizard";
import { connectors } from "./connector-data";
import "./connector-catalog.css";
const categories = [
  "All connectors",
  "Cloud",
  "Registries",
  "Deployment",
  "CI/CD",
  "Infrastructure",
  "Security",
];
export function ConnectorCatalog({
  selected,
  onStateChange,
}: {
  selected?: string;
  onStateChange: (dirty: boolean, busy: boolean) => void;
}) {
  const [testOutcome, setTestOutcome] = useState("success");
  const [mode, setMode] = useState("page");
  const [modalId, setModalId] = useState<string | null>(null);
  const [modalState, setModalState] = useState({ dirty: false, busy: false });
  const returnFocus = useRef<HTMLElement | null>(null);
  const reportModal = useCallback(
    (dirty: boolean, busy: boolean) => {
      setModalState({ dirty, busy });
      onStateChange(dirty, busy);
    },
    [onStateChange],
  );
  const modalConnector = connectors.find((item) => item.id === modalId);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All connectors");
  const connector = connectors.find((item) => item.id === selected);
  if (selected)
    return connector ? (
      <ConnectionWizard
        key={selected}
        connector={connector}
        onStateChange={onStateChange}
      />
    ) : (
      <PageLayout
        variant="discovery"
        eyebrow="PROJECT / CHECKOUT SERVICE"
        title="Connector not found"
        description="Choose an available connector to continue."
      >
        <a href="#pages/connectors">Back to connectors</a>
      </PageLayout>
    );
  const visible = connectors.filter(
    (item) =>
      (category === "All connectors" || item.category === category) &&
      `${item.name} ${item.description} ${item.category}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  return (
    <PageLayout
      variant="discovery"
      eyebrow="PROJECT / CHECKOUT SERVICE / CONNECTIONS"
      title="What would you like to connect?"
      description="Bring your tools together. Pick a connector to get started."
    >
      <label className="wizard-presentation">
        Wizard presentation{" "}
        <select value={mode} onChange={(event) => setMode(event.target.value)}>
          <option value="page">Full page</option>
          <option value="modal">Modal dialog</option>
        </select>
      </label>
      {mode === "modal" && (
        <label className="wizard-presentation">
          Preview test outcome
          <select
            value={testOutcome}
            onChange={(event) => setTestOutcome(event.target.value)}
          >
            <option value="success">Success</option>
            <option value="unreachable">Service unreachable</option>
            <option value="credentials">Authentication failed</option>
            <option value="permissions">Insufficient permissions</option>
          </select>
        </label>
      )}
      {modalConnector && (
        <WizardModal
          title={`Connect ${modalConnector.name}`}
          dirty={modalState.dirty}
          busy={modalState.busy}
          onClose={() => setModalId(null)}
          returnFocusRef={returnFocus}
        >
          <ConnectionWizard
            connector={modalConnector}
            presentation="modal"
            testOutcome={testOutcome}
            onStateChange={reportModal}
            onDone={() => setModalId(null)}
          />
        </WizardModal>
      )}
      <div className="connector-search">
        <Search size={20} aria-hidden="true" />
        <input
          aria-label="Search connectors"
          placeholder="Search by name or what you want to connect…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {query && <button onClick={() => setQuery("")}>Clear</button>}
      </div>
      <div className="connector-browser">
        <nav aria-label="Connector categories" className="connector-categories">
          {categories.map((item) => (
            <button
              key={item}
              aria-pressed={category === item}
              onClick={() => setCategory(item)}
            >
              {item}
              <span>
                {item === "All connectors"
                  ? connectors.length
                  : connectors.filter((c) => c.category === item).length}
              </span>
            </button>
          ))}
        </nav>
        <div>
          <div className="connector-results">
            <span role="status">
              {visible.length} connectors{query && ` matching “${query}”`}
            </span>
            <small>INTERACTIVE PREVIEWS</small>
          </div>
          <div className="connector-grid">
            {visible.map((item) => (
              <a
                key={item.id}
                href={`#pages/connectors/${item.id}`}
                className="connector-tile"
                onClick={(event) => {
                  if (mode === "modal" && !event.metaKey && !event.ctrlKey) {
                    event.preventDefault();
                    returnFocus.current = event.currentTarget;
                    setModalId(item.id);
                  }
                }}
              >
                <img
                  src={`/brands/${item.id}.svg`}
                  alt=""
                  width="36"
                  height="36"
                />
                <div>
                  <span className="connector-category">{item.category}</span>
                  <h2>{item.name}</h2>
                  <p>{item.description}</p>
                </div>
                <ArrowUpRight size={17} aria-hidden="true" />
              </a>
            ))}
          </div>
          {!visible.length && (
            <div className="connector-empty">
              <h2>No connectors found</h2>
              <p>Try a product name or choose another category.</p>
              <button
                onClick={() => {
                  setQuery("");
                  setCategory("All connectors");
                }}
              >
                Clear filters
              </button>
            </div>
          )}
          <p className="connector-disclaimer">
            Explore the setup experience. These connectors are illustrative;
            tests and authentication are simulated.
          </p>
        </div>
      </div>
    </PageLayout>
  );
}
