# 🚀 Ceciz Backend

Backend service for **Ceciz**, built with **Express 5**, **Prisma 7**, **PostgreSQL**, and **Better Auth**.

---

## 🛠️ Tech Stack

- **Runtime & Language:** [Node.js](https://nodejs.org/) (v20+) & [TypeScript](https://www.typescriptlang.org/)
- **Web Framework:** [Express.js v5](https://expressjs.com/)
- **Database & ORM:** [PostgreSQL](https://www.postgresql.org/) & [Prisma v7](https://www.prisma.io/) (with `@prisma/adapter-pg`)
- **Authentication:** [Better Auth](https://www.better-auth.com/) (Prisma Adapter)
- **Validation:** [Zod](https://zod.dev/)
- **Linter & Formatter:** [Biome](https://biomejs.dev/)
- **Development Tooling:** [tsx](https://github.com/privatenumber/tsx) & [pnpm](https://pnpm.io/)

---

## 📁 Project Structure

```text
ceciz-backend/
├── prisma/
│   └── schema.prisma         # Prisma schema definition
├── src/
│   ├── generated/            # Generated Prisma Client (gitignored)
│   ├── lib/
│   │   ├── auth.ts           # Better Auth instance & adapter configuration
│   │   └── prisma.ts         # Prisma Client instance & pg adapter setup
│   └── server.ts             # Express application entry point
├── .env.example              # Environment variables template
├── biome.json                # Biome configuration (linter + formatter)
├── package.json              # Project dependencies and npm scripts
└── tsconfig.json             # TypeScript compiler configuration (with @/* alias)
```

---

## ⚙️ Getting Started

### 1. Prerequisites

Ensure you have the following installed on your machine:
- [Node.js](https://nodejs.org/) (v20.x or higher)
- [pnpm](https://pnpm.io/) (`npm install -g pnpm`)
- [PostgreSQL](https://www.postgresql.org/) database running locally or hosted (e.g. Supabase, Neon, Railway)

### 2. Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/cecizGO-app/ceciz-backend.git
cd ceciz-backend
pnpm install
```

### 3. Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```


```

### 4. Database Setup

Generate the Prisma Client and run migrations:

```bash
# Generate Prisma Client to src/generated/prisma
pnpm db:generate

# Run initial migrations
pnpm db:migrate
```

*(Optional) Generate Better Auth schema if not already present:*
```bash
pnpm dlx @better-auth/cli generate
pnpm db:migrate
```

### 5. Start Development Server

```bash
pnpm dev
```

The server will start at: `http://localhost:3005`

---

## 📜 Available Scripts

| Command | Description |
| :--- | :--- |
| `pnpm dev` | Start development server with live reload via `tsx` |
| `pnpm build` | Generate Prisma client and compile TypeScript to `dist/` |
| `pnpm db:generate` | Generate Prisma Client into `src/generated/prisma` |
| `pnpm db:migrate` | Create and apply database migrations with Prisma |
| `pnpm db:push` | Push Prisma schema state directly to the database without migrations |
| `pnpm db:studio` | Open interactive Prisma Studio GUI in the browser |
| `pnpm lint` | Check code quality and style using Biome |
| `pnpm lint:fix` | Automatically fix linting and formatting issues using Biome |
| `pnpm format` | Format files according to Biome rules |

---

## 🔐 Authentication

Authentication is handled via **Better Auth**:
- Auth API handler is mounted at `/api/auth/*splat` in `src/server.ts`.
- Adapters and database models are connected directly through Prisma (`src/lib/auth.ts`).

---

## 🧹 Code Quality & Formatting

This project uses [Biome](https://biomejs.dev/) for fast linting and code formatting:

```bash
# Check code style & errors
pnpm lint

# Auto-fix formatting and linting issues
pnpm lint:fix
```

---

## 📄 License

This project is licensed under the ISC License.
