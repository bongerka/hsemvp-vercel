package store

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
)

var ErrNotConfigured = errors.New("DATABASE_URL is not configured")

type Store struct {
	db       *sql.DB
	initOnce sync.Once
	initErr  error
}

type User struct {
	ID               string
	OrganizationID   string
	OrganizationName string
	Email            string
	FullName         string
	TelegramCode     string
	PasswordHash     string
}

type Organization struct {
	ID            string
	Name          string
	VectorStoreID string
}

type Chat struct {
	ID         string
	Channel    string
	ExternalID string
}

type SourceRef struct {
	FileID   string  `json:"file_id"`
	FileName string  `json:"file_name"`
	Excerpt  string  `json:"excerpt"`
	Score    float64 `json:"score"`
}

type Message struct {
	ID        string
	Role      string
	Content   string
	Sources   []SourceRef
	CreatedAt time.Time
}

type Document struct {
	ID           string
	FileName     string
	MimeType     string
	SizeBytes    int64
	Status       string
	OpenAIFileID string
	CreatedAt    time.Time
}

type TelegramIdentity struct {
	UserID         string
	OrganizationID string
	Organization   string
	FullName       string
	ChatID         int64
	Username       string
}

type Event struct {
	Name           string
	OrganizationID string
	UserID         string
	VisitorID      string
	Metadata       map[string]any
}

type DashboardData struct {
	TotalQuestions      int
	WebQuestions        int
	TelegramQuestions   int
	UploadedDocuments   int
	LinkedTelegramUsers int
	Funnel              []FunnelStage
	RecentQuestions     []RecentQuestion
}

type FunnelStage struct {
	Label string
	Value int
}

type RecentQuestion struct {
	Content string
	Channel string
	AskedAt time.Time
}

func Open(dsn string) (*Store, error) {
	if strings.TrimSpace(dsn) == "" {
		return nil, nil
	}

	db, err := sql.Open("pgx", dsn)
	if err != nil {
		return nil, err
	}

	db.SetMaxIdleConns(3)
	db.SetMaxOpenConns(6)
	db.SetConnMaxIdleTime(2 * time.Minute)
	db.SetConnMaxLifetime(20 * time.Minute)

	return &Store{db: db}, nil
}

func (s *Store) EnsureSchema(ctx context.Context) error {
	if s == nil {
		return ErrNotConfigured
	}

	s.initOnce.Do(func() {
		s.initErr = s.ensureSchema(ctx)
	})

	return s.initErr
}

func (s *Store) CreateUser(ctx context.Context, clinicName, fullName, email, passwordHash string) (*User, error) {
	if err := s.EnsureSchema(ctx); err != nil {
		return nil, err
	}

	email = strings.ToLower(strings.TrimSpace(email))
	organizationID := makeID()
	userID := makeID()
	telegramCode := makeToken(10)

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	if _, err = tx.ExecContext(ctx, `
		insert into organizations (id, name)
		values ($1, $2)
	`, organizationID, clinicName); err != nil {
		return nil, err
	}

	if _, err = tx.ExecContext(ctx, `
		insert into users (
			id,
			organization_id,
			email,
			password_hash,
			full_name,
			telegram_code
		) values ($1, $2, $3, $4, $5, $6)
	`, userID, organizationID, email, passwordHash, fullName, telegramCode); err != nil {
		return nil, err
	}

	if err = tx.Commit(); err != nil {
		return nil, err
	}

	return &User{
		ID:               userID,
		OrganizationID:   organizationID,
		OrganizationName: clinicName,
		Email:            email,
		FullName:         fullName,
		TelegramCode:     telegramCode,
		PasswordHash:     passwordHash,
	}, nil
}

