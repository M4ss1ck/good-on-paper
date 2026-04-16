import { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCVStore } from "../../store/cvStore";
import { useUIStore } from "../../store/uiStore";
import { SectionEditor } from "./SectionEditor";
import type { Section, SectionType } from "../../types/cv";

const sectionTypeLabels: Record<SectionType, string> = {
  summary: "Summary",
  skills: "Skills",
  experience: "Experience",
  education: "Education",
  languages: "Languages",
  custom: "Custom",
};

function SortableSectionCard({ section }: { section: Section }) {
  const [collapsed, setCollapsed] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const removeSection = useCVStore((s) => s.removeSection);
  const toggleVisibility = useCVStore((s) => s.toggleSectionVisibility);
  const updateTitle = useCVStore((s) => s.updateSectionTitle);

  // Subscribe to activeSection outside React render to auto-expand
  useEffect(() => {
    const unsub = useUIStore.subscribe((state, prev) => {
      if (
        state.activeSection === section.id &&
        prev.activeSection !== section.id
      ) {
        setCollapsed(false);
        state.setActiveSection(null);
      }
    });
    return unsub;
  }, [section.id]);

  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-section-id={section.id}
      className={`border border-gray-200 rounded-lg bg-white mb-2 ${!section.visible ? "opacity-60" : ""
        }`}
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        {/* Drag handle */}
        <button
          className="cursor-grab text-light hover:text-muted touch-none"
          {...attributes}
          {...listeners}
          title="Drag to reorder"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="currentColor"
          >
            <circle cx="5" cy="3" r="1.5" />
            <circle cx="11" cy="3" r="1.5" />
            <circle cx="5" cy="8" r="1.5" />
            <circle cx="11" cy="8" r="1.5" />
            <circle cx="5" cy="13" r="1.5" />
            <circle cx="11" cy="13" r="1.5" />
          </svg>
        </button>

        {/* Section title (editable) */}
        <input
          className="flex-1 text-sm font-medium text-primary bg-transparent border-none focus:outline-none focus:ring-0 px-1"
          value={section.title}
          onChange={(e) => updateTitle(section.id, e.target.value)}
        />

        {/* Visibility toggle */}
        <button
          onClick={() => toggleVisibility(section.id)}
          className="text-light hover:text-muted transition-colors"
          title={section.visible ? "Hide section" : "Show section"}
        >
          {section.visible ? (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          ) : (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          )}
        </button>

        {/* Delete */}
        {confirmDelete ? (
          <span className="flex items-center gap-1 text-xs">
            <button
              onClick={() => {
                removeSection(section.id);
                setConfirmDelete(false);
              }}
              className="text-red-500 hover:text-red-700 font-medium"
            >
              Delete
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-muted hover:text-primary"
            >
              Cancel
            </button>
          </span>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-light hover:text-red-500 transition-colors"
            title="Delete section"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        )}

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-light hover:text-muted transition-colors"
          title={collapsed ? "Expand" : "Collapse"}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`transition-transform ${collapsed ? "" : "rotate-180"}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      </div>

      {/* Collapsible content */}
      {!collapsed && (
        <div className="px-4 pb-4 border-t border-gray-100">
          <SectionEditor section={section} />
        </div>
      )}
    </div>
  );
}

export function SectionList() {
  const sections = useCVStore((s) => s.activeCv()?.sections ?? []);
  const moveSection = useCVStore((s) => s.moveSection);
  const addSection = useCVStore((s) => s.addSection);
  const [showAddMenu, setShowAddMenu] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = sections.findIndex((s) => s.id === active.id);
      const newIndex = sections.findIndex((s) => s.id === over.id);
      moveSection(oldIndex, newIndex);
    }
  }

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold text-primary uppercase tracking-wide">
        Sections
      </h2>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sections.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          {sections.map((section) => (
            <SortableSectionCard key={section.id} section={section} />
          ))}
        </SortableContext>
      </DndContext>

      {/* Add section button */}
      <div className="relative">
        <button
          onClick={() => setShowAddMenu(!showAddMenu)}
          className="w-full py-2 text-sm text-accent hover:text-primary border border-dashed border-gray-300 rounded-lg hover:border-accent transition-colors"
        >
          + Add section
        </button>
        {showAddMenu && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-sm z-10">
            {(Object.keys(sectionTypeLabels) as SectionType[]).map((type) => (
              <button
                key={type}
                onClick={() => {
                  addSection(type);
                  setShowAddMenu(false);
                }}
                className="block w-full text-left px-4 py-2 text-sm text-muted hover:bg-gray-50 hover:text-primary transition-colors first:rounded-t-lg last:rounded-b-lg"
              >
                {sectionTypeLabels[type]}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
