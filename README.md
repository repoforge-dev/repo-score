# RepoScore

**RepoScore** analyzes GitHub repositories and produces a quality score based on:

- 📄 **Documentation** — README completeness, contributing guides, etc.
- 🔍 **Discoverability** — Topics, description, license presence
- 🏗️ **Structure** — Conventional files like `.gitignore`, CI configs, tests
- 📊 **Metadata** — Stars, forks, open issues, last commit activity

---

## Getting Started

### Prerequisites

- Node.js >= 18
- A GitHub Personal Access Token (for higher API rate limits)

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```env
PORT=3000
GITHUB_TOKEN=your_github_personal_access_token
```

### Running the Server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

---

## API Endpoints

### `POST /api/analyze`

Analyzes a GitHub repository and returns a RepoScore.

**Request Body:**
```json
{
  "repoUrl": "https://github.com/owner/repo"
}
```

**Response:**
```json
{
  "repo": "owner/repo",
  "score": 82,
  "breakdown": {
    "metadata": 20,
    "readme": 35,
    "structure": 27
  }
}
```

---

### `GET /api/badge/:owner/:repo`

Returns an SVG badge displaying the RepoScore for the given repository.

**Example:**
```
GET /api/badge/facebook/react
```

**Response:** An SVG image suitable for embedding in a README.

---

## Project Structure

```
reposcore/
├── src/
│   ├── server.js                  # Express app entry point
│   ├── routes/
│   │   ├── analyze.js             # POST /api/analyze
│   │   └── badge.js               # GET /api/badge/:owner/:repo
│   ├── github/
│   │   └── githubClient.js        # GitHub API wrapper
│   ├── analyzers/
│   │   ├── metadataAnalyzer.js    # Stars, forks, license, topics
│   │   ├── readmeAnalyzer.js      # README presence and quality
│   │   └── structureAnalyzer.js   # Repo file structure checks
│   ├── scoring/
│   │   └── scoreEngine.js         # Combines analyzer results into a score
│   └── utils/
│       └── repoParser.js          # Parses GitHub URLs into owner/repo
├── package.json
└── README.md
```

---

## License

MIT
