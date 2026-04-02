// Package domain defines the core domain models.
package domain

// Group represents a group entity with its member count.
type Group struct {
	ID          uint64 `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	MemberCount int    `json:"member_count"`
}

// Pagination represents pagination metadata for list responses.
type Pagination struct {
	Total int `json:"total"`
	Page  int `json:"page"`
	Limit int `json:"limit"`
}

// GroupListResponse represents the response payload for listing groups.
type GroupListResponse struct {
	Groups     []Group    `json:"groups"`
	Pagination Pagination `json:"pagination"`
}
