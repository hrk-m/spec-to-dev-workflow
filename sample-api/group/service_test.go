package group_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/hrk-m/spec-to-dev-workflow/sample-api/domain"
	"github.com/hrk-m/spec-to-dev-workflow/sample-api/group"
)

type mockGroupRepository struct {
	mock.Mock
}

func (m *mockGroupRepository) ListGroups(ctx context.Context, search string, page, limit int) ([]domain.Group, int, error) {
	args := m.Called(ctx, search, page, limit)
	return args.Get(0).([]domain.Group), args.Int(1), args.Error(2)
}

func TestService_ListGroups_OK(t *testing.T) {
	repo := new(mockGroupRepository)
	svc := group.NewService(repo)

	groups := []domain.Group{
		{ID: 1, Name: "group1", Description: "desc1", MemberCount: 1},
	}
	repo.On("ListGroups", mock.Anything, "", 1, 20).Return(groups, 1, nil)

	result, err := svc.ListGroups(context.Background(), "", 1, 20)

	assert.NoError(t, err)
	assert.Len(t, result.Groups, 1)
	assert.Equal(t, "group1", result.Groups[0].Name)
	assert.Equal(t, 1, result.Pagination.Total)
	assert.Equal(t, 1, result.Pagination.Page)
	assert.Equal(t, 20, result.Pagination.Limit)
	repo.AssertExpectations(t)
}

func TestService_ListGroups_WithSearch(t *testing.T) {
	repo := new(mockGroupRepository)
	svc := group.NewService(repo)

	groups := []domain.Group{
		{ID: 2, Name: "dev-team", Description: "developers", MemberCount: 0},
	}
	repo.On("ListGroups", mock.Anything, "dev", 1, 10).Return(groups, 1, nil)

	result, err := svc.ListGroups(context.Background(), "dev", 1, 10)

	assert.NoError(t, err)
	assert.Len(t, result.Groups, 1)
	assert.Equal(t, "dev-team", result.Groups[0].Name)
	repo.AssertExpectations(t)
}

func TestService_ListGroups_InvalidPage(t *testing.T) {
	repo := new(mockGroupRepository)
	svc := group.NewService(repo)

	_, err := svc.ListGroups(context.Background(), "", 0, 20)

	assert.ErrorIs(t, err, domain.ErrBadParamInput)
	repo.AssertNotCalled(t, "ListGroups")
}

func TestService_ListGroups_InvalidLimitTooLow(t *testing.T) {
	repo := new(mockGroupRepository)
	svc := group.NewService(repo)

	_, err := svc.ListGroups(context.Background(), "", 1, 0)

	assert.ErrorIs(t, err, domain.ErrBadParamInput)
	repo.AssertNotCalled(t, "ListGroups")
}

func TestService_ListGroups_InvalidLimitTooHigh(t *testing.T) {
	repo := new(mockGroupRepository)
	svc := group.NewService(repo)

	_, err := svc.ListGroups(context.Background(), "", 1, 101)

	assert.ErrorIs(t, err, domain.ErrBadParamInput)
	repo.AssertNotCalled(t, "ListGroups")
}

func TestService_ListGroups_RepositoryError(t *testing.T) {
	repo := new(mockGroupRepository)
	svc := group.NewService(repo)

	repo.On("ListGroups", mock.Anything, "", 1, 20).
		Return([]domain.Group(nil), 0, domain.ErrInternalServerError)

	_, err := svc.ListGroups(context.Background(), "", 1, 20)

	assert.ErrorIs(t, err, domain.ErrInternalServerError)
	repo.AssertExpectations(t)
}
