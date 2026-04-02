// Package group implements the group use case.
package group

import (
	"context"

	"github.com/hrk-m/spec-to-dev-workflow/sample-api/domain"
)

const (
	minPage  = 1
	minLimit = 1
	maxLimit = 100
)

// GroupRepository defines the interface for group data access.
type GroupRepository interface {
	ListGroups(ctx context.Context, search string, page, limit int) ([]domain.Group, int, error)
}

// Service handles group business logic.
type Service struct {
	repo GroupRepository
}

// NewService returns a new Service instance.
func NewService(repo GroupRepository) *Service {
	return &Service{repo: repo}
}

// ListGroups returns a paginated list of groups filtered by search.
func (s *Service) ListGroups(ctx context.Context, search string, page, limit int) (domain.GroupListResponse, error) {
	if page < minPage {
		return domain.GroupListResponse{}, domain.ErrBadParamInput
	}
	if limit < minLimit || limit > maxLimit {
		return domain.GroupListResponse{}, domain.ErrBadParamInput
	}

	groups, total, err := s.repo.ListGroups(ctx, search, page, limit)
	if err != nil {
		return domain.GroupListResponse{}, err
	}

	return domain.GroupListResponse{
		Groups: groups,
		Pagination: domain.Pagination{
			Total: total,
			Page:  page,
			Limit: limit,
		},
	}, nil
}
