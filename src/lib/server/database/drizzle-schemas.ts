import { sql } from 'drizzle-orm';
import { sqliteTable, text, integer, real, primaryKey } from 'drizzle-orm/sqlite-core';

// Users Table
export const userTable = sqliteTable('users', {
	id: text('id').notNull().primaryKey(),
	provider: text('provider').notNull().default('email'),
	providerId: text('provider_id').notNull().default(''),
	email: text('email').notNull().unique(),
	firstName: text('first_name').notNull(),
	lastName: text('last_name').notNull(),
	role: text('role').notNull().default('USER'),
	verified: integer('verified', { mode: 'boolean' }).default(false),
	receiveEmail: integer('receive_email', { mode: 'boolean' }).default(true),
	password: text('password'),
	token: text('token').unique(),
	createdAt: text('created_at')
		.notNull()
		.default(sql`CURRENT_TIMESTAMP`),
	updatedAt: text('updated_at').notNull()
});

// Sessions Table
export const sessionTable = sqliteTable('sessions', {
	id: text('id').notNull().primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => userTable.id),
	expiresAt: integer('expires_at').notNull()
});

// Patients Table
export const ptData = sqliteTable('patients', {
	id: text('id').notNull().primaryKey(),
	hashedNHI: text('hashed_nhi').notNull(),
	birthweight: real('birthweight')
});

// Many-to-Many Table: Users <-> Patients
export const userPatientsTable = sqliteTable(
	'user_patients',
	{
		userId: text('user_id')
			.notNull()
			.references(() => userTable.id), // Foreign key to Users table
		patientId: text('patient_id')
			.notNull()
			.references(() => ptData.id) // Foreign key to Patients table
	},
	(table) => ({
		pk: primaryKey(table.userId, table.patientId) // Composite primary key
	})
);

export type User = typeof userTable.$inferInsert;
export type UpdateUser = Partial<typeof userTable.$inferInsert>;
export type Session = typeof sessionTable.$inferInsert;
export type Patient = typeof ptData.$inferInsert;
export type UserPatient = typeof userPatientsTable.$inferInsert;
