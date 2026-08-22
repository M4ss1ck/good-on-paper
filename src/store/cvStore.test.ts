import { describe, it, expect, beforeEach } from "vitest";
import { useCVStore } from "./cvStore";
import { importAdaptation } from "../lib/ai/importAdaptation";
import { fingerprintCV } from "../lib/ai/adaptableCV";
import { makeCV } from "../test/fixtures";
import type { CV } from "../types/cv";

function seedWorkspace(cv: CV) {
  useCVStore.setState({
    workspace: { cvs: { [cv.id]: cv }, order: [cv.id], activeCvId: cv.id },
  });
}

describe("insertAdaptedCV", () => {
  beforeEach(() => seedWorkspace(makeCV()));

  it("adds a new CV next to its source and activates it", () => {
    const source = useCVStore.getState().activeCv()!;
    const adapted: CV = { ...makeCV(), id: "cv-2", name: "Adapted", parentId: source.id };

    useCVStore.getState().insertAdaptedCV(adapted);

    const { workspace } = useCVStore.getState();
    expect(workspace.order).toEqual([source.id, "cv-2"]);
    expect(workspace.activeCvId).toBe("cv-2");
    expect(workspace.cvs["cv-2"].name).toBe("Adapted");
  });

  it("appends when the source is unknown", () => {
    const adapted: CV = { ...makeCV(), id: "cv-2", parentId: null };
    useCVStore.getState().insertAdaptedCV(adapted);
    expect(useCVStore.getState().workspace.order).toEqual(["cv-1", "cv-2"]);
  });
});

describe("importing an external adaptation", () => {
  beforeEach(() => seedWorkspace(makeCV()));

  it("creates a new CV rather than mutating the source", () => {
    const source = useCVStore.getState().workspace.cvs["cv-1"];
    const before = JSON.stringify(source);

    const json = JSON.stringify({
      schemaVersion: 1,
      source: { cvId: "cv-1", fingerprint: fingerprintCV(source) },
      target: { position: "Platform Engineer", company: "Globex" },
      cv: {
        meta: { title: "Platform Engineer", location: "Madrid" },
        sections: [
          {
            id: "sec-summary",
            type: "summary",
            title: "Summary",
            items: [{ id: "item-summary", content: "Platform engineer." }],
          },
        ],
      },
    });

    const result = importAdaptation(
      json,
      (id) => useCVStore.getState().workspace.cvs[id] ?? null,
      "Adapted",
    );
    if (result.kind !== "ok") throw new Error(`expected ok, got ${result.kind}`);
    useCVStore.getState().insertAdaptedCV(result.cv);

    const { workspace } = useCVStore.getState();
    expect(workspace.order).toHaveLength(2);
    expect(JSON.stringify(workspace.cvs["cv-1"])).toBe(before);
    expect(workspace.activeCvId).toBe(result.cv.id);
    expect(workspace.cvs[result.cv.id].name).toBe("Platform Engineer — Globex");
  });
});

describe("forking during BYOK adaptation", () => {
  beforeEach(() => seedWorkspace(makeCV()));

  it("leaves the source untouched when suggestions are applied to a fork", () => {
    const store = useCVStore.getState();
    const before = JSON.stringify(store.workspace.cvs["cv-1"]);

    store.forkCV("cv-1", "Platform Engineer — Globex");
    const forkId = useCVStore.getState().workspace.activeCvId!;
    useCVStore
      .getState()
      .updateItem("sec-summary", "item-summary", { content: "Platform engineer." });

    const { workspace } = useCVStore.getState();
    expect(JSON.stringify(workspace.cvs["cv-1"])).toBe(before);
    const summary = workspace.cvs[forkId].sections[0].items[0] as {
      content: string;
    };
    expect(summary.content).toBe("Platform engineer.");
    expect(workspace.cvs[forkId].parentId).toBe("cv-1");
  });
});

describe("addBullet", () => {
  beforeEach(() => seedWorkspace(makeCV()));

  it("appends an empty bullet by default and the given text when provided", () => {
    useCVStore.getState().addBullet("sec-exp", "item-exp");
    useCVStore.getState().addBullet("sec-exp", "item-exp", "Ran Kubernetes.");

    const item = useCVStore.getState().workspace.cvs["cv-1"].sections[2]
      .items[0] as { bullets: string[] };
    expect(item.bullets).toEqual([
      "Built services.",
      "Ran deployments.",
      "",
      "Ran Kubernetes.",
    ]);
  });
});
