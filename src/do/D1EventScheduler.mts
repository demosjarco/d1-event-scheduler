import { Hono } from 'hono';
import { timing } from 'hono/timing';
import type { EnvVars } from '../types.mjs';

export class D1EventScheduler {
	private state: DurableObjectState;
	private env: EnvVars;

	constructor(state: DurableObjectState, env: EnvVars) {
		this.state = state;
		this.env = env;
	}

	fetch(request: Parameters<DurableObject['fetch']>[0]): ReturnType<DurableObject['fetch']> {
		const app = new Hono<{ Bindings: EnvVars }>();

		app.use('*', timing());

		app.get('/', (c) => {
			console.debug(c.req.raw.url);
			return c.text('Hello world');
		});

		return app.fetch(request, this.env, { waitUntil: this.state.waitUntil, passThroughOnException() {} });
	}

	alarm(): ReturnType<DurableObject['alarm']> {}
}
