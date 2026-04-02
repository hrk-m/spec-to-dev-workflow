// Package inmem provides in-memory repository implementations.
package inmem

import (
	"context"
	"strconv"
	"strings"

	"github.com/hrk-m/spec-to-dev-workflow/sample-api/domain"
)

// GroupRepository is an in-memory implementation of group.GroupRepository.
type GroupRepository struct {
	groups []domain.Group
}

// NewGroupRepository returns a new in-memory GroupRepository with seed data.
func NewGroupRepository() *GroupRepository {
	return &GroupRepository{
		groups: []domain.Group{
			{
				ID:          1,
				Name:        "engineering",
				Description: "Engineering team",
				MemberCount: 2,
			},
			{
				ID:          2,
				Name:        "design",
				Description: "Design team",
				MemberCount: 1,
			},
			{
				ID:          3,
				Name:        "product",
				Description: "Product management",
				MemberCount: 2,
			},
		},
	}
}

// ListGroups returns groups filtered by search with pagination.
func (r *GroupRepository) ListGroups(_ context.Context, search string, page, limit int) ([]domain.Group, int, error) {
	filtered := r.filterBySearch(search)
	total := len(filtered)

	offset := (page - 1) * limit
	if offset >= total {
		return []domain.Group{}, total, nil
	}

	end := offset + limit
	if end > total {
		end = total
	}

	return filtered[offset:end], total, nil
}

// filterBySearch returns groups whose id, name, or description contains the search string.
func (r *GroupRepository) filterBySearch(search string) []domain.Group {
	tokens := strings.Fields(search)
	if len(tokens) == 0 {
		return r.groups
	}

	var result []domain.Group

	for _, g := range r.groups {
		if matchesAllTokens(g, tokens) {
			result = append(result, g)
		}
	}

	return result
}

func matchesAllTokens(g domain.Group, tokens []string) bool {
	id := strings.ToLower(strconv.FormatUint(g.ID, 10))
	name := strings.ToLower(g.Name)
	description := strings.ToLower(g.Description)

	for _, token := range tokens {
		lower := strings.ToLower(token)
		if strings.Contains(id, lower) ||
			strings.Contains(name, lower) ||
			strings.Contains(description, lower) {
			continue
		}

		return false
	}

	return true
}
