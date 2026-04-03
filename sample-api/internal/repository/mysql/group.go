// Package mysql provides MySQL implementations of repository interfaces.
package mysql

import (
	"context"
	"database/sql"
	"errors"
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

// ListGroups returns a filtered list of groups with unfiltered total count.
func (r *GroupRepository) ListGroups(ctx context.Context, q string, limit, offset int) ([]domain.Group, int, error) {
	total, err := r.countGroups(ctx)
	if err != nil {
		return nil, 0, err
	}

	if total == 0 {
		return []domain.Group{}, 0, nil
	}

	groups, err := r.selectGroups(ctx, q, limit, offset)
	if err != nil {
		return nil, 0, err
	}

	return groups, total, nil
}

// countGroups returns the total number of non-deleted groups (unfiltered).
func (r *GroupRepository) countGroups(ctx context.Context) (int, error) {
	query := "SELECT COUNT(*) FROM `groups` g WHERE g.deleted_at IS NULL"

	var total int
	if err := r.db.QueryRowContext(ctx, query).Scan(&total); err != nil {
		return 0, domain.ErrInternalServerError
	}

	return total, nil
}

// selectGroups returns non-deleted groups with member counts, optionally filtered by q.
func (r *GroupRepository) selectGroups(ctx context.Context, q string, limit, offset int) ([]domain.Group, error) {
	query := "SELECT " + groupBaseColumns + ", COUNT(gm.id) AS member_count" +
		" FROM `groups` g LEFT JOIN group_members gm ON g.id = gm.group_id" +
		" WHERE g.deleted_at IS NULL"

	searchCondition, args := buildSearchCondition(q)
	query += searchCondition //nolint:gosec // search condition uses parameterized placeholders

	query += " GROUP BY " + groupBaseColumns
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

// GetByID returns a single group by ID with its member count.
func (r *GroupRepository) GetByID(ctx context.Context, id uint64) (domain.Group, error) {
	query := "SELECT g.id, g.name, g.description, COUNT(gm.id) AS member_count" +
		" FROM `groups` g LEFT JOIN group_members gm ON g.id = gm.group_id" +
		" WHERE g.id = ? AND g.deleted_at IS NULL" +
		" GROUP BY g.id, g.name, g.description"

	var g domain.Group
	err := r.db.QueryRowContext(ctx, query, id).Scan(&g.ID, &g.Name, &g.Description, &g.MemberCount)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return domain.Group{}, domain.ErrNotFound
		}

		return domain.Group{}, domain.ErrInternalServerError
	}

	return g, nil
}

// ListGroupMembers returns paginated members for a group with optional name search.
func (r *GroupRepository) ListGroupMembers(ctx context.Context, id, limit, offset uint64, q string) ([]domain.GroupMember, int, error) {
	// Count total members for the group (without q filter).
	countQuery := "SELECT COUNT(*) FROM group_members WHERE group_id = ?"
	var total int

	if err := r.db.QueryRowContext(ctx, countQuery, id).Scan(&total); err != nil {
		return nil, 0, domain.ErrInternalServerError
	}

	if total == 0 {
		return []domain.GroupMember{}, 0, nil
	}

	// Fetch paginated members with optional q filter.
	query := "SELECT u.id, u.first_name, u.last_name" +
		" FROM group_members gm JOIN users u ON gm.user_id = u.id" +
		" WHERE gm.group_id = ?"
	args := []interface{}{id}

	if q != "" {
		query += " AND (u.first_name LIKE ? OR u.last_name LIKE ?)"
		like := "%" + q + "%"
		args = append(args, like, like)
	}

	query += " ORDER BY u.id LIMIT ? OFFSET ?"
	args = append(args, limit, offset)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, 0, domain.ErrInternalServerError
	}
	defer func() { _ = rows.Close() }()

	var members []domain.GroupMember

	for rows.Next() {
		var m domain.GroupMember
		if scanErr := rows.Scan(&m.ID, &m.FirstName, &m.LastName); scanErr != nil {
			return nil, 0, domain.ErrInternalServerError
		}

		members = append(members, m)
	}

	if rowsErr := rows.Err(); rowsErr != nil {
		return nil, 0, domain.ErrInternalServerError
	}

	if members == nil {
		members = []domain.GroupMember{}
	}

	return members, total, nil
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
