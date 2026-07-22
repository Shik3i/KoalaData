export const pricingModels = ['free', 'freemium', 'paid'] as const;
export type PricingModel = (typeof pricingModels)[number];

export function isPricingModel(value: string): value is PricingModel {
	return pricingModels.includes(value as PricingModel);
}

export function pricingModelLabel(value: string): string | null {
	if (value === 'free') return 'Free';
	if (value === 'freemium') return 'Freemium';
	if (value === 'paid') return 'Paid';
	return null;
}
