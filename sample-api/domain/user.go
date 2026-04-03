// Package domain defines the core domain models.
package domain

// User represents a user entity.
type User struct {
	ID        uint64 `json:"id"`
	FirstName string `json:"first_name"`
	LastName  string `json:"last_name"`
}
