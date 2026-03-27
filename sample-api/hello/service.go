// Package hello implements the hello use case.
package hello

import (
	"context"

	"github.com/hrk-m/spec-to-dev-workflow/sample-api/domain"
)

// Service handles hello business logic.
type Service struct{}

// NewService returns a new Service instance.
func NewService() *Service {
	return &Service{}
}

// GetHello returns a hello message.
func (s *Service) GetHello(_ context.Context) (domain.Hello, error) {
	return domain.Hello{Message: "hello"}, nil
}
