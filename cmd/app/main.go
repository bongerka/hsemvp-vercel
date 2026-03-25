package main

import (
	"log"
	"net/http"
	"os"

	"clinicadmin-ai/app"
)

func main() {
	addr := ":8080"
	if port := os.Getenv("PORT"); port != "" {
		addr = ":" + port
	}

	log.Printf("listening on %s", addr)
	if err := http.ListenAndServe(addr, app.NewServer()); err != nil {
		log.Fatal(err)
	}
}
