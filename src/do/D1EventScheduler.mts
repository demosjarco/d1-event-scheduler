import { DurableObject } from 'cloudflare:workers';
import type { EnvVars } from '../types.mjs';
import type { D1Event } from './D1Event.mjs';
import { type DefinedEvent } from './types.mjs';

export class D1EventScheduler extends DurableObject<EnvVars> {
	public get events() {
		return this.ctx.storage.get<DefinedEvent[]>('events', { allowConcurrency: true }).then((events) => (events ? Promise.all(events.map((event) => this.env.D1_EVENT.get(this.env.D1_EVENT.idFromString(event.id)).event as D1Event['event'])) : []));
	}

	public async setEvent(incoming: DefinedEvent) {
		const existing = (await this.ctx.storage.get<DefinedEvent[]>('events', { allowConcurrency: true })) ?? [];

		const index = existing.findIndex((event) => event.id === incoming.id);
		if (index !== -1) existing.splice(index, 1);
		existing.push(incoming);

		this.ctx.waitUntil(this.ctx.storage.put<DefinedEvent[]>('events', Array.from(existing)));
		return [incoming];
	}

	public async deleteEvent(incoming: DefinedEvent) {
		const existing = (await this.ctx.storage.get<DefinedEvent[]>('events', { allowConcurrency: true })) ?? [];

		const index = existing.findIndex((event) => event.id === incoming.id);
		if (index > -1) {
			existing.splice(index, 1);

			this.ctx.waitUntil(this.ctx.storage.put<DefinedEvent[]>('events', Array.from(existing)));
			return [] as DefinedEvent[];
		} else {
			throw new Error(`${incoming.name} (${incoming.id}) not found`);
		}
	}
}
