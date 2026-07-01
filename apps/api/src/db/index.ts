/**
 * DB CONNECTION
 *
 * This file creates one shared database connection that the entire app uses.
 * It's imported by controllers whenever they need to run a query.
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

// A Pool manages multiple database connections simultaneously.
//
// WHY a pool instead of a single connection?
//   HTTP servers handle many requests at the same time. If you had only one
//   DB connection, requests would queue up and wait for each other.
//   A pool keeps several connections open (default: 10) and hands them out
//   to requests as needed, then returns them when the query is done.
//
// DATABASE_URL format: postgresql://user:password@host:port/database
// It's read from the .env file (loaded by 'import dotenv/config' in index.ts).
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// drizzle() wraps the pool with Drizzle ORM's query builder.
// Passing { schema } lets Drizzle know about our tables so it can provide
// type-safe query results (e.g. db.query.users.findMany() knows the shape).
export const db = drizzle(pool, { schema });
