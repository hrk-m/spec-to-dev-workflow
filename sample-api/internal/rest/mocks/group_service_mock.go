// Package mocks provides test doubles for the rest package.
package mocks

import (
	"context"

	"github.com/stretchr/testify/mock"

	"github.com/hrk-m/spec-to-dev-workflow/sample-api/domain"
)

// MockGroupService is a testify mock for rest.GroupService.
type MockGroupService struct {
	mock.Mock
}

func (m *MockGroupService) ListGroups(ctx context.Context, search string, page, limit int) ([]domain.Group, int, error) {
	args := m.Called(ctx, search, page, limit)
	return args.Get(0).([]domain.Group), args.Int(1), args.Error(2)
}

func (m *MockGroupService) GetByID(ctx context.Context, id uint64) (domain.Group, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(domain.Group), args.Error(1)
}

func (m *MockGroupService) ListGroupMembers(ctx context.Context, id, limit, offset uint64, q string) ([]domain.GroupMember, int, error) {
	args := m.Called(ctx, id, limit, offset, q)
	return args.Get(0).([]domain.GroupMember), args.Int(1), args.Error(2)
}
