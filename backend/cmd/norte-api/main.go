package main

import (
	"log"
	"net/http"
	"time"

	"norte/internal/config"
	"norte/internal/database"
	httpapi "norte/internal/http"
	"norte/internal/media"
)

func main() {
	cfg := config.Load()
	db, err := database.Open(cfg.SQLitePath)
	if err != nil {
		log.Fatalf("sqlite: %v", err)
	}
	defer db.Close()

	mediaSvc := &media.Service{DB: db, MaxUploadBytes: cfg.MaxUploadBytes}
	if n, err := mediaSvc.Purge(cfg.TombstoneTTLDays); err != nil {
		log.Printf("purga inicial: %v", err)
	} else if n > 0 {
		log.Printf("purgados %d adjuntos vencidos", n)
	}

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           httpapi.NewMux(cfg, db),
		ReadHeaderTimeout: 10 * time.Second,
		MaxHeaderBytes:    1 << 20,
	}
	log.Printf("Norte API en :%s  sqlite=%s", cfg.Port, cfg.SQLitePath)
	log.Fatal(srv.ListenAndServe())
}
