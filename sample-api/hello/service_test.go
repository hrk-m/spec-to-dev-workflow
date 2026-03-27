package hello_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"

	"github.com/hrk-m/spec-to-dev-workflow/sample-api/hello"
)

func TestService_GetHello(t *testing.T) {
	svc := hello.NewService()
	result, err := svc.GetHello(context.Background())

	assert.NoError(t, err)
	assert.Equal(t, "hello", result.Message)
}
