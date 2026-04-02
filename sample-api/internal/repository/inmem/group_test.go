package inmem_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/hrk-m/spec-to-dev-workflow/sample-api/internal/repository/inmem"
)

func TestGroupRepository_ListGroups_All(t *testing.T) {
	repo := inmem.NewGroupRepository()

	groups, total, err := repo.ListGroups(context.Background(), "", 1, 10)

	assert.NoError(t, err)
	assert.Equal(t, 3, total)
	assert.Len(t, groups, 3)
}

func TestGroupRepository_ListGroups_WithSearch(t *testing.T) {
	repo := inmem.NewGroupRepository()

	groups, total, err := repo.ListGroups(context.Background(), "engineer", 1, 10)

	assert.NoError(t, err)
	assert.Equal(t, 1, total)
	assert.Len(t, groups, 1)
	assert.Equal(t, "engineering", groups[0].Name)
}

func TestGroupRepository_ListGroups_WithSpaceSeparatedSearch(t *testing.T) {
	repo := inmem.NewGroupRepository()

	groups, total, err := repo.ListGroups(context.Background(), "team engineering", 1, 10)

	assert.NoError(t, err)
	assert.Equal(t, 1, total)
	assert.Len(t, groups, 1)
	assert.Equal(t, "engineering", groups[0].Name)
}

func TestGroupRepository_ListGroups_Pagination(t *testing.T) {
	repo := inmem.NewGroupRepository()

	groups, total, err := repo.ListGroups(context.Background(), "", 1, 2)

	assert.NoError(t, err)
	assert.Equal(t, 3, total)
	assert.Len(t, groups, 2)

	groups2, total2, err := repo.ListGroups(context.Background(), "", 2, 2)

	assert.NoError(t, err)
	assert.Equal(t, 3, total2)
	assert.Len(t, groups2, 1)
}

func TestGroupRepository_ListGroups_PageBeyondTotal(t *testing.T) {
	repo := inmem.NewGroupRepository()

	groups, total, err := repo.ListGroups(context.Background(), "", 100, 10)

	assert.NoError(t, err)
	assert.Equal(t, 3, total)
	assert.Empty(t, groups)
}

func TestGroupRepository_ListGroups_CaseInsensitiveSearch(t *testing.T) {
	repo := inmem.NewGroupRepository()

	groups, total, err := repo.ListGroups(context.Background(), "DESIGN", 1, 10)

	assert.NoError(t, err)
	assert.Equal(t, 1, total)
	assert.Len(t, groups, 1)
	assert.Equal(t, "design", groups[0].Name)
}

func TestGroupRepository_ListGroups_MemberCount(t *testing.T) {
	repo := inmem.NewGroupRepository()

	groups, _, err := repo.ListGroups(context.Background(), "engineering", 1, 10)

	assert.NoError(t, err)
	assert.Equal(t, 2, groups[0].MemberCount)
}
