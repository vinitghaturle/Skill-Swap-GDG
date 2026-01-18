# SkillSwap Hub

A 1:1 peer-to-peer skill exchange platform where users teach skills they know and learn skills they want in live sessions.

## 🚀 Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Backend:** Convex (primary) + Node.js services (auxiliary)
- **Authentication:** Firebase Auth
- **Styling:** TailwindCSS
- **Video:** WebRTC (PeerJS)
- **Storage:** Dropbox API
- **Monorepo:** Turborepo + pnpm

## 📦 Project Structure

```
skillswap-hub/
├── packages/
│   ├── web/          # React frontend
│   ├── convex/       # Convex backend
│   └── services/     # Node.js microservices
└── ...
```

## 🛠️ Setup

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0

### Installation

1. Clone the repository
2. Copy `.env.template` to `.env.local` and fill in your credentials
3. Install dependencies:

```bash
pnpm install
```

4. Start development servers:

```bash
pnpm dev
```

## 🔑 Required Credentials

Before running the app, you need to set up:

1. **Firebase Project** (for authentication)
2. **Convex Account** (for backend)
3. **Dropbox App** (for file storage)

See `.env.template` for all required environment variables.

## 📚 Documentation

See the [System Specification](./skill_swap_hub_llm_ready_prd_architecture_execution_plan.md) for detailed product requirements and architecture.

## 🧑‍💻 Development

- `pnpm dev` - Start all services in development mode
- `pnpm build` - Build all packages for production
- `pnpm lint` - Run linters
- `pnpm format` - Format code with Prettier

## 📝 License

MIT
