import { BareBase, type BareBaseHelpers } from './bareBase.mjs';

export interface Helpers extends BareBaseHelpers {}

export abstract class Base<T extends Helpers = Helpers> extends BareBase<T> {
	constructor(helpers: T) {
		super(helpers);
		this.helpers = helpers;
	}
}
