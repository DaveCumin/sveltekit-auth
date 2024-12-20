// drizzle.config.ts
import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';
dotenv.config();

const { DATABASE_URL } = process.env;

if (!DATABASE_URL) {
	throw new Error(
		'No DATABASE_URL defined in the environment variables. Please ensure it is set in the .env file.'
	);
}

export default {
	schema: './src/lib/server/database/drizzle-schemas.ts',
	out: './src/lib/server/database/migrations',
	dialect: 'sqlite',
	dbCredentials: {
		url: DATABASE_URL
	}
} satisfies Config;

