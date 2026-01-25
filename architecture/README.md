**Agentrix — Architecture Diagrams**

Files:
- `product-architecture.mmd` — high-level product architecture (users, frontend, backend, AI, blockchain, payments)
- `technical-architecture.mmd` — detailed technical view (NestJS modules, infra, SDKs, integrations)

How to render:
- In VS Code: install the "Mermaid Markdown Preview" or "Markdown Preview Enhanced" extension and open the `.mmd` file or paste the content into a `.md` fenced block with `mermaid`.
- Online: open https://mermaid.live and paste the `.mmd` content to preview and export PNG/SVG.
- CLI export: install `mmdc` (Mermaid CLI) and run:

```bash
npm install -g @mermaid-js/mermaid-cli
mmdc -i architecture/product-architecture.mmd -o architecture/product-architecture.png
mmdc -i architecture/technical-architecture.mmd -o architecture/technical-architecture.png
```

Legend / Notes:
- Backend is implemented in NestJS — see `backend/src/modules` for mapped modules.
- Frontend is Next.js — pages live under `frontend/pages`.
- AI providers (OpenAI/Gemini/Claude) are integrated via `backend/src/modules/ai-*`.
- Blockchain interactions and MPC signing are in `backend/src/modules/mpc-wallet` and `contract/`.

Next steps (I can do for you):
- Produce a PlantUML version if you prefer UML diagrams (SVG/PNG export ready).
- Generate PNG exports and commit them into `architecture/`.
- Create a one-page SVG combining both diagrams side-by-side.

Which of the next steps should I perform now?