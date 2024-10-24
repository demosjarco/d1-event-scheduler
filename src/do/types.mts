export interface DefinedEvent {
	id: ReturnType<ReturnType<DurableObjectNamespace['idFromName']>['toString']>;
	name: ReturnType<DurableObjectNamespace['idFromName']>['name'];
}

export enum EventDetailsKeys {
	EVENT_ID = 'EVENT_ID',
	D1_BINDING = 'EVENT_SCHEMA',
	EVENT_NAME = 'EVENT_NAME',
	TIME_ZONE = 'TIME_ZONE',
	EVENT_DEFINITION = 'EVENT_DEFINITION',
	EVENT_TYPE = 'EVENT_TYPE',
	EXECUTE_AT = 'EXECUTE_AT',
	INTERVAL_VALUE = 'INTERVAL_VALUE',
	INTERVAL_FIELD = 'INTERVAL_FIELD',
	CRON = 'CRON',
	STARTS = 'STARTS',
	ENDS = 'ENDS',
	ENABLED = 'STATUS',
	AUTO_DELETE = 'ON_COMPLETION',
	CREATED = 'CREATED',
	LAST_ALTERED = 'LAST_ALTERED',
	LAST_EXECUTED = 'LAST_EXECUTED',
	EVENT_COMMENT = 'EVENT_COMMENT',
}

export type GuaranteedEventDetail = NonNullable<Pick<EventDetail, EventDetailsKeys.EVENT_ID>> & Partial<Omit<EventDetail, EventDetailsKeys.EVENT_ID>>;

export interface EventDetail {
	[EventDetailsKeys.EVENT_ID]?: string;
	[EventDetailsKeys.D1_BINDING]: string;
	[EventDetailsKeys.EVENT_NAME]: string;
	[EventDetailsKeys.TIME_ZONE]: NonNullable<NonNullable<Parameters<Date['toLocaleString']>[1]>['timeZone']>;
	[EventDetailsKeys.EVENT_DEFINITION]: {
		sql: Parameters<D1Database['prepare']>[0];
		binds: Parameters<ReturnType<D1Database['prepare']>['bind']>;
	}[];
	[EventDetailsKeys.EVENT_TYPE]: 'ONE TIME' | 'RECURRING';
	[EventDetailsKeys.EXECUTE_AT]?: Date;
	/**
	 * @todo Add mixed expresion formats
	 * @link https://dev.mysql.com/doc/refman/8.0/en/expressions.html#temporal-intervals
	 */
	[EventDetailsKeys.INTERVAL_VALUE]?: number;
	[EventDetailsKeys.INTERVAL_FIELD]?: 'MILLISECONDS' | 'SECONDS' | 'MINUTES' | 'HOURS' | 'DAYS' | 'WEEKS' | 'MONTHS' | 'QUARTERS' | 'YEARS';
	[EventDetailsKeys.CRON]?: `${string} ${string} ${string} ${string} ${string}`;
	[EventDetailsKeys.STARTS]: Date;
	[EventDetailsKeys.ENDS]?: Date;
	[EventDetailsKeys.ENABLED]: boolean;
	[EventDetailsKeys.AUTO_DELETE]: boolean;
	[EventDetailsKeys.CREATED]: Date;
	[EventDetailsKeys.LAST_ALTERED]: Date;
	[EventDetailsKeys.LAST_EXECUTED]?: Date;
	[EventDetailsKeys.EVENT_COMMENT]?: string;
}

export type ValueOf<T> = T[keyof T];

export interface EventDetailGQL extends Pick<EventDetail, EventDetailsKeys.D1_BINDING | EventDetailsKeys.EVENT_NAME | EventDetailsKeys.TIME_ZONE | EventDetailsKeys.EVENT_DEFINITION | EventDetailsKeys.EVENT_TYPE | EventDetailsKeys.EXECUTE_AT | EventDetailsKeys.INTERVAL_VALUE | EventDetailsKeys.INTERVAL_FIELD | EventDetailsKeys.CRON | EventDetailsKeys.ENDS | EventDetailsKeys.ENABLED | EventDetailsKeys.AUTO_DELETE | EventDetailsKeys.EVENT_COMMENT>, Partial<Pick<EventDetail, EventDetailsKeys.STARTS>> {}
