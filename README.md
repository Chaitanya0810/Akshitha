# School Management System

A full-stack school administration and learning platform for managing students, staff, classes, attendance, assignments, assessments, fees, communication, and school operations.

## Features

- **Students and admissions:** student profiles, enrollment, guardians, class and section placement, and application tracking.
- **Academics:** classes, sections, subjects, syllabus, timetables, attendance, assignments, homework, assessments, question banks, grading, and report cards.
- **Learning tools:** course modules, LMS content, learning paths, discussion forums, live classes, and teaching progress.
- **Finance:** fee heads and structures, payments, concessions, defaulter tracking, expenses, payroll, and transport billing.
- **School operations:** staff directory, library, inventory, bus routes, hostel, health records, room bookings, visitors, events, and certificates.
- **Communication:** announcements, parent-teacher meetings, notifications, messaging, and student leave requests.
- **Reporting and administration:** role-based dashboards, analytics, audit logs, bulk operations, settings, and academic-year transitions.

The application has a Next.js web app, a NestJS API, and a MySQL database managed through Prisma. Redis and S3-compatible storage settings are available for optional integrations; the core app does not require Docker to run.

## Requirements

- Node.js 20 or newer
- npm 10 or newer
- MySQL 8.0 or a compatible MySQL server

## Run locally

1. Install dependencies from the repository root:

   ```bash
   npm install
   ```

2. Create a MySQL database and user. For example, from the MySQL client:

   ```sql
   CREATE DATABASE mis_ilsms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'mis_user'@'localhost' IDENTIFIED BY 'mis_password';
   GRANT ALL PRIVILEGES ON mis_ilsms.* TO 'mis_user'@'localhost';
   ```

3. Copy `.env.example` to `.env` and set `DATABASE_URL` to match your MySQL host, port, username, password, and database. Set unique `JWT_SECRET` and `JWT_REFRESH_SECRET` values for anything beyond local development.

   ```text
   DATABASE_URL="mysql://mis_user:mis_password@localhost:3306/mis_ilsms"
   ```

4. Create the tables and add base plus demo data:

   ```bash
   npm run db:push
   npm run db:seed
   npm run db:seed:demo
   ```

   `db:seed` creates the initial school, academic sessions, classes, subjects, admin, and teacher. Run it once on a fresh database. `db:seed:demo` can be rerun safely to ensure the sample students and coursework are present.

5. Start the web app and API:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000). The API runs at `http://localhost:4000/api/v1`; API documentation is at `http://localhost:4000/api/docs`.

## Demo logins

| Role | Email | Password |
|---|---|---|
| Administrator | `admin@medicaps.edu.in` | `admin123` |
| Teacher | `teacher@medicaps.edu.in` | `teacher123` |
| Student | `akshitha@medicaps.edu.in` | `student123` |

The demo seed creates ten Class 10A students, assignments, assessments, attendance, announcements, guardian contacts, and a sample fee item. These credentials are for local demonstration only; change them before using the app with real data.

## Database tools

Prisma Studio provides a visual view of the tables and records:

```bash
npm run db:studio
```

It opens at [http://localhost:5555](http://localhost:5555). In MySQL Workbench, connect using the host, port, database, and credentials configured in `.env`. Student enrollment data is in `students`; names and login emails are in `users`; assignments are in `assignments`; attendance is in `attendances`.

## Monorepo layout

```text
packages/
  api/       NestJS API, Prisma schema, and seed scripts
  shared/    Shared TypeScript types and validation
  web/       Next.js web app
```

## Useful commands

| Command | Description |
|---|---|
| `npm run dev` | Run the web app and API in development mode |
| `npm run build` | Build the workspaces |
| `npm run db:push` | Apply the Prisma schema to the configured MySQL database |
| `npm run db:seed` | Add base school data to a fresh database |
| `npm run db:seed:demo` | Add or ensure the sample student and coursework data |
| `npm run db:studio` | Open the database browser |

## Hosting

GitHub hosts this source code, but GitHub Pages cannot run this application's Next.js server, NestJS API, or MySQL database. A live, interactive demo needs a host for the web app and API plus a reachable MySQL database. Configure the database URL, JWT secrets, and web-to-API URL with the hosting provider's environment variables, then deploy the web and API workspaces as Node.js services. Do not use the local demo credentials or sample secrets for a public deployment.

## License

This project is available under the GNU Affero General Public License v3.0. See [LICENSE](LICENSE).
