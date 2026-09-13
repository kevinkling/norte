package media

import (
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

var (
	ErrNotFound   = errors.New("attachment not found")
	ErrTooLarge   = errors.New("file too large")
	ErrBadHash    = errors.New("sha256 mismatch")
	ErrBadType    = errors.New("unsupported content type")
)

type Service struct {
	DB             *sql.DB
	MaxUploadBytes int64
}

func allowedMIME(v string) bool {
	v = strings.ToLower(strings.TrimSpace(strings.Split(v, ";")[0]))
	switch v {
	case "image/jpeg", "image/png", "image/webp", "image/gif", "image/heic":
		return true
	default:
		return false
	}
}

func (s *Service) Put(id string, body io.Reader, contentType string, deviceID string) error {
	if !allowedMIME(contentType) {
		return ErrBadType
	}
	limited := io.LimitReader(body, s.MaxUploadBytes+1)
	data, err := io.ReadAll(limited)
	if err != nil {
		return err
	}
	if int64(len(data)) > s.MaxUploadBytes {
		return ErrTooLarge
	}
	sum := sha256.Sum256(data)
	hash := hex.EncodeToString(sum[:])

	tx, err := s.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	var expected string
	var rev int64
	err = tx.QueryRow(`SELECT sha256, revision FROM attachments WHERE id = ? AND deleted_at IS NULL`, id).Scan(&expected, &rev)
	if err == sql.ErrNoRows {
		return ErrNotFound
	}
	if err != nil {
		return err
	}
	if !strings.EqualFold(expected, hash) {
		return ErrBadHash
	}
	now := time.Now().UTC().Format(time.RFC3339Nano)
	newRev := rev + 1
	if _, err := tx.Exec(`
		UPDATE attachments
		SET data = ?, content_state = 'ready', byte_size = ?, mime_type = ?, revision = ?, updated_at = ?
		WHERE id = ?`, data, len(data), contentType, newRev, now, id); err != nil {
		return err
	}
	payload := fmt.Sprintf(`{"id":%q,"content_state":"ready","byte_size":%d,"sha256":%q,"mime_type":%q,"revision":%d,"updated_at":%q,"deleted_at":null}`,
		id, len(data), hash, contentType, newRev, now)
	if _, err := tx.Exec(`
		INSERT INTO change_log(entity_type, entity_id, operation, revision, changed_at, origin_device_id, payload_json)
		VALUES ('attachment', ?, 'upsert', ?, ?, ?, ?)`, id, newRev, now, deviceID, payload); err != nil {
		return err
	}
	return tx.Commit()
}

func (s *Service) Get(id string) (data []byte, mime, hash string, err error) {
	err = s.DB.QueryRow(`
		SELECT data, mime_type, sha256
		FROM attachments
		WHERE id = ? AND deleted_at IS NULL AND content_state = 'ready' AND data IS NOT NULL`, id,
	).Scan(&data, &mime, &hash)
	if err == sql.ErrNoRows {
		return nil, "", "", ErrNotFound
	}
	return
}

func (s *Service) DeleteContent(id string) error {
	tx, err := s.DB.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	var rev int64
	if err := tx.QueryRow(`SELECT revision FROM attachments WHERE id = ?`, id).Scan(&rev); err != nil {
		if err == sql.ErrNoRows {
			return ErrNotFound
		}
		return err
	}
	now := time.Now().UTC().Format(time.RFC3339Nano)
	newRev := rev + 1
	if _, err := tx.Exec(`UPDATE attachments SET data = NULL, content_state = 'pending', revision = ?, updated_at = ? WHERE id = ?`, newRev, now, id); err != nil {
		return err
	}
	payload := fmt.Sprintf(`{"id":%q,"content_state":"pending","data":null,"revision":%d,"updated_at":%q}`, id, newRev, now)
	if _, err := tx.Exec(`
		INSERT INTO change_log(entity_type, entity_id, operation, revision, changed_at, origin_device_id, payload_json)
		VALUES ('attachment', ?, 'upsert', ?, ?, 'maintenance', ?)`, id, newRev, now, payload); err != nil {
		return err
	}
	return tx.Commit()
}

func (s *Service) Purge(ttlDays int) (int64, error) {
	if ttlDays < 1 {
		ttlDays = 90
	}
	cutoff := time.Now().UTC().AddDate(0, 0, -ttlDays).Format(time.RFC3339Nano)
	tx, err := s.DB.Begin()
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()
	if _, err := tx.Exec(`UPDATE attachments SET data = NULL WHERE deleted_at IS NOT NULL AND deleted_at < ?`, cutoff); err != nil {
		return 0, err
	}
	res, err := tx.Exec(`DELETE FROM attachments WHERE deleted_at IS NOT NULL AND deleted_at < ?`, cutoff)
	if err != nil {
		return 0, err
	}
	n, _ := res.RowsAffected()
	tables := []string{"purchases", "tasks", "inspirations", "items", "monthly_budgets", "categories"}
	for _, t := range tables {
		if _, err := tx.Exec(`DELETE FROM `+t+` WHERE deleted_at IS NOT NULL AND deleted_at < ?`, cutoff); err != nil {
			return 0, err
		}
	}
	return n, tx.Commit()
}

func WriteError(w http.ResponseWriter, err error) {
	switch err {
	case ErrNotFound:
		http.Error(w, `{"error":"not_found"}`, http.StatusNotFound)
	case ErrTooLarge:
		http.Error(w, `{"error":"too_large"}`, http.StatusRequestEntityTooLarge)
	case ErrBadHash:
		http.Error(w, `{"error":"sha256_mismatch"}`, http.StatusBadRequest)
	case ErrBadType:
		http.Error(w, `{"error":"unsupported_type"}`, http.StatusUnsupportedMediaType)
	default:
		http.Error(w, `{"error":"server_error"}`, http.StatusInternalServerError)
	}
}
