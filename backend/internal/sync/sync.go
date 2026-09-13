package sync

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"norte/internal/domain"
)

type Mutation struct {
	MutationID   string          `json:"mutation_id"`
	EntityType   string          `json:"entity_type"`
	EntityID     string          `json:"entity_id"`
	Operation    string          `json:"operation"`
	BaseRevision int64           `json:"base_revision"`
	Record       json.RawMessage `json:"record"`
}

type Request struct {
	DeviceID  string     `json:"device_id"`
	Cursor    int64      `json:"cursor"`
	Limit     int        `json:"limit"`
	Mutations []Mutation `json:"mutations"`
}

type Conflict struct {
	MutationID string         `json:"mutation_id"`
	EntityType string         `json:"entity_type"`
	EntityID   string         `json:"entity_id"`
	Reason     string         `json:"reason"`
	Server     map[string]any `json:"server"`
}

type Change struct {
	Seq        int64          `json:"seq"`
	EntityType string         `json:"entity_type"`
	EntityID   string         `json:"entity_id"`
	Operation  string         `json:"operation"`
	Revision   int64          `json:"revision"`
	ChangedAt  string         `json:"changed_at"`
	Record     map[string]any `json:"record"`
}

type Response struct {
	Applied            []string   `json:"applied"`
	Conflicts          []Conflict `json:"conflicts"`
	Changes            []Change   `json:"changes"`
	NextCursor         int64      `json:"next_cursor"`
	HasMore            bool       `json:"has_more"`
	BlobUploadRequired []string   `json:"blob_upload_required"`
}

type Service struct {
	DB *sql.DB
}

func (s *Service) Sync(req Request) (*Response, error) {
	if req.DeviceID == "" {
		return nil, fmt.Errorf("device_id requerido")
	}
	if req.Limit <= 0 || req.Limit > 500 {
		req.Limit = 200
	}
	now := time.Now().UTC().Format(time.RFC3339Nano)
	tx, err := s.DB.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	if err := touchDevice(tx, req.DeviceID, now); err != nil {
		return nil, err
	}

	applied := make([]string, 0)
	conflicts := make([]Conflict, 0)
	blobNeeded := make([]string, 0)

	for _, m := range req.Mutations {
		if m.MutationID == "" || m.EntityID == "" || !domain.IsKnown(m.EntityType) {
			conflicts = append(conflicts, Conflict{
				MutationID: m.MutationID,
				EntityType: m.EntityType,
				EntityID:   m.EntityID,
				Reason:     "invalid_mutation",
			})
			continue
		}
		ok, err := mutationApplied(tx, m.MutationID)
		if err != nil {
			return nil, err
		}
		if ok {
			applied = append(applied, m.MutationID)
			continue
		}
		res, err := applyOne(tx, m, req.DeviceID, now)
		if err != nil {
			return nil, err
		}
		if res.conflict != nil {
			conflicts = append(conflicts, *res.conflict)
			continue
		}
		if err := rememberMutation(tx, m.MutationID, req.DeviceID, now); err != nil {
			return nil, err
		}
		applied = append(applied, m.MutationID)
		if res.blobUpload {
			blobNeeded = append(blobNeeded, m.EntityID)
		}
	}

	changes, next, hasMore, err := Pull(tx, req.Cursor, req.Limit)
	if err != nil {
		return nil, err
	}
	if _, err := tx.Exec(`UPDATE devices SET last_cursor = ?, last_seen_at = ? WHERE id = ?`, next, now, req.DeviceID); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return &Response{
		Applied:            applied,
		Conflicts:          conflicts,
		Changes:            changes,
		NextCursor:         next,
		HasMore:            hasMore,
		BlobUploadRequired: blobNeeded,
	}, nil
}

func (s *Service) PullChanges(cursor int64, limit int) ([]Change, int64, bool, error) {
	if limit <= 0 || limit > 500 {
		limit = 200
	}
	tx, err := s.DB.Begin()
	if err != nil {
		return nil, cursor, false, err
	}
	defer tx.Rollback()
	changes, next, hasMore, err := Pull(tx, cursor, limit)
	if err != nil {
		return nil, cursor, false, err
	}
	if err := tx.Commit(); err != nil {
		return nil, cursor, false, err
	}
	return changes, next, hasMore, nil
}

