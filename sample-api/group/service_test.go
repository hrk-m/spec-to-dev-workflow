package group_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"github.com/hrk-m/spec-to-dev-workflow/sample-api/domain"
	"github.com/hrk-m/spec-to-dev-workflow/sample-api/group"
	"github.com/hrk-m/spec-to-dev-workflow/sample-api/group/mocks"
)

func TestService_GetByID_OK(t *testing.T) {
	repo := new(mocks.MockGroupRepository)
	svc := group.NewService(repo)

	expected := domain.Group{ID: 1, Name: "dev-team", Description: "developers", MemberCount: 5}
	repo.On("GetByID", mock.Anything, uint64(1)).Return(expected, nil)

	result, err := svc.GetByID(context.Background(), 1)

	assert.NoError(t, err)
	assert.Equal(t, expected, result)
	repo.AssertExpectations(t)
}

func TestService_GetByID_NotFound(t *testing.T) {
	repo := new(mocks.MockGroupRepository)
	svc := group.NewService(repo)

	repo.On("GetByID", mock.Anything, uint64(9999)).
		Return(domain.Group{}, domain.ErrNotFound)

	_, err := svc.GetByID(context.Background(), 9999)

	assert.ErrorIs(t, err, domain.ErrNotFound)
	repo.AssertExpectations(t)
}

func TestService_GetByID_InvalidID(t *testing.T) {
	repo := new(mocks.MockGroupRepository)
	svc := group.NewService(repo)

	_, err := svc.GetByID(context.Background(), 0)

	assert.ErrorIs(t, err, domain.ErrBadParamInput)
	repo.AssertNotCalled(t, "GetByID")
}

func TestService_GetByID_RepositoryError(t *testing.T) {
	repo := new(mocks.MockGroupRepository)
	svc := group.NewService(repo)

	repo.On("GetByID", mock.Anything, uint64(1)).
		Return(domain.Group{}, domain.ErrInternalServerError)

	_, err := svc.GetByID(context.Background(), 1)

	assert.ErrorIs(t, err, domain.ErrInternalServerError)
	repo.AssertExpectations(t)
}

func TestService_ListGroupMembers_OK(t *testing.T) {
	repo := new(mocks.MockGroupRepository)
	svc := group.NewService(repo)

	groupResp := domain.Group{ID: 1, Name: "dev-team", Description: "developers", MemberCount: 2}
	repo.On("GetByID", mock.Anything, uint64(1)).Return(groupResp, nil)

	members := []domain.GroupMember{
		{ID: 1, FirstName: "Taro", LastName: "Yamada"},
		{ID: 2, FirstName: "Hanako", LastName: "Suzuki"},
	}
	repo.On("ListGroupMembers", mock.Anything, uint64(1), uint64(500), uint64(0), "").
		Return(members, 2, nil)

	result, total, err := svc.ListGroupMembers(context.Background(), 1, 500, 0, "")

	assert.NoError(t, err)
	assert.Len(t, result, 2)
	assert.Equal(t, 2, total)
	repo.AssertExpectations(t)
}

func TestService_ListGroupMembers_WithSearch(t *testing.T) {
	repo := new(mocks.MockGroupRepository)
	svc := group.NewService(repo)

	groupResp := domain.Group{ID: 1, Name: "dev-team", Description: "developers", MemberCount: 2}
	repo.On("GetByID", mock.Anything, uint64(1)).Return(groupResp, nil)

	members := []domain.GroupMember{
		{ID: 1, FirstName: "Taro", LastName: "Yamada"},
	}
	repo.On("ListGroupMembers", mock.Anything, uint64(1), uint64(500), uint64(0), "Yamada").
		Return(members, 2, nil)

	result, total, err := svc.ListGroupMembers(context.Background(), 1, 500, 0, "Yamada")

	assert.NoError(t, err)
	assert.Len(t, result, 1)
	assert.Equal(t, 2, total)
	repo.AssertExpectations(t)
}

func TestService_ListGroupMembers_GroupNotFound(t *testing.T) {
	repo := new(mocks.MockGroupRepository)
	svc := group.NewService(repo)

	repo.On("GetByID", mock.Anything, uint64(9999)).
		Return(domain.Group{}, domain.ErrNotFound)

	_, _, err := svc.ListGroupMembers(context.Background(), 9999, 500, 0, "")

	assert.ErrorIs(t, err, domain.ErrNotFound)
	repo.AssertNotCalled(t, "ListGroupMembers")
}

func TestService_ListGroupMembers_InvalidID(t *testing.T) {
	repo := new(mocks.MockGroupRepository)
	svc := group.NewService(repo)

	_, _, err := svc.ListGroupMembers(context.Background(), 0, 500, 0, "")

	assert.ErrorIs(t, err, domain.ErrBadParamInput)
	repo.AssertNotCalled(t, "GetByID")
	repo.AssertNotCalled(t, "ListGroupMembers")
}

