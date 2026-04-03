// Package domain defines the core domain models.
package domain

// Group represents a group entity with its member count.
type Group struct {
	ID          uint64 `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	MemberCount int    `json:"member_count"`
}

// GroupMember represents a member of a group.
type GroupMember struct {
	ID        uint64 `json:"id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
}
