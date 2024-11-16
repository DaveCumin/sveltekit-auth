import Database from 'better-sqlite3';
import { DATABASE_URL } from '$env/static/private';
import { drizzle } from 'drizzle-orm/better-sqlite3';
const sqliteClient = new Database(DATABASE_URL);

export const db = drizzle(sqliteClient);

export default db;
