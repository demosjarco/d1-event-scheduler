import type { AppContext } from '../types.mjs';

export interface BareBaseHelpers {
	c: AppContext;
}

export abstract class BareBase<T extends BareBaseHelpers = BareBaseHelpers> {
	// @ts-ignore
	protected helpers: T = {};

	constructor(helpers: T) {
		this.helpers = helpers;
	}
}
