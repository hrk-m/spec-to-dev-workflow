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

	"github.com/hrk-m/spec-to-dev-workflow/sample-api/domain"
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

func countActiveGroups(t *testing.T, db *sql.DB) int {
	t.Helper()

	var total int
	require.NoError(t, db.QueryRow("SELECT COUNT(*) FROM `groups` WHERE deleted_at IS NULL").Scan(&total))

	return total
}

func TestListGroups_DefaultPagination(t *testing.T) {
	db := testDB(t)
	defer db.Close()

	repo := mysqlRepo.NewGroupRepository(db)
	groups, total, err := repo.ListGroups(context.Background(), "", 1, 10)

	assert.NoError(t, err)
	assert.Equal(t, countActiveGroups(t, db), total)
	assert.Len(t, groups, 10)
}

func TestListGroups_Search(t *testing.T) {
	db := testDB(t)
	defer db.Close()

	repo := mysqlRepo.NewGroupRepository(db)
	groups, total, err := repo.ListGroups(context.Background(), "001", 1, 10)

	assert.NoError(t, err)
	assert.Equal(t, countActiveGroups(t, db), total)
	assert.Len(t, groups, 1)
	assert.Equal(t, "Group 001", groups[0].Name)
}

func TestListGroups_SearchWithSpaceSeparatedTokens(t *testing.T) {
	db := testDB(t)
	defer db.Close()

	repo := mysqlRepo.NewGroupRepository(db)
	groups, total, err := repo.ListGroups(context.Background(), "001 Description", 1, 10)

	assert.NoError(t, err)
	assert.Equal(t, countActiveGroups(t, db), total)
	assert.Len(t, groups, 1)
	assert.Equal(t, "Group 001", groups[0].Name)
}

func TestListGroups_LastPage(t *testing.T) {
	db := testDB(t)
	defer db.Close()

	repo := mysqlRepo.NewGroupRepository(db)
	groups, total, err := repo.ListGroups(context.Background(), "", 3, 10)

	assert.NoError(t, err)
	assert.Equal(t, countActiveGroups(t, db), total)
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
	assert.Equal(t, countActiveGroups(t, db), total) // g999 excluded
}

func TestStore_OK(t *testing.T) {
	db := testDB(t)
	defer db.Close()

	repo := mysqlRepo.NewGroupRepository(db)
	g, err := repo.Store(context.Background(), "New Group", "A new group description")

	require.NoError(t, err)
	assert.NotZero(t, g.ID)
	assert.Equal(t, "New Group", g.Name)
	assert.Equal(t, "A new group description", g.Description)
	assert.Equal(t, 0, g.MemberCount)

	// Cleanup
	defer db.Exec("DELETE FROM `groups` WHERE id = ?", g.ID) //nolint:errcheck
}

func TestStore_DBError(t *testing.T) {
	db := testDB(t)
	// Close the DB connection to force an INSERT failure.
	db.Close()

	repo := mysqlRepo.NewGroupRepository(db)
	g, err := repo.Store(context.Background(), "Should Fail", "desc")

	assert.ErrorIs(t, err, domain.ErrInternalServerError)
	assert.Equal(t, domain.Group{}, g)
}

func TestUpdate_OK(t *testing.T) {
	db := testDB(t)
	defer db.Close()

	// Insert a group to update.
	result, err := db.Exec("INSERT INTO `groups` (name, description) VALUES ('Before Update', 'old desc')")
	require.NoError(t, err)

	id, err := result.LastInsertId()
	require.NoError(t, err)

	defer db.Exec("DELETE FROM `groups` WHERE id = ?", id) //nolint:errcheck

	repo := mysqlRepo.NewGroupRepository(db)
	g, err := repo.Update(context.Background(), id, "After Update", "new desc")

	require.NoError(t, err)
	assert.Equal(t, uint64(id), g.ID) //nolint:gosec
	assert.Equal(t, "After Update", g.Name)
	assert.Equal(t, "new desc", g.Description)
	assert.Equal(t, 0, g.MemberCount)
}

func TestUpdate_NotFound(t *testing.T) {
	db := testDB(t)
	defer db.Close()

	repo := mysqlRepo.NewGroupRepository(db)
	_, err := repo.Update(context.Background(), 999999999, "name", "desc")

	assert.ErrorIs(t, err, domain.ErrNotFound)
}

func TestDelete_OK(t *testing.T) {
	db := testDB(t)
	defer db.Close()

	// Insert a group to delete.
	result, err := db.Exec("INSERT INTO `groups` (name, description) VALUES ('To Delete', 'delete me')")
	require.NoError(t, err)

	id, err := result.LastInsertId()
	require.NoError(t, err)

	defer db.Exec("DELETE FROM `groups` WHERE id = ?", id) //nolint:errcheck

	repo := mysqlRepo.NewGroupRepository(db)
	err = repo.Delete(context.Background(), id)

	require.NoError(t, err)

	// Verify deleted_at is set.
	var deletedAt sql.NullTime
	row := db.QueryRow("SELECT deleted_at FROM `groups` WHERE id = ?", id)
	require.NoError(t, row.Scan(&deletedAt))
	assert.True(t, deletedAt.Valid)
}

func TestDelete_NotFound(t *testing.T) {
	db := testDB(t)
	defer db.Close()

	repo := mysqlRepo.NewGroupRepository(db)
	err := repo.Delete(context.Background(), 999999999)

	assert.ErrorIs(t, err, domain.ErrNotFound)
}
