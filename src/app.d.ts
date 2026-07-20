import type { users, sessions } from './lib/server/db/schema';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: Omit<typeof users.$inferSelect, 'passwordHash'> | null;
			session: typeof sessions.$inferSelect | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
