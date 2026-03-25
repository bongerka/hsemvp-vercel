package telegram

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

var ErrNotConfigured = errors.New("TELEGRAM_BOT_TOKEN is not configured")

type Client struct {
	token      string
	httpClient *http.Client
}

type Update struct {
	UpdateID int `json:"update_id"`
	Message  *struct {
		MessageID int `json:"message_id"`
		Chat      struct {
			ID int64 `json:"id"`
		} `json:"chat"`
		From *struct {
			ID       int64  `json:"id"`
			Username string `json:"username"`
		} `json:"from"`
		Text  string `json:"text"`
		Voice *struct {
			FileID   string `json:"file_id"`
			Duration int    `json:"duration"`
		} `json:"voice"`
		Audio *struct {
			FileID   string `json:"file_id"`
			FileName string `json:"file_name"`
		} `json:"audio"`
	} `json:"message"`
}

func New(token string) *Client {
	if strings.TrimSpace(token) == "" {
		return nil
	}

	return &Client{
		token: token,
		httpClient: &http.Client{
			Timeout: 60 * time.Second,
		},
	}
}

func (c *Client) SendMessage(ctx context.Context, chatID int64, text string) error {
	if c == nil {
		return ErrNotConfigured
	}

	form := url.Values{}
	form.Set("chat_id", fmt.Sprintf("%d", chatID))
	form.Set("text", text)

	request, err := http.NewRequestWithContext(ctx, http.MethodPost, c.apiURL("/sendMessage"), strings.NewReader(form.Encode()))
	if err != nil {
		return err
	}
	request.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := c.httpClient.Do(request)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		raw, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("telegram sendMessage failed (%d): %s", resp.StatusCode, string(raw))
	}

	return nil
}

func (c *Client) DownloadFile(ctx context.Context, fileID string) ([]byte, string, error) {
	if c == nil {
		return nil, "", ErrNotConfigured
	}

	request, err := http.NewRequestWithContext(ctx, http.MethodGet, c.apiURL("/getFile?file_id="+url.QueryEscape(fileID)), nil)
	if err != nil {
		return nil, "", err
	}

	resp, err := c.httpClient.Do(request)
	if err != nil {
		return nil, "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		raw, _ := io.ReadAll(resp.Body)
		return nil, "", fmt.Errorf("telegram getFile failed (%d): %s", resp.StatusCode, string(raw))
	}

	var payload struct {
		OK     bool `json:"ok"`
		Result struct {
			FilePath string `json:"file_path"`
		} `json:"result"`
	}
	if err = json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		return nil, "", err
	}

	fileURL := fmt.Sprintf("https://api.telegram.org/file/bot%s/%s", c.token, payload.Result.FilePath)
	fileRequest, err := http.NewRequestWithContext(ctx, http.MethodGet, fileURL, nil)
	if err != nil {
		return nil, "", err
	}

	fileResp, err := c.httpClient.Do(fileRequest)
	if err != nil {
		return nil, "", err
	}
	defer fileResp.Body.Close()

	if fileResp.StatusCode >= 300 {
		raw, _ := io.ReadAll(fileResp.Body)
		return nil, "", fmt.Errorf("telegram file download failed (%d): %s", fileResp.StatusCode, string(raw))
	}

	data, err := io.ReadAll(fileResp.Body)
	if err != nil {
		return nil, "", err
	}

	return data, payload.Result.FilePath, nil
}

func (c *Client) apiURL(path string) string {
	return fmt.Sprintf("https://api.telegram.org/bot%s%s", c.token, path)
}
