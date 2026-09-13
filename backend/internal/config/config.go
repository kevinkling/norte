package config

import (
	"os"
	"path/filepath"
	"strconv"
)

type Config struct {
	Port             string
	SQLitePath       string
	TombstoneTTLDays int
	MaxUploadBytes   int64
}

func Load() Config {
	cfg := Config{
		Port:             envOr("PORT", "8080"),
		SQLitePath:       envOr("SQLITE_PATH", defaultSQLitePath()),
		TombstoneTTLDays: envInt("TOMBSTONE_TTL_DAYS", 90),
		MaxUploadBytes:   envInt64("MAX_UPLOAD_BYTES", 10*1024*1024),
	}
	return cfg
}

func defaultSQLitePath() string {
	candidates := []string{
		filepath.Join("data", "norte.db"),
		filepath.Join("..", "data", "norte.db"),
	}
	for _, p := range candidates {
		if _, err := os.Stat(p); err == nil {
			return p
		}
	}
	return filepath.Join("data", "norte.db")
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func envInt(key string, fallback int) int {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return n
}

func envInt64(key string, fallback int64) int64 {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	n, err := strconv.ParseInt(v, 10, 64)
	if err != nil {
		return fallback
	}
	return n
}
