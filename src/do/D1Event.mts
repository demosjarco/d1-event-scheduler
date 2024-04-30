import { DurableObject } from 'cloudflare:workers';
import { parseExpression } from 'cron-parser';
import type { EnvVars } from '../types.mjs';
import type { D1EventScheduler } from './D1EventScheduler.mjs';
import { EventDetailsKeys, type EventDetail, type EventDetailGQL, type GuaranteedEventDetail, type ValueOf } from './types.mjs';

export class D1Event extends DurableObject<EnvVars> {
	public get event(): Promise<GuaranteedEventDetail> {
		return this.ctx.storage.get<ValueOf<EventDetail>>(Object.keys(EventDetailsKeys), { allowConcurrency: true }).then((eventInfo) => ({
			...Object.fromEntries(eventInfo.entries()),
			[EventDetailsKeys.EVENT_ID]: this.ctx.id.toString(),
		}));
	}

	public async setEvent(incoming: EventDetailGQL): Promise<EventDetail> {
		if (incoming[EventDetailsKeys.EVENT_TYPE] === 'ONE TIME') {
			if (!incoming[EventDetailsKeys.EXECUTE_AT]) {
				throw new Error(`Missing ${EventDetailsKeys.EXECUTE_AT}`);
			}
		} else if (incoming[EventDetailsKeys.EVENT_TYPE] === 'RECURRING') {
			if (!incoming[EventDetailsKeys.CRON] && !(incoming[EventDetailsKeys.INTERVAL_VALUE] !== undefined && incoming[EventDetailsKeys.INTERVAL_FIELD])) {
				throw new Error(`Missing ${EventDetailsKeys.CRON} or (${EventDetailsKeys.INTERVAL_VALUE} and ${EventDetailsKeys.INTERVAL_FIELD})`);
			}
		}

		const saving: EventDetail = {
			// Generate
			[EventDetailsKeys.CREATED]: new Date(),
			...incoming,
			// Rewrite ISO 8601 strings as Date objects
			[EventDetailsKeys.EXECUTE_AT]: incoming[EventDetailsKeys.EXECUTE_AT] ? new Date(incoming[EventDetailsKeys.EXECUTE_AT]) : undefined,
			[EventDetailsKeys.STARTS]: incoming[EventDetailsKeys.STARTS] ? new Date(incoming[EventDetailsKeys.STARTS]) : new Date(),
			[EventDetailsKeys.ENDS]: incoming[EventDetailsKeys.ENDS] ? new Date(incoming[EventDetailsKeys.ENDS]) : undefined,
			// Generate
			[EventDetailsKeys.LAST_ALTERED]: new Date(),
		};

		this.ctx.waitUntil(
			Promise.all([
				this.ctx.storage.put<any>(saving),
				this.nextAlarmRun.then((nextAlarm) => this.ctx.storage.setAlarm(nextAlarm.getTime())),
				this.env.D1_EVENT_SCHEDULER.get(this.env.D1_EVENT_SCHEDULER.idFromName('d1.event')).setEvent({
					id: this.ctx.id.toString(),
					name: this.ctx.id.name ?? saving[EventDetailsKeys.EVENT_NAME],
				}) as ReturnType<D1EventScheduler['setEvent']>,
			]),
		);

		return {
			...saving,
			EVENT_ID: this.ctx.id.toString(),
		};
	}

	public async deleteEvent() {
		this.ctx.storage.get<EventDetail[EventDetailsKeys.EVENT_NAME]>(EventDetailsKeys.EVENT_NAME).then((name) => {
			Promise.all([
				this.ctx.storage.deleteAll(),
				this.env.D1_EVENT_SCHEDULER.get(this.env.D1_EVENT_SCHEDULER.idFromName('d1.event')).deleteEvent({
					id: this.ctx.id.toString(),
					name,
				}) as ReturnType<D1EventScheduler['deleteEvent']>,
			]);
		});

		return {};
	}

	private static addIntervalToDate(date: Date, interval: number, type: NonNullable<EventDetail[EventDetailsKeys.INTERVAL_FIELD]>) {
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
			this.ctx.storage
				.getAlarm()
				.then(async (existingAlarm) => {
					if (existingAlarm !== null) {
						resolve(new Date(existingAlarm));
					} else {
						this.ctx.storage
							.get<EventDetail[EventDetailsKeys.CRON]>(EventDetailsKeys.CRON)
							.then((cronString) => {
								if (cronString) {
									resolve(parseExpression(cronString).next().toDate());
								} else {
									this.ctx.storage
										.get([EventDetailsKeys.INTERVAL_VALUE, EventDetailsKeys.INTERVAL_FIELD, EventDetailsKeys.STARTS, EventDetailsKeys.ENDS])
										.then((test) => {
											if (test.size === 3 || test.size === 4) {
												try {
													resolve(D1Event.calculateNextInstance(test.get(EventDetailsKeys.INTERVAL_VALUE) as number, test.get(EventDetailsKeys.INTERVAL_FIELD) as NonNullable<EventDetail[EventDetailsKeys.INTERVAL_FIELD]>, test.get(EventDetailsKeys.STARTS) as Date, test.get(EventDetailsKeys.ENDS) as Date | undefined));
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

	override alarm() {
		// Update run time, but don't wait up on it
		this.ctx.waitUntil(this.ctx.storage.put<EventDetail[EventDetailsKeys.LAST_EXECUTED]>(EventDetailsKeys.LAST_EXECUTED, new Date()));

		return new Promise<void>((resolve, reject) =>
			this.ctx.storage
				.get<EventDetail[EventDetailsKeys.D1_BINDING]>(EventDetailsKeys.D1_BINDING)
				.then((binding) => {
					if (binding) {
						if (this.env[binding] instanceof D1Database) {
							const d1: D1Database = this.env[binding];

							this.ctx.storage
								.get<EventDetail[EventDetailsKeys.EVENT_DEFINITION]>(EventDetailsKeys.EVENT_DEFINITION)
								.then((definition) => {
									if (definition) {
										d1.batch(
											definition.reduce<Parameters<D1Database['batch']>[0]>((acc, { sql, binds }) => {
												acc.push(d1.prepare(sql).bind(binds));
												return acc;
											}, []),
										)
											.then(() => resolve())
											.catch(reject);
									} else {
										reject(definition);
									}
								})
								.catch(reject);
						} else {
							reject(this.env[binding].constructor.name);
						}
					} else {
						reject(binding);
					}
				})
				.catch(reject),
		).finally(() =>
			this.ctx.waitUntil(
				new Promise<void>((resolve, reject) =>
					this.nextAlarmRun
						.then((nextAlarmDate) => this.ctx.storage.setAlarm(nextAlarmDate.getTime()))
						.catch(() =>
							this.ctx.storage
								.get<EventDetail[EventDetailsKeys.AUTO_DELETE]>(EventDetailsKeys.AUTO_DELETE)
								.then((autoDelete) => {
									if (autoDelete) {
										this.deleteEvent().then(resolve).catch(reject);
									} else {
										resolve();
									}
								})
								.catch(reject),
						),
				),
			),
		);
	}
}
