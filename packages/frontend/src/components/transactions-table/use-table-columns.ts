import { useUserSettings } from '@/composable/data-queries/user-settings';
import { useDebounceFn, useLocalStorage } from '@vueuse/core';
import { computed, ref, watch } from 'vue';

import {
  COLUMN_DEFINITIONS_BY_ID,
  type ColumnDefinition,
  DEFAULT_COLUMN_ORDER,
  DEFAULT_VISIBLE_COLUMNS,
  TABLE_COLUMN,
  clampColumnWidth,
  isKnownColumnId,
} from './columns';

const PERSIST_DEBOUNCE_MS = 1_000;

/**
 * Widths live in localStorage rather than UserSettings: a comfortable column
 * width is a property of the screen it is being read on, so a width dragged on a
 * wide desktop display should not follow the user onto a phone.
 */
const COLUMN_WIDTHS_STORAGE_KEY = 'transactions-table:column-widths';

/**
 * Column visibility + order for the transactions table, persisted in
 * UserSettings under `ui.transactionsTable`. Unknown ids from settings are
 * dropped on read (a removed column must not break the table); known columns
 * missing from a stored order are appended in registry order so newly shipped
 * columns appear for existing users.
 *
 * Per-column widths are layered on top from localStorage — see
 * `COLUMN_WIDTHS_STORAGE_KEY`.
 */
export function useTableColumns() {
  const { data: userSettings, patch: patchSettings } = useUserSettings();

  const localOrder = ref<TABLE_COLUMN[]>([...DEFAULT_COLUMN_ORDER]);
  const localVisible = ref<TABLE_COLUMN[]>([...DEFAULT_VISIBLE_COLUMNS]);
  // Settings load async — hydrate local state once they arrive, but never
  // clobber edits the user already made in this session.
  const hasUserEdits = ref(false);

  const sanitizeOrder = (storedOrder: string[]): TABLE_COLUMN[] => {
    const known = storedOrder.filter(isKnownColumnId);
    const missing = DEFAULT_COLUMN_ORDER.filter((id) => !known.includes(id));
    return [...known, ...missing];
  };

  watch(
    () => userSettings.value?.ui?.transactionsTable,
    (stored) => {
      if (!stored || hasUserEdits.value) return;
      localOrder.value = sanitizeOrder(stored.columnOrder);
      const visible = stored.visibleColumns.filter(isKnownColumnId);
      if (visible.length > 0) localVisible.value = visible;
    },
    { immediate: true },
  );

  const persistDebounced = useDebounceFn(() => {
    patchSettings({
      ui: { transactionsTable: { visibleColumns: localVisible.value, columnOrder: localOrder.value } },
    });
  }, PERSIST_DEBOUNCE_MS);

  const markEditedAndPersist = () => {
    hasUserEdits.value = true;
    persistDebounced();
  };

  const columnWidths = useLocalStorage<Partial<Record<TABLE_COLUMN, number>>>(COLUMN_WIDTHS_STORAGE_KEY, {});

  /** A definition carrying the user's dragged width in place of the registry default. */
  const withUserWidth = (definition: ColumnDefinition): ColumnDefinition => {
    const width = columnWidths.value[definition.id];
    return width === undefined ? definition : { ...definition, widthPx: width };
  };

  /** Columns to render, in user order. */
  const visibleColumns = computed<ColumnDefinition[]>(() =>
    localOrder.value
      .filter((id) => localVisible.value.includes(id))
      .map((id) => withUserWidth(COLUMN_DEFINITIONS_BY_ID[id])),
  );

  /** All columns in user order, with visibility flag — for the config panel. */
  const configurableColumns = computed(() =>
    localOrder.value.map((id) => ({
      definition: COLUMN_DEFINITIONS_BY_ID[id],
      visible: localVisible.value.includes(id),
    })),
  );

  const toggleColumn = (id: string) => {
    if (!isKnownColumnId(id)) return;
    if (localVisible.value.includes(id)) {
      // Keep at least one column visible — an empty table is a dead end.
      if (localVisible.value.length === 1) return;
      localVisible.value = localVisible.value.filter((columnId) => columnId !== id);
    } else {
      localVisible.value = [...localVisible.value, id];
    }
    markEditedAndPersist();
  };

  const reorderColumns = (orderedIds: string[]) => {
    localOrder.value = sanitizeOrder(orderedIds);
    markEditedAndPersist();
  };

  const setColumnWidth = ({ id, widthPx }: { id: string; widthPx: number }) => {
    if (!isKnownColumnId(id)) return;
    columnWidths.value = { ...columnWidths.value, [id]: clampColumnWidth(widthPx) };
  };

  /** Drops one column back to its registry width (the header handle's double-click). */
  const resetColumnWidth = (id: string) => {
    if (!isKnownColumnId(id)) return;
    const { [id]: _removed, ...rest } = columnWidths.value;
    columnWidths.value = rest;
  };

  const resetToDefaults = () => {
    localOrder.value = [...DEFAULT_COLUMN_ORDER];
    localVisible.value = [...DEFAULT_VISIBLE_COLUMNS];
    columnWidths.value = {};
    markEditedAndPersist();
  };

  return {
    visibleColumns,
    configurableColumns,
    toggleColumn,
    reorderColumns,
    setColumnWidth,
    resetColumnWidth,
    resetToDefaults,
  };
}
