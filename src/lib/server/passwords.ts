export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 1024;

export function assertPasswordLength(password: string, label = 'Password'): void {
	if (password.length < MIN_PASSWORD_LENGTH) {
		throw new Error(`${label} must be at least ${MIN_PASSWORD_LENGTH} characters long.`);
	}
	if (password.length > MAX_PASSWORD_LENGTH) {
		throw new Error(`${label} cannot exceed ${MAX_PASSWORD_LENGTH} characters.`);
	}
}
