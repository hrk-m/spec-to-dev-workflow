// Package group implements the group use case.
package group

import (
	"context"
	"strings"

	"github.com/hrk-m/spec-to-dev-workflow/sample-api/domain"
)

const (
	defaultLimit = 500
	minLimit     = 1
	maxLimit     = 500
	minOffset    = 0

	minID              = 1
	minMemberLimit     = 1
	maxMemberLimit     = 500
	defaultMemberLimit = 500
	minMemberOffset    = 0

	maxNameLength = 100
)

// GroupRepository defines the interface for group data access.
type GroupRepository interface {
	ListGroups(ctx context.Context, q string, limit, offset int) ([]domain.Group, int, error)
	GetByID(ctx context.Context, id uint64) (domain.Group, error)
	ListGroupMembers(ctx context.Context, id, limit, offset uint64, q string) ([]domain.GroupMember, int, error)
	Store(ctx context.Context, name, description string) (domain.Group, error)
	Update(ctx context.Context, id int64, name, description string) (*domain.Group, error)
}

// Service handles group business logic.
type Service struct {
	repo GroupRepository
}

// NewService returns a new Service instance.
func NewService(repo GroupRepository) *Service {
	return &Service{repo: repo}
}

// GetByID returns a group by its ID.
func (s *Service) GetByID(ctx context.Context, id uint64) (domain.Group, error) {
	if id < minID {
		return domain.Group{}, domain.ErrBadParamInput
	}

	return s.repo.GetByID(ctx, id)
}

// ListGroupMembers returns a paginated list of members for a group.
func (s *Service) ListGroupMembers(ctx context.Context, id, limit, offset uint64, q string) ([]domain.GroupMember, int, error) {
	if id < minID {
		return nil, 0, domain.ErrBadParamInput
	}
	if limit < minMemberLimit || limit > maxMemberLimit {
		return nil, 0, domain.ErrBadParamInput
	}

	// Check group existence first.
	if _, err := s.repo.GetByID(ctx, id); err != nil {
		return nil, 0, err
	}

	members, total, err := s.repo.ListGroupMembers(ctx, id, limit, offset, q)
	if err != nil {
		return nil, 0, err
	}

	if members == nil {
		members = []domain.GroupMember{}
	}

	return members, total, nil
}

// Store creates a new group after validating the name.
func (s *Service) Store(ctx context.Context, name, description string) (domain.Group, error) {
	name = strings.TrimSpace(name)
	if name == "" || len(name) > maxNameLength {
		return domain.Group{}, domain.ErrBadParamInput
	}

	return s.repo.Store(ctx, name, description)
}

// Update updates a group's name and description by ID.
func (s *Service) Update(ctx context.Context, id int64, name, description string) (*domain.Group, error) {
	name = strings.TrimSpace(name)
	if name == "" || len(name) > maxNameLength {
		return nil, domain.ErrBadParamInput
	}

	return s.repo.Update(ctx, id, name, description)
}

// ListGroups returns a paginated list of groups filtered by q keyword.
func (s *Service) ListGroups(ctx context.Context, q string, limit, offset int) ([]domain.Group, int, error) {
	if limit < minLimit || limit > maxLimit {
		return nil, 0, domain.ErrBadParamInput
	}
	if offset < minOffset {
		return nil, 0, domain.ErrBadParamInput
	}

	return s.repo.ListGroups(ctx, q, limit, offset)
}
