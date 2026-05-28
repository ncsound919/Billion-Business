# Grader

<!-- Deployed via Vercel -->
An honest, data-backed codebase grading engine. Analyzes any public GitHub repository across security, quality, market fit, architecture, OSS licensing, compliance (ISO 5055), and valuation — powered by Google Gemini AI.

Part of the **Billion Business** portfolio.

## Features

- **Security Audit** — dependency vulnerability scanning, secret leak detection
- **Quality Scorecard** — README quality, test coverage detection, setup friction analysis
- **Market Benchmarking** — star/forks/activity comparison against competitors
- **Valuation Engine** — replacement cost, relief-from-royalty, productivity debt heuristics
- **OSS License Audit** — copyleft detection, license conflict analysis
- **ISO 5055 Compliance** — reliability, security, maintainability, performance scoring
- **Quick Wins & Roadmap** — actionable prioritized improvement plan

## Quick Start

```bash
# Install
npm install

# Configure
cp .env.example .env
# Edit .env: set GEMINI_API_KEY to your Gemini API key

# Run (development with hot reload)
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## API

### `POST /api/grade`
Grades a public GitHub repository.

**Body:** `{ "repoUrl": "owner/repo" }` or `{ "repoUrl": "https://github.com/owner/repo" }`

**Response:** Full `HealthReport` JSON with scores, security, quality, market, valuation, OSS, architecture, compliance sections.

### `GET /api/scans`
Returns local scan history (in-memory, lost on restart).

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite 6, Tailwind CSS 4, Motion
- **Backend:** Express 4, TypeScript
- **AI:** Google Gemini (`gemini-2.5-flash`) via `@google/genai` SDK
- **Container:** Docker (multi-stage build)

## Project Structure

```
Grader-main/
├── src/
│   ├── components/        # 17 UI components
│   │   ├── ScoreGauge.tsx
│   │   ├── SecuritySection.tsx
│   │   ├── QualitySection.tsx
│   │   └── ...
│   ├── App.tsx            # Main application (orchestrator)
│   ├── types.ts           # All TypeScript interfaces
│   ├── main.tsx           # Entry point
│   └── index.css          # Tailwind imports
├── server.ts              # Express + Gemini integration
├── vite.config.ts
├── tsconfig.json
└── Dockerfile
```

## Deployment Checklist

*   [ ] **Environment Variables**: Ensure all required variables are set in `.env` or the deployment environment:
    *   `PORT`: Server port (default: 3000)
    *   `GEMINI_API_KEY`: Google Gemini API key (required)
    *   `GEMINI_MODEL`: Gemini model name (default: `gemini-2.5-flash`)
    *   `GITHUB_TOKEN`: Personal Access Token for authenticated GitHub API requests (optional, but recommended for higher rate limits)
*   [ ] **GitHub API Authentication**: Set `GITHUB_TOKEN` for unauthenticated API requests.
*   [ ] **AI Response Handling**: Validate AI output schema before processing.
*   [ ] **Health and Readiness Endpoints**: Implement `/healthz` and `/readyz` endpoints.
*   [ ] **Cross-Platform Scripting**: Ensure `clean` script uses `rimraf` and tests use `dotenv-cli` for cross-platform compatibility.
*   [ ] **CI/CD Pipeline**: Configure `.github/workflows/ci.yml` to run linters, tests (`npm test`), and build steps.
*   [ ] **Application Export**: Export Express app from server logic for easier testing.
*   [ ] **README Update**: Ensure README details production configuration, operational limits, and rollback procedures.
*   [ ] **Release Tag**: Create a Git tag for the first production release.

## Environment Variables

The application relies on several environment variables for configuration and operation. Create a `.env` file in the project root (or set these variables in your deployment environment). A `.env.example` file is provided for reference.

*   `PORT`: The port the server listens on.
*   `GEMINI_API_KEY`: Your Google Gemini API key.
*   `GEMINI_MODEL`: The specific Gemini model to use (e.g., `gemini-2.5-flash`, `gemini-1.5-pro`).
*   `GITHUB_TOKEN`: A GitHub Personal Access Token (PAT) to authenticate API requests. This increases rate limits significantly and is recommended for production.

## Build Artifacts & Operational Limits

*   **Build Artifacts**: The `npm run build` command generates a frontend bundle (typically in a `dist` directory) and a Node.js server executable (`dist/server.cjs`).
*   **Startup Command**: Use `npm start` to run the production server.
*   **Rate Limiting**: The service is subject to GitHub API rate limits. Using a `GITHUB_TOKEN` mitigates this. Explicit error responses are provided for rate limiting events.
*   **AI Model Behavior**: Gemini model outputs are validated against a schema before being processed.

## Rollback Steps

1.  **Revert Code Changes**:
    Revert the commit that introduced these deployment-ready changes.
2.  **Restore Environment**:
    Revert any changes to the `.env` file or deployment environment variables.
3.  **Check Previous Logs**:
    Review logs from the previous stable version for any critical issues.
