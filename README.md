# TenantOS

TenantOS is a multi-tenant SaaS backend built with Node.js, TypeScript, Express, PostgreSQL, Prisma, Redis, and Stripe test mode.

It demonstrates how multiple organizations can use one application while keeping their data separated.

## Features

- JWT authentication and refresh tokens
- Organization and workspace management
- Tenant-aware middleware and data access
- Role-based access control (RBAC)
- Project management
- Stripe test-mode checkout and subscription webhooks
- Usage metering and Redis counters
- Audit logging
- PostgreSQL schema and Row-Level Security (RLS) policy examples
- Docker Compose development environment
- Jest and Supertest test setup
- Postman API collection

## Technology

| Area | Technology |
|---|---|
| Runtime | Node.js |
| Language | TypeScript |
| API | Express.js |
| Database | PostgreSQL |
| ORM | Prisma |
| Cache | Redis |
| Authentication | JWT |
| Billing | Stripe |
| Validation | Zod |
| Testing | Jest, Supertest |
| Infrastructure | Docker Compose |

## Prerequisites

- Node.js 20 or later
- npm
- Docker Desktop
- A Stripe test account only when testing billing

## Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/Kushagrarai09/TenantOS.git
   cd TenantOS
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create your local environment file:

   ```bash
   cp .env.example .env
   ```

   On Windows PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

4. Set local secrets and connection strings in `.env`. Never commit this file.

5. Start PostgreSQL and Redis:

   ```bash
   docker compose up -d
   ```

6. Generate the Prisma client and run migrations:

   ```bash
   npm run db:generate
   npx prisma migrate dev --name init
   ```

7. Seed development data:

   ```bash
   npm run db:seed
   ```

8. Start the development server:

   ```bash
   npm run dev
   ```

The API is configured to run at `http://localhost:4000`. Check `GET /health` to verify that it is responding.

## API overview

The source is organized into modules for authentication, tenants, users, projects, usage, billing, and audit logs. Import `postman_collection.json` into Postman to explore the API requests.

Tenant-scoped requests use authenticated identity and tenant context. Do not trust a tenant identifier supplied by a client without verifying the authenticated user's membership.

## Tenant isolation notes

The project uses a shared-database/shared-schema model with tenant identifiers on tenant-owned records. The `prisma/rls.sql` file contains PostgreSQL RLS policy examples.

RLS is not automatically safe merely because policies exist. Before production use, connect tenant context to each database transaction (for example with transaction-local PostgreSQL settings), apply and test policies, and ensure the application role does not bypass RLS. Add integration tests that attempt cross-tenant reads and writes.

## Project status

This repository is a learning-oriented backend MVP and architecture foundation. Review and test all modules before production deployment. Production readiness requires, at minimum, verified tenant isolation, robust webhook signature verification and idempotency, authorization tests, rate limiting, secrets management, migrations, backups, monitoring, and deployment hardening.

## Security

- Keep `.env` out of version control.
- Use strong, unique JWT secrets.
- Use Stripe test keys only in local development.
- Never expose database credentials or webhook signing secrets.
- Review authorization and RLS policies before handling real tenant data.

## License

MIT
