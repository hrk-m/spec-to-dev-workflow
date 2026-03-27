package hello

import (
	"context"

	"github.com/hrk-m/spec-to-dev-workflow/sample-api/domain"
)

type Service struct{}

func NewService() *Service {
	return &Service{}
}

func (s *Service) GetHello(ctx context.Context) (domain.Hello, error) {
	return domain.Hello{Message: "hello"}, nil
}