func (s *Store) FindUserByEmail(ctx context.Context, email string) (*User, error) {
	if err := s.EnsureSchema(ctx); err != nil {
		return nil, err
	}

	email = strings.ToLower(strings.TrimSpace(email))
	row := s.db.QueryRowContext(ctx, `
		select
			u.id,
			u.organization_id,
			o.name,
			u.email,
			u.full_name,
			u.telegram_code,
			u.password_hash
		from users u
		join organizations o on o.id = u.organization_id
		where u.email = $1
		limit 1
	`, email)

	var user User
	if err := row.Scan(
		&user.ID,
		&user.OrganizationID,
		&user.OrganizationName,
		&user.Email,
		&user.FullName,
		&user.TelegramCode,
		&user.PasswordHash,
	); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	return &user, nil
}

func (s *Store) CreateSession(ctx context.Context, userID string, expiresAt time.Time) (string, error) {
	if err := s.EnsureSchema(ctx); err != nil {
		return "", err
	}

	sessionID := makeToken(24)
	_, err := s.db.ExecContext(ctx, `
		insert into sessions (id, user_id, expires_at)
		values ($1, $2, $3)
	`, sessionID, userID, expiresAt)

	return sessionID, err
}

func (s *Store) GetUserBySession(ctx context.Context, sessionID string) (*User, error) {
	if err := s.EnsureSchema(ctx); err != nil {
		return nil, err
	}

	row := s.db.QueryRowContext(ctx, `
		select
			u.id,
			u.organization_id,
			o.name,
			u.email,
			u.full_name,
			u.telegram_code,
			u.password_hash
		from sessions s
		join users u on u.id = s.user_id
		join organizations o on o.id = u.organization_id
		where s.id = $1 and s.expires_at > now()
		limit 1
	`, sessionID)

	var user User
	if err := row.Scan(
		&user.ID,
		&user.OrganizationID,
		&user.OrganizationName,
		&user.Email,
		&user.FullName,
		&user.TelegramCode,
		&user.PasswordHash,
	); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	return &user, nil
}

func (s *Store) DeleteSession(ctx context.Context, sessionID string) error {
	if err := s.EnsureSchema(ctx); err != nil {
		return err
	}

	_, err := s.db.ExecContext(ctx, `delete from sessions where id = $1`, sessionID)
	return err
}

func (s *Store) GetOrganization(ctx context.Context, organizationID string) (*Organization, error) {
	if err := s.EnsureSchema(ctx); err != nil {
		return nil, err
	}

	row := s.db.QueryRowContext(ctx, `
		select id, name, coalesce(vector_store_id, '')
		from organizations
		where id = $1
		limit 1
	`, organizationID)

	var organization Organization
	if err := row.Scan(&organization.ID, &organization.Name, &organization.VectorStoreID); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	return &organization, nil
}

func (s *Store) UpdateOrganizationVectorStore(ctx context.Context, organizationID, vectorStoreID string) error {
	if err := s.EnsureSchema(ctx); err != nil {
		return err
	}

	_, err := s.db.ExecContext(ctx, `
		update organizations
		set vector_store_id = $2
		where id = $1
	`, organizationID, vectorStoreID)
	return err
}

func (s *Store) CreateDocument(ctx context.Context, organizationID, fileName, mimeType, openAIFileID, status string, sizeBytes int64) error {
	if err := s.EnsureSchema(ctx); err != nil {
		return err
	}

	_, err := s.db.ExecContext(ctx, `
		insert into documents (
			id,
			organization_id,
			file_name,
			mime_type,
			size_bytes,
			openai_file_id,
			status
		) values ($1, $2, $3, $4, $5, $6, $7)
	`, makeID(), organizationID, fileName, mimeType, sizeBytes, openAIFileID, status)

	return err
}

