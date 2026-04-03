CREATE DATABASE IF NOT EXISTS sample;
USE sample;

CREATE TABLE IF NOT EXISTS `groups` (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(255)    NOT NULL,
  description TEXT            NOT NULL,
  deleted_at  DATETIME        NULL
);

CREATE TABLE IF NOT EXISTS users (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  first_name VARCHAR(255)    NOT NULL,
  last_name  VARCHAR(255)    NOT NULL
);

CREATE TABLE IF NOT EXISTS group_members (
  id       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  group_id BIGINT UNSIGNED NOT NULL,
  user_id  BIGINT UNSIGNED NOT NULL,
  CONSTRAINT fk_group_members_group_id FOREIGN KEY (group_id) REFERENCES `groups`(id),
  CONSTRAINT fk_group_members_user_id  FOREIGN KEY (user_id)  REFERENCES users(id)
);

CREATE INDEX idx_group_members_group_id ON group_members(group_id);
CREATE INDEX idx_group_members_user_id  ON group_members(user_id);
