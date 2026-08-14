# DeepSeek V4 Flash — AI Assistant Integration

The TradingBible AI Coach (chat widget + `/app/coach`) streams from **DeepSeek V4 Flash** (`deepseek-v4-flash`) by default, with a free-tier option via OpenRouter.

## Provider resolution (priority order)

1. **Integrated AI proxy** — `INTEGRATED_AI_API_URL` + `INTEGRATED_AI_API_KEY` + `WEBSITE_ID` (full agent/tool pipeline).
2. **Local opencode gateway** — `OPENCODE_SERVER_URL` set → free chat-only model (`opencode/deepseek-v4-flash-free`) via `opencode serve` (default `http://127.0.0.1:8001`). Chat-only `general` agent: no tools, no file access. One session per TradingBible user is kept in memory and recreated if lost; deltas stream from the `/event` SSE feed.
3. **DeepSeek** — `DEEPSEEK_API_KEY` set → OpenAI-compatible `POST {DEEPSEEK_BASE_URL}/chat/completions` (default `https://api.deepseek.com`).
4. **Any OpenAI-compatible endpoint** — `OPENAI_BASE_URL` + `OPENAI_API_KEY` (OpenAI, Groq, OpenRouter, local servers).

## Environment variables (`apps/api/.env`)

| Variable | Default | Purpose |
| --- | --- | --- |
| `OPENCODE_SERVER_URL` | — (disabled) | Local `opencode serve` base URL, e.g. `http://127.0.0.1:8001` |
| `OPENCODE_SERVER_PASSWORD` | — | Sent as `Authorization: Bearer` if the server requires it |
| `OPENCODE_MODEL` | `deepseek-v4-flash-free` | Model id served by the gateway |
| `OPENCODE_PROVIDER` | `opencode` | Provider id for the model |
| `OPENCODE_TIMEOUT_MS` | `180000` | Max wait for a response before erroring |
| `DEEPSEEK_BASE_URL` | `https://api.deepseek.com` | OpenAI-compatible base URL |
| `DEEPSEEK_API_KEY` | — | DeepSeek platform key (`https://platform.deepseek.com`) |
| `DEEPSEEK_MODEL` | `deepseek-v4-flash` | Model id (`deepseek-v4-flash` or `deepseek-v4-pro`) |
| `DEEPSEEK_MAX_TOKENS` | unset | Optional output cap |

### Free tier (OpenRouter)

```bash
DEEPSEEK_BASE_URL=https://openrouter.ai/api/v1
DEEPSEEK_API_KEY=<openrouter key>
DEEPSEEK_MODEL=deepseek/deepseek-v4-flash:free
```

Note: the `deepseek-v4-flash` alias always tracks DeepSeek's newest V4-Flash build (e.g. DeepSeek-V4-Flash-0731). The old `deepseek-chat` / `deepseek-reasoner` ids were retired 2026-07-24 — the code default no longer references them.

## Input format (how the assistant receives information)

Request to `POST {base}/chat/completions`:

```json
{
  "model": "deepseek-v4-flash",
  "stream": true,
  "stream_options": { "include_usage": true },
  "messages": [
    { "role": "system", "content": "<SystemPrompt in apps/api/src/constants/prompts.js>" },
    { "role": "user", "content": "<the trader's message text>" }
  ],
  "max_tokens": 4096
}
```

- **Text only** — attached images are uploaded to Supabase storage and recorded as URLs in message history; the OpenAI-compatible path sends text.
- **History** — the app stores the last 60 messages per user in Supabase. Each turn is stateless: system prompt + current user message; prior turns are replayed through the SSE stream so the model reads the full conversation client-side.
- **Auth** — the Express route `/api/ai/stream` requires a Supabase JWT; rate-limited per user.

## Output format (how the assistant returns information)

DeepSeek returns an SSE stream of `chat.completion.chunk` events; the API converts them to TradingBible events the web client already understands:

| DeepSeek field | TradingBible event |
| --- | --- |
| `choices[0].delta.content` | `type: "content"` → streamed into the assistant bubble |
| `choices[0].delta.reasoning_content` | `type: "reasoning"` (thinking trace when enabled) |
| stream end `data: [DONE]` | `type: "completed"` finalizer |

Any HTTP/JSON error from the provider is surfaced as `type: "error"` with a friendly message instead of an empty bubble. The client hook (`apps/web/src/hooks/use-integrated-ai.jsx`) renders all of these unchanged, so the chat UI works the same no matter which provider is active.

## Model instructions (system prompt)

`apps/api/src/constants/prompts.js` — describes the role (trading performance mentor), input rules (reason only from data the user provides, never fabricate numbers), output rules (plain text / light Markdown, concise, no JSON), platform knowledge (broker connections, charts, plans, Paddle billing) and off-topic redirection.