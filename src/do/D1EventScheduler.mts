import { parseExpression } from 'cron-parser';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { timing } from 'hono/timing';
import type { EnvVars } from '../types.mjs';
import { EventDetailsKeys, type DefinedEvent, type EventDetail, type EventDetailGQL } from './types.mjs';

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
				const combinedFullDetail: Promise<EventDetail>[] = [];

				for (const event of (await this.state.storage.get<DefinedEvent[]>('events', { allowConcurrency: true })) ?? []) {
					combinedFullDetail.push(
						new Promise<EventDetail>((resolve, reject) => {
							this.env.D1_EVENT_SCHEDULER.get(this.env.D1_EVENT_SCHEDULER.idFromString(event.id))
								.fetch(
									new Request(new URL(`/${event.id}`, 'https://d1.event'), {
										// @ts-expect-error
										cf: c.req.raw.cf,
									}),
								)
								.then((response) => {
									if (response.ok) {
										response.json<EventDetail>().then(resolve).catch(reject);
									} else {
										reject(response.status);
									}
								})
								.catch(reject);
						}),
					);
				}

				return c.json(await Promise.all(combinedFullDetail));
			} catch (error) {
				throw new HTTPException(500, { message: (error as Error).message });
			}
		});
		app.patch('/', async (c) => {
			try {
				const incoming = await c.req.json<DefinedEvent>();

				const existing = (await this.state.storage.get<DefinedEvent[]>('events', { allowConcurrency: true })) ?? [];
				const index = existing.findIndex((event) => event.id === incoming.id);
				if (index !== -1) existing.splice(index, 1);
				existing.push(incoming);

				await this.state.storage.put<DefinedEvent[]>('events', Array.from(existing));

				return c.json([incoming]);
			} catch (error) {
				throw new HTTPException(500, { message: (error as Error).message });
			}
		});
		app.delete('/', async (c) => {
			try {
				const incoming = await c.req.json<DefinedEvent>();

				const existing = (await this.state.storage.get<DefinedEvent[]>('events', { allowConcurrency: true })) ?? [];
				const index = existing.findIndex((event) => event.id === incoming.id);
				if (index > -1) {
					existing.splice(index, 1);

					await this.state.storage.put<DefinedEvent[]>('events', Array.from(existing));

					return c.json([]);
				} else {
					throw new HTTPException(404, { message: `${incoming.name} (${incoming.id}) not found` });
				}
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

				return c.json({
					...keys.reduce(
						(acc, key, index) => {
							acc[key] = eventInfo[index];
							return acc;
						},
						{} as { [key: string]: unknown },
					),
					EVENT_ID: this.state.id.toString(),
				});
			} else {
				throw new HTTPException(503, { message: `Requested ${c.req.param('id')} but ${this.state.id.toString()} responded` });
			}
		});
		app.on(['POST', 'PUT'], eventPathWithRegex, async (c) => {
			if (c.req.param('id') === this.state.id.toString()) {
				try {
					const incoming = await c.req.json<EventDetailGQL>();

					if (incoming[EventDetailsKeys.EVENT_TYPE] === 'ONE TIME') {
						if (!incoming[EventDetailsKeys.EXECUTE_AT]) {
							throw new HTTPException(400, { message: `Missing ${EventDetailsKeys.EXECUTE_AT}` });
						}
					} else if (incoming[EventDetailsKeys.EVENT_TYPE] === 'RECURRING') {
						if (!incoming[EventDetailsKeys.CRON] && !(incoming[EventDetailsKeys.INTERVAL_VALUE] !== undefined && incoming[EventDetailsKeys.INTERVAL_FIELD])) {
							throw new HTTPException(400, { message: `Missing ${EventDetailsKeys.CRON} or (${EventDetailsKeys.INTERVAL_VALUE} and ${EventDetailsKeys.INTERVAL_FIELD})` });
						}
					}

					const saving: EventDetail = {
						...incoming,
						// Rewrite ISO 8601 strings as Date objects
						[EventDetailsKeys.EXECUTE_AT]: incoming[EventDetailsKeys.EXECUTE_AT] ? new Date(incoming[EventDetailsKeys.EXECUTE_AT]) : undefined,
						[EventDetailsKeys.STARTS]: incoming[EventDetailsKeys.STARTS] ? new Date(incoming[EventDetailsKeys.STARTS]) : new Date(),
						[EventDetailsKeys.ENDS]: incoming[EventDetailsKeys.ENDS] ? new Date(incoming[EventDetailsKeys.ENDS]) : undefined,
						// Generate
						[EventDetailsKeys.CREATED]: new Date(),
						[EventDetailsKeys.LAST_ALTERED]: new Date(),
					};

					await Promise.all([
						this.state.storage.put<any>(saving),
						this.nextAlarmRun.then((nextAlarm) => this.state.storage.setAlarm(nextAlarm.getTime())),
						this.env.D1_EVENT_SCHEDULER.get(this.env.D1_EVENT_SCHEDULER.idFromName('d1.event')).fetch(
							new Request(new URL('https://d1.event'), {
								method: 'PATCH',
								headers: {
									'Content-Type': 'application/json',
								},
								// @ts-expect-error
								cf: c.req.raw.cf,
								body: JSON.stringify({
									id: this.state.id.toString(),
									name: this.state.id.name ?? saving[EventDetailsKeys.EVENT_NAME],
								} as DefinedEvent),
							}),
						),
					]);

					return c.json({
						...saving,
						EVENT_ID: this.state.id.toString(),
					});
				} catch (error) {
					throw new HTTPException(500, { message: (error as Error).message });
				}
			} else {
				throw new HTTPException(503, { message: `Requested ${c.req.param('id')} but ${this.state.id.toString()} responded` });
			}
		});
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
					await Promise.all([
						this.state.storage.deleteAll(),
						// this.state.storage.deleteAlarm(),
						this.env.D1_EVENT_SCHEDULER.get(this.env.D1_EVENT_SCHEDULER.idFromName('d1.event'))
							.fetch(
								new Request(new URL('https://d1.event'), {
									method: 'DELETE',
									headers: {
										'Content-Type': 'application/json',
									},
									// @ts-expect-error
									cf: c.req.raw.cf,
									body: JSON.stringify({
										id: this.state.id.toString(),
									} as DefinedEvent),
								}),
							)
							.then((response) => {
								if (!response.ok) {
									throw new Error(`HTTP ${response.status}: ${response.statusText}`);
								}
							}),
					]);

					return c.json({});
				} catch (error) {
					throw new HTTPException(500, { message: (error as Error).message });
				}
			} else {
				throw new HTTPException(503, { message: `Requested ${c.req.param('id')} but ${this.state.id.toString()} responded` });
			}
		});

		return app.fetch(request, this.env, { waitUntil: this.state.waitUntil, passThroughOnException() {} });
	}

	private static addIntervalToDate(date: Date, interval: number, type: NonNullable<EventDetail[EventDetailsKeys.INTERVAL_FIELD]>): Date {
		const newDate = new Date(date.getTime());
		switch (type) {
			case 'MILLISECONDS':
				newDate.setMilliseconds(newDate.getMilliseconds() + interval);
				break;
			case 'SECONDS':
				newDate.setSeconds(newDate.getSeconds() + interval);
				break;
			case 'MINUTES':
				newDate.setMinutes(newDate.getMinutes() + interval);
				break;
			case 'HOURS':
				newDate.setHours(newDate.getHours() + interval);
				break;
			case 'DAYS':
				newDate.setDate(newDate.getDate() + interval);
				break;
			case 'WEEKS':
				newDate.setDate(newDate.getDate() + interval * 7);
				break;
			case 'MONTHS':
				newDate.setMonth(newDate.getMonth() + interval);
				break;
			case 'QUARTERS':
				newDate.setMonth(newDate.getMonth() + interval * 3);
				break;
			case 'YEARS':
				newDate.setFullYear(newDate.getFullYear() + interval);
				break;
		}
		return newDate;
	}

	private static calculateNextInstance(intervalValue: number, intervalType: NonNullable<EventDetail[EventDetailsKeys.INTERVAL_FIELD]>, startDate: Date, endDate?: Date, currentDate: Date = new Date()) {
		// Don't even bother calculating
		if (endDate && currentDate > endDate) {
			throw new Error('Already expired');
		}

		let nextInstance = startDate;

		while (nextInstance <= currentDate && (endDate ? nextInstance <= endDate : true)) {
			nextInstance = this.addIntervalToDate(nextInstance, intervalValue, intervalType);
		}

		// Not able to generate run date after now
		if (nextInstance < currentDate) {
			throw new Error('Already expired');
		}

		return nextInstance;
	}

	private get nextAlarmRun() {
		return new Promise<Date>((resolve, reject) => {
			this.state.storage
				.getAlarm()
				.then(async (existingAlarm) => {
					if (existingAlarm !== null) {
						resolve(new Date(existingAlarm));
					} else {
						this.state.storage
							.get<EventDetail[EventDetailsKeys.CRON]>(EventDetailsKeys.CRON)
							.then((cronString) => {
								if (cronString) {
									resolve(parseExpression(cronString).next().toDate());
								} else {
									this.state.storage
										.get([EventDetailsKeys.INTERVAL_VALUE, EventDetailsKeys.INTERVAL_FIELD, EventDetailsKeys.STARTS, EventDetailsKeys.ENDS])
										.then((test) => {
											if (test.size === 3 || test.size === 4) {
												try {
													resolve(D1EventScheduler.calculateNextInstance(test.get(EventDetailsKeys.INTERVAL_VALUE) as number, test.get(EventDetailsKeys.INTERVAL_FIELD) as NonNullable<EventDetail[EventDetailsKeys.INTERVAL_FIELD]>, test.get(EventDetailsKeys.STARTS) as Date, test.get(EventDetailsKeys.ENDS) as Date | undefined));
												} catch (error) {
													reject('Date not available');
												}
											} else {
												reject('Missing cron & interval');
											}
										})
										.catch(reject);
								}
							})
							.catch(reject);
					}
				})
				.catch(reject);
		});
	}

	alarm() {
		// Needs `Awaited<>` or else it stacks `Promise<>`s
		return new Promise<Awaited<ReturnType<NonNullable<DurableObject['alarm']>>>>((mainResolve, mainReject) => {
			/**
			 * @todo SQL stuff
			 */

			this.nextAlarmRun
				.then((nextAlarmDate) => this.state.storage.setAlarm(nextAlarmDate.getTime()))
				.catch(() =>
					this.state.storage
						.get<EventDetail[EventDetailsKeys.AUTO_DELETE]>(EventDetailsKeys.AUTO_DELETE)
						.then((autoDelete) => {
							if (autoDelete) {
								this.env.D1_EVENT_SCHEDULER.get(this.state.id)
									.fetch(
										new Request(new URL(`/${this.state.id.toString()}`, 'https://d1.event'), {
											// @ts-expect-error
											cf: c.req.raw.cf,
										}),
									)
									.then((response) => (response.ok ? mainResolve : mainReject(response.status)))
									.catch(mainReject);
							} else {
								mainResolve();
							}
						})
						.catch(mainReject),
				);
		});
	}
}
