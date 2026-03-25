package auth

import (
	"context"
	"net/http"
	"strings"
	"time"

	"clinicadmin-ai/internal/store"

	"golang.org/x/crypto/bcrypt"
)

const (
	SessionCookie = "clinicadmin_session"
	sessionTTL    = 14 * 24 * time.Hour
)

func HashPassword(password string) (string, error) {
	raw, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(raw), nil
}

func ComparePassword(hash, password string) error {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
}

func CreateSession(ctx context.Context, s *store.Store, w http.ResponseWriter, r *http.Request, userID string) error {
	sessionID, err := s.CreateSession(ctx, userID, time.Now().Add(sessionTTL))
	if err != nil {
		return err
	}

	http.SetCookie(w, &http.Cookie{
		Name:     SessionCookie,
		Value:    sessionID,
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   isSecureRequest(r),
		MaxAge:   int(sessionTTL.Seconds()),
	})

	return nil
}

func ClearSession(s *store.Store, w http.ResponseWriter, r *http.Request) {
	if cookie, err := r.Cookie(SessionCookie); err == nil && s != nil {
		_ = s.DeleteSession(r.Context(), cookie.Value)
	}

	http.SetCookie(w, &http.Cookie{
		Name:     SessionCookie,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
		Secure:   isSecureRequest(r),
		MaxAge:   -1,
	})
}

func CurrentUser(r *http.Request, s *store.Store) (*store.User, error) {
	if s == nil {
		return nil, store.ErrNotConfigured
	}

	cookie, err := r.Cookie(SessionCookie)
	if err != nil {
		return nil, nil
	}

	return s.GetUserBySession(r.Context(), cookie.Value)
}

func isSecureRequest(r *http.Request) bool {
	if r == nil {
		return true
	}
	if r.TLS != nil {
		return true
	}
	return strings.EqualFold(r.Header.Get("X-Forwarded-Proto"), "https")
}
