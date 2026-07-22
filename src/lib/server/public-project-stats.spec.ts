import { describe, expect, it } from 'vitest';
import { ratingStars } from './public-project-stats';

describe('public project rating summaries', () => {
	it('recognizes localized and legacy star dimensions', () => {
		expect(ratingStars('Rating Distribution', '{"rating":"5 stars"}')).toBe(5);
		expect(ratingStars('Bewertungen im Zeitverlauf', '{"rating":"Ein Stern"}')).toBe(1);
		expect(ratingStars('Rating Distribution: 4 stars', '{}')).toBe(4);
	});

	it('ignores unrelated custom metrics', () => {
		expect(ratingStars('Support requests', '{"region":"US"}')).toBeNull();
		expect(ratingStars('Users by Item Version: 2.0', '{}')).toBeNull();
		expect(ratingStars('Installationen nach Erweiterungsversion: 5.4.1', '{}')).toBeNull();
	});
});
