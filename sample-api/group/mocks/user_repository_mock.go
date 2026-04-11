// Package mocks provides test doubles for the group package.
package mocks

import (
	"context"

	"github.com/stretchr/testify/mock"

	"github.com/hrk-m/spec-to-dev-workflow/sample-api/domain"
)

// MockUserRepository is a testify mock for group.UserRepository.
type MockUserRepository struct {
	mock.Mock
}

// GetByID returns a user by its ID.
func (m *MockUserRepository) GetByID(ctx context.Context, id uint64) (domain.User, error) {
	args := m.Called(ctx, id)
	return args.Get(0).(domain.User), args.Error(1)
}
