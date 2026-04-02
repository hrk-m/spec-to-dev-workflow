//go:build integration

package mysql_test

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"testing"

	_ "github.com/go-sql-driver/mysql"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	mysqlRepo "github.com/hrk-m/spec-to-dev-workflow/sample-api/internal/repository/mysql"
)

func testDB(t *testing.T) *sql.DB {
	t.Helper()

	host := getEnv("MYSQL_HOST", "localhost")
	port := getEnv("MYSQL_PORT", "3306")
	user := getEnv("MYSQL_USER", "root")
	pass := getEnv("MYSQL_PASSWORD", "password")
	dbname := getEnv("MYSQL_DATABASE", "sample")
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true", user, pass, host, port, dbname)

	db, err := sql.Open("mysql", dsn)
	require.NoError(t, err)
	require.NoError(t, db.Ping())

	return db
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}

	return fallback
}

func TestListGroups_DefaultPagination(t *testing.T) {
	db := testDB(t)
	defer db.Close()

	repo := mysqlRepo.NewGroupRepository(db)
	groups, total, err := repo.ListGroups(context.Background(), "", 1, 10)

	assert.NoError(t, err)
	assert.Equal(t, 30, total)
	assert.Len(t, groups, 10)
}

func TestListGroups_Search(t *testing.T) {
	db := testDB(t)
	defer db.Close()

	repo := mysqlRepo.NewGroupRepository(db)
	groups, total, err := repo.ListGroups(context.Background(), "001", 1, 10)

	assert.NoError(t, err)
	assert.Equal(t, 1, total)
	assert.Len(t, groups, 1)
	assert.Equal(t, "Group 001", groups[0].Name)
}

func TestListGroups_SearchWithSpaceSeparatedTokens(t *testing.T) {
	db := testDB(t)
	defer db.Close()

	repo := mysqlRepo.NewGroupRepository(db)
	groups, total, err := repo.ListGroups(context.Background(), "001 Description", 1, 10)

	assert.NoError(t, err)
	assert.Equal(t, 1, total)
	assert.Len(t, groups, 1)
	assert.Equal(t, "Group 001", groups[0].Name)
}

func TestListGroups_LastPage(t *testing.T) {
	db := testDB(t)
	defer db.Close()

	repo := mysqlRepo.NewGroupRepository(db)
	groups, total, err := repo.ListGroups(context.Background(), "", 3, 10)

	assert.NoError(t, err)
	assert.Equal(t, 30, total)
	assert.Len(t, groups, 10)
}

func TestListGroups_MemberCount(t *testing.T) {
	db := testDB(t)
	defer db.Close()

	repo := mysqlRepo.NewGroupRepository(db)
	groups, _, err := repo.ListGroups(context.Background(), "030", 1, 10)

	assert.NoError(t, err)
	require.Len(t, groups, 1)
	// g030 is even -> 1 member
	assert.Equal(t, 1, groups[0].MemberCount)
}

func TestListGroups_ExcludesDeleted(t *testing.T) {
	db := testDB(t)
	defer db.Close()

	// Insert a deleted group
	result, err := db.Exec("INSERT INTO `groups` (name, description, deleted_at) VALUES ('Deleted', '', NOW())")
	require.NoError(t, err)

	deletedID, err := result.LastInsertId()
	require.NoError(t, err)

	defer db.Exec("DELETE FROM `groups` WHERE id = ?", deletedID) //nolint:errcheck

	repo := mysqlRepo.NewGroupRepository(db)
	_, total, err := repo.ListGroups(context.Background(), "", 1, 100)

	assert.NoError(t, err)
	assert.Equal(t, 30, total) // g999 excluded
}
