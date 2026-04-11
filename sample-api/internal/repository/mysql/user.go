// Package mysql provides MySQL implementations of repository interfaces.
package mysql

import (
	"context"
	"database/sql"
	"errors"

	"github.com/hrk-m/spec-to-dev-workflow/sample-api/domain"
)

const (
	selectUserByIDQuery     = "SELECT id, first_name, last_name FROM users WHERE id = ? AND deleted_at IS NULL"
	searchKeyLikeClause     = " AND search_key LIKE ?"
	orderByIDPaginationClause = " ORDER BY id ASC LIMIT ? OFFSET ?"
)

// UserRepository is a MySQL implementation of user.UserRepository and group.UserRepository.
type UserRepository struct {
	db *sql.DB
}

// NewUserRepository returns a new UserRepository.
func NewUserRepository(db *sql.DB) *UserRepository {
	return &UserRepository{db: db}
}

// ListUsers returns paginated active users with optional name search.
func (r *UserRepository) ListUsers(ctx context.Context, q string, limit, offset int) ([]domain.User, int, error) {
	total, err := r.countUsers(ctx)
	if err != nil {
		return nil, 0, err
	}

	if total == 0 {
		return []domain.User{}, 0, nil
	}

	users, err := r.selectUsers(ctx, q, limit, offset)
	if err != nil {
		return nil, 0, err
	}

	return users, total, nil
}

// GetByID returns a single active user by ID.
func (r *UserRepository) GetByID(ctx context.Context, id uint64) (domain.User, error) {
	query := selectUserByIDQuery

	var u domain.User

	err := r.db.QueryRowContext(ctx, query, id).Scan(&u.ID, &u.FirstName, &u.LastName)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return domain.User{}, domain.ErrNotFound
		}

		return domain.User{}, domain.ErrInternalServerError
	}

	return u, nil
}

func (r *UserRepository) countUsers(ctx context.Context) (int, error) {
	query := "SELECT COUNT(*) FROM users WHERE deleted_at IS NULL"

	var total int
	if err := r.db.QueryRowContext(ctx, query).Scan(&total); err != nil {
		return 0, domain.ErrInternalServerError
	}

	return total, nil
}

func (r *UserRepository) selectUsers(ctx context.Context, q string, limit, offset int) ([]domain.User, error) {
	query := "SELECT id, first_name, last_name FROM users WHERE deleted_at IS NULL"
	args := make([]interface{}, 0, 3)

	if q != "" {
		query += searchKeyLikeClause
		args = append(args, "%"+q+"%")
	}

	query += orderByIDPaginationClause
	args = append(args, limit, offset)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, domain.ErrInternalServerError
	}
	defer func() { _ = rows.Close() }()

	var users []domain.User
	for rows.Next() {
		var u domain.User
		if scanErr := rows.Scan(&u.ID, &u.FirstName, &u.LastName); scanErr != nil {
			return nil, domain.ErrInternalServerError
		}

		users = append(users, u)
	}

	if rowsErr := rows.Err(); rowsErr != nil {
		return nil, domain.ErrInternalServerError
	}

	if users == nil {
		users = []domain.User{}
	}

	return users, nil
}
