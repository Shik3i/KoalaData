import type { users, sessions } from './lib/server/db/schema';

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: typeof users.$inferSelect | null;
			session: typeof sessions.$inferSelect | null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
