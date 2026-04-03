USE sample;

-- 1. Create users table.
CREATE TABLE IF NOT EXISTS users (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(255) NOT NULL,
  last_name  VARCHAR(255) NOT NULL
);

-- 2. Insert seed users.
INSERT INTO users (first_name, last_name) VALUES
('Taro', 'Yamada'),
('Hanako', 'Suzuki'),
('Jiro', 'Tanaka'),
('Yuki', 'Sato'),
('Ken', 'Takahashi'),
('Mika', 'Watanabe'),
('Ryo', 'Ito'),
('Aya', 'Nakamura'),
('Shin', 'Kobayashi'),
('Mai', 'Kato'),
('Daiki', 'Yoshida'),
('Rina', 'Yamamoto'),
('Sota', 'Matsumoto'),
('Hana', 'Inoue'),
('Yuto', 'Kimura');

-- 3. Add user_id column (nullable initially to allow updating existing rows).
ALTER TABLE group_members ADD COLUMN user_id BIGINT UNSIGNED NULL;

-- 4. Update existing group_members with user_id values.
-- Map existing members to users in a round-robin fashion.
SET @row_num = 0;
SET @user_count = (SELECT COUNT(*) FROM users);

UPDATE group_members
SET user_id = ((@row_num := @row_num + 1) - 1) % @user_count + 1;

-- 5. Make user_id NOT NULL.
ALTER TABLE group_members MODIFY COLUMN user_id BIGINT UNSIGNED NOT NULL;

-- 6. Add foreign key constraint.
ALTER TABLE group_members ADD CONSTRAINT fk_group_members_user_id
  FOREIGN KEY (user_id) REFERENCES users(id);

-- 7. Drop the name column.
ALTER TABLE group_members DROP COLUMN name;

-- 8. Add indexes for performance.
CREATE INDEX idx_group_members_group_id ON group_members(group_id);
CREATE INDEX idx_group_members_user_id ON group_members(user_id);