func Pull(tx *sql.Tx, cursor int64, limit int) ([]Change, int64, bool, error) {
	rows, err := tx.Query(`
		SELECT seq, entity_type, entity_id, operation, revision, changed_at, payload_json
		FROM change_log
		WHERE seq > ?
		ORDER BY seq ASC
		LIMIT ?`, cursor, limit+1)
	if err != nil {
		return nil, cursor, false, err
	}
	defer rows.Close()

	out := make([]Change, 0, limit)
	for rows.Next() {
		var ch Change
		var payload sql.NullString
		if err := rows.Scan(&ch.Seq, &ch.EntityType, &ch.EntityID, &ch.Operation, &ch.Revision, &ch.ChangedAt, &payload); err != nil {
			return nil, cursor, false, err
		}
		ch.Record = map[string]any{}
		if payload.Valid && payload.String != "" {
			_ = json.Unmarshal([]byte(payload.String), &ch.Record)
		}
		out = append(out, ch)
	}
	hasMore := len(out) > limit
	if hasMore {
		out = out[:limit]
	}
	next := cursor
	if len(out) > 0 {
		next = out[len(out)-1].Seq
	}
	return out, next, hasMore, rows.Err()
}

type applyResult struct {
	conflict    *Conflict
	blobUpload  bool
}

func applyOne(tx *sql.Tx, m Mutation, deviceID, now string) (applyResult, error) {
	table := domain.EntityTables[m.EntityType]
	current, found, err := loadRow(tx, m.EntityType, m.EntityID)
	if err != nil {
		return applyResult{}, err
	}
	if found {
		rev := int64From(current["revision"])
		if rev != m.BaseRevision {
			return applyResult{conflict: &Conflict{
				MutationID: m.MutationID,
				EntityType: m.EntityType,
				EntityID:   m.EntityID,
				Reason:     "base_revision_mismatch",
				Server:     current,
			}}, nil
		}
	} else if m.BaseRevision != 0 && m.Operation != "delete" {
		return applyResult{conflict: &Conflict{
			MutationID: m.MutationID,
			EntityType: m.EntityType,
			EntityID:   m.EntityID,
			Reason:     "missing_record",
		}}, nil
	}

	record := map[string]any{}
	if len(m.Record) > 0 && string(m.Record) != "null" {
		if err := json.Unmarshal(m.Record, &record); err != nil {
			return applyResult{}, fmt.Errorf("record inválido: %w", err)
		}
	}
	if record == nil {
		record = map[string]any{}
	}
	delete(record, "data")

	var newRev int64 = 1
	if found {
		newRev = int64From(current["revision"]) + 1
	}
	record["id"] = m.EntityID
	record["revision"] = newRev
	record["updated_at"] = now
	if _, ok := record["created_at"]; !ok || record["created_at"] == nil || record["created_at"] == "" {
		if found {
			record["created_at"] = current["created_at"]
		} else {
			record["created_at"] = now
		}
	}

	op := m.Operation
	if op != "delete" && op != "upsert" {
		op = "upsert"
	}
	if op == "delete" {
		record["deleted_at"] = now
		if found {
			if err := softDelete(tx, table, m.EntityID, newRev, now); err != nil {
				return applyResult{}, err
			}
		} else {
			if err := insertRow(tx, m.EntityType, record); err != nil {
				return applyResult{}, err
			}
			if err := softDelete(tx, table, m.EntityID, newRev, now); err != nil {
				return applyResult{}, err
			}
		}
	} else {
		if record["deleted_at"] == "" {
			record["deleted_at"] = nil
		}
		if found {
			if err := updateRow(tx, m.EntityType, record); err != nil {
				return applyResult{}, err
			}
		} else {
			if err := insertRow(tx, m.EntityType, record); err != nil {
				return applyResult{}, err
			}
		}
	}

	payload, _ := json.Marshal(record)
	if _, err := tx.Exec(`
		INSERT INTO change_log(entity_type, entity_id, operation, revision, changed_at, origin_device_id, payload_json)
		VALUES (?, ?, ?, ?, ?, ?, ?)`,
		m.EntityType, m.EntityID, op, newRev, now, deviceID, string(payload)); err != nil {
		return applyResult{}, err
	}

	blobUpload := m.EntityType == "attachment" && op == "upsert"
	if blobUpload {
		state, _ := record["content_state"].(string)
		blobUpload = state != "ready"
	}
	return applyResult{blobUpload: blobUpload}, nil
}

