import { redirect } from '@sveltejs/kit';

export const load = async (event) => {
	const user = event.locals.user;
	if (user) {
		throw redirect(302, '/dashboard');
	}

	return { user };
};
