package httpapi_test

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"

	"norte/internal/config"
	"norte/internal/database"
	httpapi "norte/internal/http"
	norteSync "norte/internal/sync"
)

func setup(t *testing.T) http.Handler {
	t.Helper()
	path := filepath.Join(t.TempDir(), "norte.db")
	db, err := database.Open(path)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	cfg := config.Config{Port: "0", SQLitePath: path, TombstoneTTLDays: 90, MaxUploadBytes: 1024 * 1024}
	return httpapi.NewMux(cfg, db)
}

func TestHealthAndSeedPull(t *testing.T) {
	h := setup(t)
	req := httptest.NewRequest(http.MethodGet, "/api/v1/health", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != 200 {
		t.Fatalf("health %d", rec.Code)
	}

	body, _ := json.Marshal(norteSync.Request{DeviceID: "dev-a", Cursor: 0, Limit: 50})
	req = httptest.NewRequest(http.MethodPost, "/api/v1/sync", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != 200 {
		t.Fatalf("sync %d %s", rec.Code, rec.Body.String())
	}
	var resp norteSync.Response
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatal(err)
	}
	if len(resp.Changes) == 0 {
		t.Fatal("expected seeded categories in pull")
	}
}

func TestSyncUpsertConflictAndTombstone(t *testing.T) {
	h := setup(t)
	item := map[string]any{
		"id": "item-1", "area": "casa", "name": "Lámpara", "priority": 2,
		"status": "deseado", "currency": "ARS", "order_scope": "items:casa:deseado",
		"position": 1024, "estimated_cost_minor": 1500000,
	}
	raw, _ := json.Marshal(item)
	push := norteSync.Request{
		DeviceID: "dev-a",
		Mutations: []norteSync.Mutation{{
			MutationID: "m1", EntityType: "item", EntityID: "item-1",
			Operation: "upsert", BaseRevision: 0, Record: raw,
		}},
	}
	resp := postSync(t, h, push)
	if len(resp.Applied) != 1 {
		t.Fatalf("applied=%v conflicts=%v", resp.Applied, resp.Conflicts)
	}

	item["name"] = "Lámpara mesa"
	raw, _ = json.Marshal(item)
	conflictReq := norteSync.Request{
		DeviceID: "dev-b",
		Mutations: []norteSync.Mutation{{
			MutationID: "m2", EntityType: "item", EntityID: "item-1",
			Operation: "upsert", BaseRevision: 0, Record: raw,
		}},
	}
	resp = postSync(t, h, conflictReq)
	if len(resp.Conflicts) != 1 {
		t.Fatalf("expected conflict, got %+v", resp)
	}

	del := norteSync.Request{
		DeviceID: "dev-a",
		Cursor:   0,
		Mutations: []norteSync.Mutation{{
			MutationID: "m3", EntityType: "item", EntityID: "item-1",
			Operation: "delete", BaseRevision: 1,
		}},
	}
	resp = postSync(t, h, del)
	if len(resp.Applied) != 1 {
		t.Fatalf("delete applied=%v conflicts=%v", resp.Applied, resp.Conflicts)
	}
	found := false
	for _, ch := range resp.Changes {
		if ch.EntityID == "item-1" && ch.Operation == "delete" {
			found = true
		}
	}
	if !found {
		t.Fatal("expected delete tombstone in pull")
	}
}

func TestAttachmentBlobRoundtrip(t *testing.T) {
	h := setup(t)
	jpeg := []byte{0xff, 0xd8, 0xff, 0xd9, 1, 2, 3, 4}
	sum := sha256.Sum256(jpeg)
	hash := hex.EncodeToString(sum[:])
	att := map[string]any{
		"id": "att-1", "item_id": nil, "purchase_id": nil,
		"inspiration_id": "insp-1", "role": "cover", "position": 1024,
		"filename": "shot.jpg", "mime_type": "image/jpeg", "byte_size": len(jpeg),
		"sha256": hash, "content_state": "pending",
	}
	insp := map[string]any{
		"id": "insp-1", "area": "casa", "title": "Estante",
		"external_url": "https://pinterest.com/pin/1",
		"order_scope": "inspirations:casa", "position": 1024,
	}
	inspRaw, _ := json.Marshal(insp)
	attRaw, _ := json.Marshal(att)
	resp := postSync(t, h, norteSync.Request{
		DeviceID: "dev-a",
		Mutations: []norteSync.Mutation{
			{MutationID: "i1", EntityType: "inspiration", EntityID: "insp-1", Operation: "upsert", Record: inspRaw},
			{MutationID: "a1", EntityType: "attachment", EntityID: "att-1", Operation: "upsert", Record: attRaw},
		},
	})
	if len(resp.Applied) != 2 {
		t.Fatalf("applied=%v conflicts=%v", resp.Applied, resp.Conflicts)
	}

	req := httptest.NewRequest(http.MethodPut, "/api/v1/attachments/att-1/content", bytes.NewReader(jpeg))
	req.Header.Set("Content-Type", "image/jpeg")
	req.Header.Set("X-Device-Id", "dev-a")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("put %d %s", rec.Code, rec.Body.String())
	}

	req = httptest.NewRequest(http.MethodGet, "/api/v1/attachments/att-1/content", nil)
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != 200 || !bytes.Equal(rec.Body.Bytes(), jpeg) {
		t.Fatalf("get %d len=%d", rec.Code, rec.Body.Len())
	}
}

func TestTagAndItemLinkedInspiration(t *testing.T) {
	h := setup(t)
	item := map[string]any{
		"id": "item-link", "area": "casa", "name": "Mesa", "priority": 3,
		"status": "deseado", "currency": "ARS", "order_scope": "items:casa:deseado",
		"position": 1024,
	}
	tag := map[string]any{
		"id": "tag-1", "area": "casa", "name": "oferta", "position": 1024,
	}
	link := map[string]any{
		"id": "insp-item", "area": "casa", "item_id": "item-link", "title": "ML",
		"external_url": "https://www.mercadolibre.com.ar/mesa",
		"order_scope": "items:casa:links", "position": 1024,
	}
	itemTag := map[string]any{
		"id": "it-1", "item_id": "item-link", "tag_id": "tag-1",
	}
	marshal := func(v map[string]any) json.RawMessage {
		t.Helper()
		raw, _ := json.Marshal(v)
		return raw
	}
	resp := postSync(t, h, norteSync.Request{
		DeviceID: "dev-a",
		Mutations: []norteSync.Mutation{
			{MutationID: "t1", EntityType: "tag", EntityID: "tag-1", Operation: "upsert", Record: marshal(tag)},
			{MutationID: "i1", EntityType: "item", EntityID: "item-link", Operation: "upsert", Record: marshal(item)},
			{MutationID: "l1", EntityType: "inspiration", EntityID: "insp-item", Operation: "upsert", Record: marshal(link)},
			{MutationID: "it1", EntityType: "item_tag", EntityID: "it-1", Operation: "upsert", Record: marshal(itemTag)},
		},
	})
	if len(resp.Applied) != 4 {
		t.Fatalf("applied=%v conflicts=%v", resp.Applied, resp.Conflicts)
	}
}

func postSync(t *testing.T, h http.Handler, reqBody norteSync.Request) norteSync.Response {
	t.Helper()
	raw, _ := json.Marshal(reqBody)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/sync", bytes.NewReader(raw))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != 200 {
		t.Fatalf("sync %d %s", rec.Code, rec.Body.String())
	}
	var resp norteSync.Response
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatal(err)
	}
	return resp
}