func loadRow(tx *sql.Tx, entityType, id string) (map[string]any, bool, error) {
	cols := domain.EntityColumns[entityType]
	table := domain.EntityTables[entityType]
	q := fmt.Sprintf(`SELECT %s FROM %s WHERE id = ?`, strings.Join(cols, ", "), table)
	row := tx.QueryRow(q, id)
	raw := make([]any, len(cols))
	ptrs := make([]any, len(cols))
	for i := range raw {
		ptrs[i] = &raw[i]
	}
	if err := row.Scan(ptrs...); err != nil {
		if err == sql.ErrNoRows {
			return nil, false, nil
		}
		return nil, false, err
	}
	out := map[string]any{}
	for i, col := range cols {
		out[col] = normalize(raw[i])
	}
	return out, true, nil
}

func insertRow(tx *sql.Tx, entityType string, record map[string]any) error {
	cols := domain.EntityColumns[entityType]
	table := domain.EntityTables[entityType]
	placeholders := make([]string, len(cols))
	vals := make([]any, len(cols))
	for i, col := range cols {
		placeholders[i] = "?"
		vals[i] = record[col]
	}
	q := fmt.Sprintf(`INSERT INTO %s (%s) VALUES (%s)`, table, strings.Join(cols, ", "), strings.Join(placeholders, ", "))
	_, err := tx.Exec(q, vals...)
	return err
}

func updateRow(tx *sql.Tx, entityType string, record map[string]any) error {
	cols := domain.EntityColumns[entityType]
	table := domain.EntityTables[entityType]
	sets := make([]string, 0, len(cols))
	vals := make([]any, 0, len(cols))
	for _, col := range cols {
		if col == "id" {
			continue
		}
		sets = append(sets, col+" = ?")
		vals = append(vals, record[col])
	}
	vals = append(vals, record["id"])
	q := fmt.Sprintf(`UPDATE %s SET %s WHERE id = ?`, table, strings.Join(sets, ", "))
	_, err := tx.Exec(q, vals...)
	return err
}

func softDelete(tx *sql.Tx, table, id string, rev int64, now string) error {
	_, err := tx.Exec(`UPDATE `+table+` SET deleted_at = ?, updated_at = ?, revision = ? WHERE id = ?`, now, now, rev, id)
	return err
}

func touchDevice(tx *sql.Tx, id, now string) error {
	_, err := tx.Exec(`
		INSERT INTO devices(id, first_seen_at, last_seen_at, last_cursor)
		VALUES (?, ?, ?, 0)
		ON CONFLICT(id) DO UPDATE SET last_seen_at = excluded.last_seen_at`, id, now, now)
	return err
}

func mutationApplied(tx *sql.Tx, id string) (bool, error) {
	var n int
	err := tx.QueryRow(`SELECT COUNT(1) FROM applied_mutations WHERE mutation_id = ?`, id).Scan(&n)
	return n > 0, err
}

func rememberMutation(tx *sql.Tx, mutationID, deviceID, now string) error {
	_, err := tx.Exec(`INSERT INTO applied_mutations(mutation_id, device_id, applied_at) VALUES (?, ?, ?)`, mutationID, deviceID, now)
	return err
}

func normalize(v any) any {
	switch t := v.(type) {
	case []byte:
		return string(t)
	case nil:
		return nil
	default:
		return t
	}
}

func int64From(v any) int64 {
	switch t := v.(type) {
	case int64:
		return t
	case int:
		return int64(t)
	case float64:
		return int64(t)
	case json.Number:
		n, _ := t.Int64()
		return n
	case string:
		var n int64
		fmt.Sscan(t, &n)
		return n
	default:
		return 0
	}
}
