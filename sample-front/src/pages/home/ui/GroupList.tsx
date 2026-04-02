import { useEffect, useState } from "react";

import { fetchGroups } from "../api/fetch-groups";
import type { Group, Pagination } from "../model/group";

const DEFAULT_LIMIT = 10;
const SKELETON_ROWS = 3;

const colors = {
  background: "#F2F2F7",
  card: "#FFFFFF",
  separator: "#E5E5EA",
  accent: "#007AFF",
  error: "#FF3B30",
  textPrimary: "#000000",
  textSecondary: "#8E8E93",
  textSub: "#636366",
  disabledButton: "#C7C7CC",
  searchBackground: "#EFEFF4",
} as const;

const styles = {
  container: {
    background: colors.background,
    minHeight: "100vh",
    width: "100%",
    boxSizing: "border-box" as const,
    padding: "24px 20px",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Arial, sans-serif',
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    color: colors.textPrimary,
    margin: "0 0 4px 0",
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    margin: "0 0 16px 0",
  },
  searchBar: {
    width: "100%",
    background: colors.searchBackground,
    borderRadius: 10,
    padding: "8px 12px",
    border: "none",
    outline: "none",
    fontSize: 15,
    color: colors.textPrimary,
    boxSizing: "border-box" as const,
  },
  card: {
    background: colors.card,
    borderRadius: 12,
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)",
    overflow: "hidden",
    marginTop: 16,
  },
  headerRow: {
    display: "flex",
    alignItems: "center",
    padding: "10px 16px",
    borderBottom: `1px solid ${colors.separator}`,
  },
  headerCell: {
    fontSize: 12,
    fontWeight: 600,
    color: colors.textSecondary,
    textTransform: "uppercase" as const,
  },
  row: {
    display: "flex",
    alignItems: "center",
    height: 52,
    padding: "0 16px",
  },
  rowBorder: {
    borderBottom: `1px solid ${colors.separator}`,
  },
  cellId: {
    width: 80,
    flexShrink: 0,
    textAlign: "right" as const,
    color: colors.textSub,
    fontSize: 14,
    paddingRight: 16,
  },
  cellName: {
    flex: 1,
    fontWeight: 600,
    color: colors.textPrimary,
    fontSize: 15,
  },
  cellMembers: {
    width: 80,
    flexShrink: 0,
    textAlign: "center" as const,
    fontSize: 14,
    color: colors.textPrimary,
  },
  cellDescription: {
    flex: 2,
    color: colors.textSub,
    fontSize: 14,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
    paddingLeft: 16,
  },
  paginationContainer: {
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 12,
    marginTop: 16,
    fontSize: 13,
    color: colors.textSecondary,
  },
  paginationButton: {
    background: "none",
    border: "none",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    padding: "6px 12px",
    color: colors.accent,
  },
  paginationButtonDisabled: {
    background: "none",
    border: "none",
    fontSize: 14,
    fontWeight: 500,
    padding: "6px 12px",
    color: colors.disabledButton,
    cursor: "default",
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    textAlign: "center" as const,
    padding: "20px 0",
  },
  skeleton: {
    background: colors.separator,
    borderRadius: 4,
    height: 14,
  },
} as const;

function SkeletonRow({ isLast }: { isLast: boolean }) {
  return (
    <div style={{ ...styles.row, ...(isLast ? {} : styles.rowBorder) }}>
      <div style={styles.cellId}>
        <div style={{ ...styles.skeleton, width: 30, marginLeft: "auto" }} />
      </div>
      <div style={styles.cellName}>
        <div style={{ ...styles.skeleton, width: "60%" }} />
      </div>
      <div style={styles.cellMembers}>
        <div style={{ ...styles.skeleton, width: 24, margin: "0 auto" }} />
      </div>
      <div style={styles.cellDescription}>
        <div style={{ ...styles.skeleton, width: "80%" }} />
      </div>
    </div>
  );
}

function TableHeader() {
  return (
    <div style={styles.headerRow}>
      <div style={{ ...styles.headerCell, ...styles.cellId }}>ID</div>
      <div style={{ ...styles.headerCell, ...styles.cellName }}>名称</div>
      <div style={{ ...styles.headerCell, ...styles.cellMembers }}>メンバー数</div>
      <div style={{ ...styles.headerCell, ...styles.cellDescription }}>説明</div>
    </div>
  );
}

function GroupRow({ group, isLast }: { group: Group; isLast: boolean }) {
  const memberCount = group.member_count;
  return (
    <div style={{ ...styles.row, ...(isLast ? {} : styles.rowBorder) }}>
      <div style={styles.cellId}>{group.id}</div>
      <div style={styles.cellName}>{group.name}</div>
      <div style={styles.cellMembers}>
        {memberCount} {memberCount === 1 ? "member" : "members"}
      </div>
      <div style={styles.cellDescription}>{group.description}</div>
    </div>
  );
}

export function GroupList() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGroups({ search, page, limit: DEFAULT_LIMIT })
      .then((data) => {
        setGroups(data.groups);
        setPagination(data.pagination);
        setError(null);
      })
      .catch((err: unknown) => {
        setError(String(err));
        setGroups([]);
        setPagination(null);
      });
  }, [search, page]);

  const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) : 0;
  const isFirstPage = page <= 1;
  const isLastPage = pagination ? page >= totalPages : true;

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>Groups</h2>
      <p style={styles.subtitle}>
        {pagination ? `${pagination.total} groups` : "Loading groups..."}
      </p>

      <input
        type="text"
        placeholder="Search groups..."
        value={search}
        style={styles.searchBar}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
      />

      {error && <p style={styles.errorText}>{error}</p>}

      {!error && (
        <div style={styles.card}>
          <TableHeader />
          {!pagination && (
            <>
              <p style={{ position: "absolute", width: 1, height: 1, overflow: "hidden" }}>
                loading...
              </p>
              {Array.from({ length: SKELETON_ROWS }, (_, i) => (
                <SkeletonRow key={i} isLast={i === SKELETON_ROWS - 1} />
              ))}
            </>
          )}
          {groups.map((group, index) => (
            <GroupRow key={group.id} group={group} isLast={index === groups.length - 1} />
          ))}
        </div>
      )}

      {pagination && (
        <div style={styles.paginationContainer}>
          <span>Page {pagination.page}</span>
          <span>Total: {pagination.total}</span>
          <button
            type="button"
            disabled={isFirstPage}
            style={isFirstPage ? styles.paginationButtonDisabled : styles.paginationButton}
            onClick={() => setPage((prev) => prev - 1)}
          >
            Previous
          </button>
          <button
            type="button"
            disabled={isLastPage}
            style={isLastPage ? styles.paginationButtonDisabled : styles.paginationButton}
            onClick={() => setPage((prev) => prev + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