func TestService_ListGroupMembers_InvalidLimitTooLow(t *testing.T) {
	repo := new(mocks.MockGroupRepository)
	svc := group.NewService(repo)

	_, _, err := svc.ListGroupMembers(context.Background(), 1, 0, 0, "")

	assert.ErrorIs(t, err, domain.ErrBadParamInput)
	repo.AssertNotCalled(t, "GetByID")
}

func TestService_ListGroupMembers_InvalidLimitTooHigh(t *testing.T) {
	repo := new(mocks.MockGroupRepository)
	svc := group.NewService(repo)

	_, _, err := svc.ListGroupMembers(context.Background(), 1, 501, 0, "")

	assert.ErrorIs(t, err, domain.ErrBadParamInput)
	repo.AssertNotCalled(t, "GetByID")
}

func TestService_ListGroupMembers_RepositoryError(t *testing.T) {
	repo := new(mocks.MockGroupRepository)
	svc := group.NewService(repo)

	groupResp := domain.Group{ID: 1, Name: "dev-team", Description: "developers", MemberCount: 2}
	repo.On("GetByID", mock.Anything, uint64(1)).Return(groupResp, nil)
	repo.On("ListGroupMembers", mock.Anything, uint64(1), uint64(500), uint64(0), "").
		Return([]domain.GroupMember(nil), 0, domain.ErrInternalServerError)

	_, _, err := svc.ListGroupMembers(context.Background(), 1, 500, 0, "")

	assert.ErrorIs(t, err, domain.ErrInternalServerError)
	repo.AssertExpectations(t)
}

func TestService_ListGroupMembers_EmptyResult(t *testing.T) {
	repo := new(mocks.MockGroupRepository)
	svc := group.NewService(repo)

	groupResp := domain.Group{ID: 1, Name: "dev-team", Description: "developers", MemberCount: 0}
	repo.On("GetByID", mock.Anything, uint64(1)).Return(groupResp, nil)
	repo.On("ListGroupMembers", mock.Anything, uint64(1), uint64(500), uint64(0), "").
		Return([]domain.GroupMember(nil), 0, nil)

	result, total, err := svc.ListGroupMembers(context.Background(), 1, 500, 0, "")

	assert.NoError(t, err)
	assert.Empty(t, result)
	assert.NotNil(t, result)
	assert.Equal(t, 0, total)
	repo.AssertExpectations(t)
}

func TestService_ListGroups_OK(t *testing.T) {
	repo := new(mocks.MockGroupRepository)
	svc := group.NewService(repo)

	groups := []domain.Group{
		{ID: 1, Name: "group1", Description: "desc1", MemberCount: 1},
	}
	repo.On("ListGroups", mock.Anything, "", 1, 20).Return(groups, 1, nil)

	result, total, err := svc.ListGroups(context.Background(), "", 1, 20)

	assert.NoError(t, err)
	assert.Len(t, result, 1)
	assert.Equal(t, "group1", result[0].Name)
	assert.Equal(t, 1, total)
	repo.AssertExpectations(t)
}

func TestService_ListGroups_WithSearch(t *testing.T) {
	repo := new(mocks.MockGroupRepository)
	svc := group.NewService(repo)

	groups := []domain.Group{
		{ID: 2, Name: "dev-team", Description: "developers", MemberCount: 0},
	}
	repo.On("ListGroups", mock.Anything, "dev", 1, 10).Return(groups, 1, nil)

	result, _, err := svc.ListGroups(context.Background(), "dev", 1, 10)

	assert.NoError(t, err)
	assert.Len(t, result, 1)
	assert.Equal(t, "dev-team", result[0].Name)
	repo.AssertExpectations(t)
}

func TestService_ListGroups_InvalidPage(t *testing.T) {
	repo := new(mocks.MockGroupRepository)
	svc := group.NewService(repo)

	_, _, err := svc.ListGroups(context.Background(), "", 0, 20)

	assert.ErrorIs(t, err, domain.ErrBadParamInput)
	repo.AssertNotCalled(t, "ListGroups")
}

func TestService_ListGroups_InvalidLimitTooLow(t *testing.T) {
	repo := new(mocks.MockGroupRepository)
	svc := group.NewService(repo)

	_, _, err := svc.ListGroups(context.Background(), "", 1, 0)

	assert.ErrorIs(t, err, domain.ErrBadParamInput)
	repo.AssertNotCalled(t, "ListGroups")
}

func TestService_ListGroups_InvalidLimitTooHigh(t *testing.T) {
	repo := new(mocks.MockGroupRepository)
	svc := group.NewService(repo)

	_, _, err := svc.ListGroups(context.Background(), "", 1, 101)

	assert.ErrorIs(t, err, domain.ErrBadParamInput)
	repo.AssertNotCalled(t, "ListGroups")
}

func TestService_ListGroups_RepositoryError(t *testing.T) {
	repo := new(mocks.MockGroupRepository)
	svc := group.NewService(repo)

	repo.On("ListGroups", mock.Anything, "", 1, 20).
		Return([]domain.Group(nil), 0, domain.ErrInternalServerError)

	_, _, err := svc.ListGroups(context.Background(), "", 1, 20)

	assert.ErrorIs(t, err, domain.ErrInternalServerError)
	repo.AssertExpectations(t)
}
