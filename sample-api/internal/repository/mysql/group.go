// Package mysql provides MySQL implementations of repository interfaces.
package mysql

import (
	"context"
	"database/sql"
	"strings"

	"github.com/hrk-m/spec-to-dev-workflow/sample-api/domain"
)

const (
	groupBaseColumns = "g.id, g.name, g.description"
)

// GroupRepository is a MySQL implementation of group.GroupRepository.
type GroupRepository struct {
	db *sql.DB
}

// NewGroupRepository returns a new GroupRepository.
func NewGroupRepository(db *sql.DB) *GroupRepository {
	return &GroupRepository{db: db}
}

// ListGroups returns a paginated, filtered list of groups from MySQL.
func (r *GroupRepository) ListGroups(ctx context.Context, search string, page, limit int) ([]domain.Group, int, error) {
	total, err := r.countGroups(ctx, search)
	if err != nil {
		return nil, 0, err
	}

	if total == 0 {
		return []domain.Group{}, 0, nil
	}

	groups, err := r.selectGroups(ctx, search, page, limit)
	if err != nil {
		return nil, 0, err
	}

	return groups, total, nil
}

// countGroups returns the total number of non-deleted groups matching the search.
func (r *GroupRepository) countGroups(ctx context.Context, search string) (int, error) {
	query := "SELECT COUNT(*) FROM `groups` g WHERE g.deleted_at IS NULL"
	searchCondition, args := buildSearchCondition(search)
	query += searchCondition

	var total int
	if err := r.db.QueryRowContext(ctx, query, args...).Scan(&total); err != nil {
		return 0, domain.ErrInternalServerError
	}

	return total, nil
}

// selectGroups returns a page of non-deleted groups with member counts matching the search.
func (r *GroupRepository) selectGroups(ctx context.Context, search string, page, limit int) ([]domain.Group, error) {
	query := "SELECT " + groupBaseColumns + ", COUNT(gm.id) AS member_count" +
		" FROM `groups` g LEFT JOIN group_members gm ON g.id = gm.group_id" +
		" WHERE g.deleted_at IS NULL"

	searchCondition, args := buildSearchCondition(search)
	query += searchCondition //nolint:gosec // search condition uses parameterized placeholders

	query += " GROUP BY " + groupBaseColumns
	offset := (page - 1) * limit
	query += " ORDER BY g.id DESC LIMIT ? OFFSET ?"
	args = append(args, limit, offset)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, domain.ErrInternalServerError
	}
	defer func() { _ = rows.Close() }()

	var groups []domain.Group

	for rows.Next() {
		var g domain.Group
		if scanErr := rows.Scan(&g.ID, &g.Name, &g.Description, &g.MemberCount); scanErr != nil {
			return nil, domain.ErrInternalServerError
		}

		groups = append(groups, g)
	}

	if rowsErr := rows.Err(); rowsErr != nil {
		return nil, domain.ErrInternalServerError
	}

	if groups == nil {
		groups = []domain.Group{}
	}

	return groups, nil
}

// buildSearchCondition returns an AND search condition for each whitespace-delimited token.
func buildSearchCondition(search string) (string, []interface{}) {
	tokens := strings.Fields(search)
	if len(tokens) == 0 {
		return "", nil
	}

	conditions := make([]string, 0, len(tokens))
	args := make([]interface{}, 0, len(tokens)*2)

	for _, token := range tokens {
		conditions = append(conditions, "(g.name LIKE ? OR g.description LIKE ?)")

		like := "%" + token + "%"
		args = append(args, like, like)
	}

	return " AND " + strings.Join(conditions, " AND "), args
}