func (s *Store) ListDocuments(ctx context.Context, organizationID string) ([]Document, error) {
	if err := s.EnsureSchema(ctx); err != nil {
		return nil, err
	}

	rows, err := s.db.QueryContext(ctx, `
		select id, file_name, mime_type, size_bytes, coalesce(status, ''), coalesce(openai_file_id, ''), created_at
		from documents
		where organization_id = $1
		order by created_at desc
	`, organizationID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var documents []Document
	for rows.Next() {
		var item Document
		if err := rows.Scan(
			&item.ID,
			&item.FileName,
			&item.MimeType,
			&item.SizeBytes,
			&item.Status,
			&item.OpenAIFileID,
			&item.CreatedAt,
		); err != nil {
			return nil, err
		}
		documents = append(documents, item)
	}

	return documents, rows.Err()
}

func (s *Store) EnsureChat(ctx context.Context, organizationID, userID, channel, externalID string) (*Chat, error) {
	if err := s.EnsureSchema(ctx); err != nil {
		return nil, err
	}

	query := `
		select id, channel, coalesce(external_chat_id, '')
		from chats
		where organization_id = $1 and channel = $2
	`
	args := []any{organizationID, channel}
	if externalID != "" {
		query += ` and external_chat_id = $3`
		args = append(args, externalID)
	} else {
		query += ` and user_id = $3 and coalesce(external_chat_id, '') = ''`
		args = append(args, userID)
	}
	query += ` limit 1`

	row := s.db.QueryRowContext(ctx, query, args...)
	var existing Chat
	if err := row.Scan(&existing.ID, &existing.Channel, &existing.ExternalID); err == nil {
		return &existing, nil
	} else if !errors.Is(err, sql.ErrNoRows) {
		return nil, err
	}

	chat := &Chat{
		ID:         makeID(),
		Channel:    channel,
		ExternalID: externalID,
	}

	_, err := s.db.ExecContext(ctx, `
		insert into chats (id, organization_id, user_id, channel, external_chat_id)
		values ($1, $2, $3, $4, nullif($5, ''))
	`, chat.ID, organizationID, nullableString(userID), channel, externalID)
	if err != nil {
		return nil, err
	}

	return chat, nil
}

func (s *Store) AddMessage(ctx context.Context, chatID, role, content string, sources []SourceRef) error {
	if err := s.EnsureSchema(ctx); err != nil {
		return err
	}

	rawSources, err := json.Marshal(sources)
	if err != nil {
		return err
	}

	_, err = s.db.ExecContext(ctx, `
		insert into messages (id, chat_id, role, content, sources)
		values ($1, $2, $3, $4, $5::jsonb)
	`, makeID(), chatID, role, content, string(rawSources))

	return err
}

func (s *Store) GetMessages(ctx context.Context, chatID string, limit int) ([]Message, error) {
	if err := s.EnsureSchema(ctx); err != nil {
		return nil, err
	}

	rows, err := s.db.QueryContext(ctx, `
		select id, role, content, sources, created_at
		from messages
		where chat_id = $1
		order by created_at desc
		limit $2
	`, chatID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var reversed []Message
	for rows.Next() {
		var (
			item       Message
			rawSources []byte
		)
		if err := rows.Scan(&item.ID, &item.Role, &item.Content, &rawSources, &item.CreatedAt); err != nil {
			return nil, err
		}
		if len(rawSources) > 0 {
			_ = json.Unmarshal(rawSources, &item.Sources)
		}
		reversed = append(reversed, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	for left, right := 0, len(reversed)-1; left < right; left, right = left+1, right-1 {
		reversed[left], reversed[right] = reversed[right], reversed[left]
	}

	return reversed, nil
}

func (s *Store) TrackEvent(ctx context.Context, event Event) error {
	if err := s.EnsureSchema(ctx); err != nil {
		return err
	}

	raw, err := json.Marshal(event.Metadata)
	if err != nil {
		return err
	}

	_, err = s.db.ExecContext(ctx, `
		insert into events (id, organization_id, user_id, visitor_id, name, metadata)
		values ($1, nullif($2, ''), nullif($3, ''), nullif($4, ''), $5, $6::jsonb)
	`, makeID(), event.OrganizationID, event.UserID, event.VisitorID, event.Name, string(raw))

	return err
}

func (s *Store) FindUserByTelegramCode(ctx context.Context, code string) (*User, error) {
	if err := s.EnsureSchema(ctx); err != nil {
		return nil, err
	}

	row := s.db.QueryRowContext(ctx, `
		select
			u.id,
			u.organization_id,
			o.name,
			u.email,
			u.full_name,
			u.telegram_code,
			u.password_hash
		from users u
		join organizations o on o.id = u.organization_id
		where u.telegram_code = $1
		limit 1
	`, strings.TrimSpace(code))

	var user User
	if err := row.Scan(
		&user.ID,
		&user.OrganizationID,
		&user.OrganizationName,
		&user.Email,
		&user.FullName,
		&user.TelegramCode,
		&user.PasswordHash,
	); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	return &user, nil
}

func (s *Store) LinkTelegramUser(ctx context.Context, user *User, telegramUserID, telegramChatID int64, username string) error {
	if err := s.EnsureSchema(ctx); err != nil {
		return err
	}

	_, err := s.db.ExecContext(ctx, `
		insert into telegram_links (
			id,
			user_id,
			organization_id,
			telegram_user_id,
			telegram_chat_id,
			telegram_username
		) values ($1, $2, $3, $4, $5, $6)
		on conflict (telegram_user_id) do update set
			user_id = excluded.user_id,
			organization_id = excluded.organization_id,
			telegram_chat_id = excluded.telegram_chat_id,
			telegram_username = excluded.telegram_username
	`, makeID(), user.ID, user.OrganizationID, telegramUserID, telegramChatID, username)

	return err
}

func (s *Store) GetTelegramIdentity(ctx context.Context, telegramUserID int64) (*TelegramIdentity, error) {
	if err := s.EnsureSchema(ctx); err != nil {
		return nil, err
	}

	row := s.db.QueryRowContext(ctx, `
		select
			t.user_id,
			t.organization_id,
			o.name,
			u.full_name,
			t.telegram_chat_id,
			coalesce(t.telegram_username, '')
		from telegram_links t
		join users u on u.id = t.user_id
		join organizations o on o.id = t.organization_id
		where t.telegram_user_id = $1
		limit 1
	`, telegramUserID)

	var identity TelegramIdentity
	if err := row.Scan(
		&identity.UserID,
		&identity.OrganizationID,
		&identity.Organization,
		&identity.FullName,
		&identity.ChatID,
		&identity.Username,
	); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}

	return &identity, nil
}

func (s *Store) Dashboard(ctx context.Context, organizationID string) (*DashboardData, error) {
	if err := s.EnsureSchema(ctx); err != nil {
		return nil, err
	}

	data := &DashboardData{}

	if err := s.db.QueryRowContext(ctx, `
		select
			coalesce(sum(case when c.channel in ('web', 'telegram') and m.role = 'user' then 1 else 0 end), 0)::int,
			coalesce(sum(case when c.channel = 'web' and m.role = 'user' then 1 else 0 end), 0)::int,
			coalesce(sum(case when c.channel = 'telegram' and m.role = 'user' then 1 else 0 end), 0)::int,
			(select count(*)::int from documents d where d.organization_id = $1),
			(select count(*)::int from telegram_links t where t.organization_id = $1)
		from chats c
		left join messages m on m.chat_id = c.id
		where c.organization_id = $1
	`, organizationID).Scan(
		&data.TotalQuestions,
		&data.WebQuestions,
		&data.TelegramQuestions,
		&data.UploadedDocuments,
		&data.LinkedTelegramUsers,
	); err != nil {
		return nil, err
	}

	funnelRows, err := s.db.QueryContext(ctx, `
		with landing as (
			select count(distinct visitor_id)::int from events where name = 'landing_view'
		),
		registered as (
			select count(distinct user_id)::int from events where organization_id = $1 and name = 'user_registered'
		),
		uploaded as (
			select count(distinct organization_id)::int from events where organization_id = $1 and name = 'document_uploaded'
		),
		asked as (
			select count(distinct organization_id)::int from events where organization_id = $1 and name = 'question_asked'
		),
		repeated as (
			select count(*)::int
			from (
				select organization_id
				from events
				where organization_id = $1 and name = 'question_asked'
				group by organization_id
				having count(*) >= 2
			) s
		)
		select 'Лендинг', coalesce((select * from landing), 0)
		union all
		select 'Регистрация', coalesce((select * from registered), 0)
		union all
		select 'Первая загрузка документов', coalesce((select * from uploaded), 0)
		union all
		select 'Первый вопрос', coalesce((select * from asked), 0)
		union all
		select 'Повторное использование', coalesce((select * from repeated), 0)
	`, organizationID)
	if err != nil {
		return nil, err
	}
	defer funnelRows.Close()

	for funnelRows.Next() {
		var stage FunnelStage
		if err := funnelRows.Scan(&stage.Label, &stage.Value); err != nil {
			return nil, err
		}
		data.Funnel = append(data.Funnel, stage)
	}

	recentRows, err := s.db.QueryContext(ctx, `
		select m.content, c.channel, m.created_at
		from messages m
		join chats c on c.id = m.chat_id
		where c.organization_id = $1 and m.role = 'user'
		order by m.created_at desc
		limit 5
	`, organizationID)
	if err != nil {
		return nil, err
	}
	defer recentRows.Close()

	for recentRows.Next() {
		var item RecentQuestion
		if err := recentRows.Scan(&item.Content, &item.Channel, &item.AskedAt); err != nil {
			return nil, err
		}
		data.RecentQuestions = append(data.RecentQuestions, item)
	}

	return data, recentRows.Err()
}

func (s *Store) ensureSchema(ctx context.Context) error {
	schema := `
		create table if not exists organizations (
			id text primary key,
			name text not null,
			vector_store_id text,
			created_at timestamptz not null default now()
		);

		create table if not exists users (
			id text primary key,
			organization_id text not null references organizations(id) on delete cascade,
			email text not null unique,
			password_hash text not null,
			full_name text not null,
			telegram_code text not null unique,
			created_at timestamptz not null default now()
		);

		create table if not exists sessions (
			id text primary key,
			user_id text not null references users(id) on delete cascade,
			expires_at timestamptz not null,
			created_at timestamptz not null default now()
		);

		create table if not exists documents (
			id text primary key,
			organization_id text not null references organizations(id) on delete cascade,
			file_name text not null,
			mime_type text not null,
			size_bytes bigint not null,
			openai_file_id text,
			status text not null default 'uploaded',
			created_at timestamptz not null default now()
		);

		create table if not exists chats (
			id text primary key,
			organization_id text not null references organizations(id) on delete cascade,
			user_id text references users(id) on delete set null,
			channel text not null,
			external_chat_id text,
			created_at timestamptz not null default now()
		);

		create table if not exists messages (
			id text primary key,
			chat_id text not null references chats(id) on delete cascade,
			role text not null,
			content text not null,
			sources jsonb not null default '[]'::jsonb,
			created_at timestamptz not null default now()
		);

		create table if not exists telegram_links (
			id text primary key,
			user_id text not null unique references users(id) on delete cascade,
			organization_id text not null references organizations(id) on delete cascade,
			telegram_user_id bigint not null unique,
			telegram_chat_id bigint not null,
			telegram_username text,
			created_at timestamptz not null default now()
		);

		create table if not exists events (
			id text primary key,
			organization_id text references organizations(id) on delete cascade,
			user_id text references users(id) on delete cascade,
			visitor_id text,
			name text not null,
			metadata jsonb not null default '{}'::jsonb,
			created_at timestamptz not null default now()
		);

		create index if not exists idx_sessions_user_id on sessions(user_id);
		create index if not exists idx_messages_chat_id on messages(chat_id, created_at desc);
		create index if not exists idx_documents_org_id on documents(organization_id, created_at desc);
		create index if not exists idx_events_name_created_at on events(name, created_at desc);
	`

	_, err := s.db.ExecContext(ctx, schema)
	return err
}

func makeID() string {
	return fmt.Sprintf("%d_%s", time.Now().UnixNano(), makeToken(8))
}

func makeToken(size int) string {
	raw := make([]byte, size)
	_, _ = rand.Read(raw)
	return base64.RawURLEncoding.EncodeToString(raw)
}

func nullableString(value string) any {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	return value
}
