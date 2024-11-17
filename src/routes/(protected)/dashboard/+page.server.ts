import { redirect } from '@sveltejs/kit';
import db from '$lib/server/database/drizzle';
import { ptData, userPatientsTable } from '$lib/server/database/drizzle-schemas';
import { sql } from 'drizzle-orm'; // Import `sql` for raw SQL

export const load = async (event) => {
	//I only have this function here so it will check page again
	//instead of keeping it cache if it was client side only.
	//If only client side, it might still show the page even
	//if the user has logged out.
	//const session = await event.locals.auth.validate();
	const user = event.locals.user;
	if (!user) {
		throw redirect(302, '/auth/sign-in');
	}

	const patients = await db
		.select()
		.from(ptData)
		.innerJoin(userPatientsTable, sql`${userPatientsTable.patientId} = ${ptData.id}`)
		.where(sql`${userPatientsTable.userId} = ${user.id}`);

	return { user, patients };
};
