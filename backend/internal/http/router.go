package httpapi

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"norte/internal/config"
	"norte/internal/database"
	"norte/internal/media"
	norteSync "norte/internal/sync"
)

func NewMux(cfg config.Config, db *sql.DB) http.Handler {
	syncSvc := &norteSync.Service{DB: db}
	mediaSvc := &media.Service{DB: db, MaxUploadBytes: cfg.MaxUploadBytes}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/v1/health", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]any{
			"status":         "ok",
			"schema_version": database.SchemaVersion,
			"time":           time.Now().UTC().Format(time.RFC3339Nano),
			"sqlite_path":    cfg.SQLitePath,
		})
	})
	mux.HandleFunc("POST /api/v1/sync", func(w http.ResponseWriter, r *http.Request) {
		var req norteSync.Request
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, `{"error":"invalid_json"}`, http.StatusBadRequest)
			return
		}
		resp, err := syncSvc.Sync(req)
		if err != nil {
			http.Error(w, `{"error":"`+err.Error()+`"}`, http.StatusBadRequest)
			return
		}
		writeJSON(w, http.StatusOK, resp)
	})
	mux.HandleFunc("GET /api/v1/sync/changes", func(w http.ResponseWriter, r *http.Request) {
		cursor, _ := strconv.ParseInt(r.URL.Query().Get("cursor"), 10, 64)
		limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
		changes, next, hasMore, err := syncSvc.PullChanges(cursor, limit)
		if err != nil {
			http.Error(w, `{"error":"server_error"}`, http.StatusInternalServerError)
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"changes":     changes,
			"next_cursor": next,
			"has_more":    hasMore,
		})
	})
	mux.HandleFunc("PUT /api/v1/attachments/{id}/content", func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")
		ct := r.Header.Get("Content-Type")
		device := r.Header.Get("X-Device-Id")
		r.Body = http.MaxBytesReader(w, r.Body, cfg.MaxUploadBytes+1)
		if err := mediaSvc.Put(id, r.Body, ct, device); err != nil {
			media.WriteError(w, err)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})
	mux.HandleFunc("GET /api/v1/attachments/{id}/content", func(w http.ResponseWriter, r *http.Request) {
		id := r.PathValue("id")
		data, mime, hash, err := mediaSvc.Get(id)
		if err != nil {
			media.WriteError(w, err)
			return
		}
		if inm := r.Header.Get("If-None-Match"); inm != "" && inm == `"`+hash+`"` {
			w.WriteHeader(http.StatusNotModified)
			return
		}
		w.Header().Set("Content-Type", mime)
		w.Header().Set("ETag", `"`+hash+`"`)
		w.Header().Set("Cache-Control", "private, max-age=31536000")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write(data)
	})
	mux.HandleFunc("DELETE /api/v1/attachments/{id}/content", func(w http.ResponseWriter, r *http.Request) {
		if err := mediaSvc.DeleteContent(r.PathValue("id")); err != nil {
			media.WriteError(w, err)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})
	mux.HandleFunc("POST /api/v1/maintenance/purge", func(w http.ResponseWriter, r *http.Request) {
		n, err := mediaSvc.Purge(cfg.TombstoneTTLDays)
		if err != nil {
			http.Error(w, `{"error":"purge_failed"}`, http.StatusInternalServerError)
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"purged_attachments": n})
	})
	return withCORS(mux)
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-Device-Id, If-None-Match")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
