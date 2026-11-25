# Security

- Read-only GitHub access. Tokens stay on the server, never stored long term.
- Treat READMEs, issues, and TODO text as untrusted. Never render as raw HTML. Validate and escape LLM output. The LLM gets no tools.
- Send the LLM only README text, issue titles, TODO lines, basic metadata. Never private source code.
- Never commit secrets. `.env.example` holds names only. No tokens in `.kiro/`.
- Rate limit per user, global LLM spend cap, security headers, pin third-party CI actions to commit SHAs.
