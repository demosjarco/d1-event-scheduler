import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { timing } from 'hono/timing';
import { z } from 'zod';
import type { EnvVars } from '../types.mjs';
import { EventDetailsKeys, type DefinedEvent } from './types.mjs';

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

		app.get('/', async (c) => {
			try {
				return c.json((await this.state.storage.get<DefinedEvent[]>('events', { allowConcurrency: true })) ?? []);
			} catch (error) {
				throw new HTTPException(500, { message: (error as Error).message });
			}
		});

		/**
		 * Per event responder below
		 * I'd do a separate hono router, but it breaks param()
		 */

		const eventPathWithRegex = '/:id{[0-9a-fA-F]+}';
		app.get(eventPathWithRegex, async (c) => {
			if (c.req.param('id') === this.state.id.toString()) {
				const keys = Object.keys(EventDetailsKeys);
				const eventInfo = await Promise.all(keys.map((key) => this.state.storage.get(key, { allowConcurrency: true })));

				return c.json(
					keys.reduce(
						(acc, key, index) => {
							acc[key] = eventInfo[index];
							return acc;
						},
						{} as { [key: string]: unknown },
					),
				);
			} else {
				throw new HTTPException(503, { message: `Requested ${c.req.param('id')} but ${this.state.id.toString()} responded` });
			}
		});
		app.post(
			eventPathWithRegex,
			zValidator(
				'json',
				z.object({
					body: z.string(),
				}),
			),
			(c) => {
				if (c.req.param('id') === this.state.id.toString()) {
					const { body } = c.req.valid('json');
					return c.json({ hello: 'world' });
				} else {
					throw new HTTPException(503, { message: `Requested ${c.req.param('id')} but ${this.state.id.toString()} responded` });
				}
			},
		);
		app.put(
			eventPathWithRegex,
			zValidator(
				'json',
				z.object({
					body: z.string(),
				}),
			),
			(c) => {
				if (c.req.param('id') === this.state.id.toString()) {
					const { body } = c.req.valid('json');
					return c.text('Hello world');
				} else {
					throw new HTTPException(503, { message: `Requested ${c.req.param('id')} but ${this.state.id.toString()} responded` });
				}
			},
		);
		app.patch(eventPathWithRegex, async (c) => {
			if (c.req.param('id') === this.state.id.toString()) {
				return c.text('Hello world');
			} else {
				throw new HTTPException(503, { message: `Requested ${c.req.param('id')} but ${this.state.id.toString()} responded` });
			}
		});
		app.delete(eventPathWithRegex, async (c) => {
			if (c.req.param('id') === this.state.id.toString()) {
				try {
					await this.state.storage.deleteAll();
					return c.text('Deleted event');
				} catch (error) {
					throw new HTTPException(500, { message: (error as Error).message });
				}
			} else {
				throw new HTTPException(503, { message: `Requested ${c.req.param('id')} but ${this.state.id.toString()} responded` });
			}
		});

		return app.fetch(request, this.env, { waitUntil: this.state.waitUntil, passThroughOnException() {} });
	}

	alarm(): ReturnType<DurableObject['alarm']> {}
}
