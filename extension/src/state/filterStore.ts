import { create } from "zustand";
import type { TaskPriority, TaskSize } from "@shared/types";

export type DueDatePreset = "all" | "overdue" | "today" | "this-week" | "this-month";
export type SortField = "order" | "priority" | "dueDate" | "createdAt" | "updatedAt";
export type SortDirection = "asc" | "desc";

interface FilterStore {
  searchText: string;
  priorityFilter: TaskPriority[];
  labelFilter: string[];
  dueDatePreset: DueDatePreset;
  dueDateFrom: string | null;
  dueDateTo: string | null;
  assigneeFilter: string[];
  sizeFilter: TaskSize[];
  sortField: SortField;
  sortDirection: SortDirection;

  setSearch: (text: string) => void;
  setPriorityFilter: (priorities: TaskPriority[]) => void;
  setLabelFilter: (labelIds: string[]) => void;
  setDueDatePreset: (preset: DueDatePreset) => void;
  setDueDateRange: (from: string | null, to: string | null) => void;
  setAssigneeFilter: (assigneeIds: string[]) => void;
  setSizeFilter: (sizes: TaskSize[]) => void;
  setSortField: (field: SortField, direction?: SortDirection) => void;
  toggleSortDirection: () => void;
  clearFilters: () => void;
  get hasActiveFilters(): boolean;
}

export const useFilterStore = create<FilterStore>((set, get) => ({
  searchText: "",
  priorityFilter: [],
  labelFilter: [],
  dueDatePreset: "all",
  dueDateFrom: null,
  dueDateTo: null,
  assigneeFilter: [],
  sizeFilter: [],
  sortField: "order",
  sortDirection: "asc",

  setSearch(text) {
    set({ searchText: text });
  },
  setPriorityFilter(priorities) {
    set({ priorityFilter: priorities });
  },
  setLabelFilter(labelIds) {
    set({ labelFilter: labelIds });
  },
  setDueDatePreset(preset) {
    set({ dueDatePreset: preset, dueDateFrom: null, dueDateTo: null });
  },
  setDueDateRange(from, to) {
    set({ dueDatePreset: "all", dueDateFrom: from, dueDateTo: to });
  },
  setAssigneeFilter(assigneeIds) {
    set({ assigneeFilter: assigneeIds });
  },
  setSizeFilter(sizes) {
    set({ sizeFilter: sizes });
  },
  setSortField(field, direction) {
    set({
      sortField: field,
      sortDirection: direction ?? get().sortDirection,
    });
  },
  toggleSortDirection() {
    set((s) => ({ sortDirection: s.sortDirection === "asc" ? "desc" : "asc" }));
  },
  clearFilters() {
    set({
      searchText: "",
      priorityFilter: [],
      labelFilter: [],
      dueDatePreset: "all",
      dueDateFrom: null,
      dueDateTo: null,
      assigneeFilter: [],
      sizeFilter: [],
      sortField: "order",
      sortDirection: "asc",
    });
  },
  get hasActiveFilters() {
    const s = get();
    return (
      s.searchText.length > 0 ||
      s.priorityFilter.length > 0 ||
      s.labelFilter.length > 0 ||
      s.dueDatePreset !== "all" ||
      s.dueDateFrom !== null ||
      s.dueDateTo !== null ||
      s.assigneeFilter.length > 0 ||
      s.sizeFilter.length > 0
    );
  },
}));
