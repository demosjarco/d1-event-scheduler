import { GraphQLBoolean, GraphQLEnumType, GraphQLError, GraphQLID, GraphQLInputObjectType, GraphQLList, GraphQLNonNull, GraphQLObjectType, type GraphQLResolveInfo } from 'graphql';
import { GraphQLDateTimeISO, GraphQLJSON, GraphQLJSONObject, GraphQLNonEmptyString, GraphQLPositiveInt, GraphQLTimeZone } from 'graphql-scalars';
import type { D1Event } from '../../do/D1Event.mjs';
import { EventDetailsKeys, type EventDetailGQL } from '../../do/types.mjs';
import { BaseSchema } from '../../shared/baseSchema.mjs';
import type { GqlContext } from '../../types.mjs';

export class MutationIndex extends BaseSchema {
	protected override async createMutationType(): Promise<void> {
		this.mutationType = new GraphQLObjectType({
			name: 'Mutation',
			fields: {
				createOrReplaceEvent: {
					description: 'This will create or replace an existing event with the name',
					args: {
						[EventDetailsKeys.D1_BINDING]: {
							type: new GraphQLNonNull(GraphQLID),
							description: 'The name of the D1 binding to use',
						},
						[EventDetailsKeys.EVENT_NAME]: {
							type: new GraphQLNonNull(GraphQLNonEmptyString),
							description: 'Name of the scheduled event',
						},
						[EventDetailsKeys.TIME_ZONE]: {
							type: new GraphQLNonNull(GraphQLTimeZone),
							defaultValue: 'Etc/GMT',
						},
						[EventDetailsKeys.EVENT_DEFINITION]: {
							type: new GraphQLNonNull(
								new GraphQLList(
									new GraphQLNonNull(
										new GraphQLInputObjectType({
											name: 'MutationCreateOrReplaceEventSqls',
											fields: {
												sql: {
													type: new GraphQLNonNull(GraphQLNonEmptyString),
													description: 'The SQL itself',
												},
												binds: {
													type: new GraphQLList(new GraphQLNonNull(GraphQLJSON)),
													description: 'Any binding values to the sql supplied',
												},
											},
										}),
									),
								),
							),
						},
						[EventDetailsKeys.EVENT_TYPE]: {
							type: new GraphQLNonNull(
								new GraphQLEnumType({
									name: 'MutationCreateOrReplaceEventType',
									values: {
										oneTime: {
											value: 'ONE TIME',
										},
										recurring: {
											value: 'RECURRING',
										},
									},
								}),
							),
						},
						[EventDetailsKeys.EXECUTE_AT]: {
							type: GraphQLDateTimeISO,
							description: 'For `ONE TIME` events, this is when it will fire. Ignored for RECURRING',
						},
						[EventDetailsKeys.INTERVAL_VALUE]: {
							type: GraphQLPositiveInt,
							description: 'Used in pair with intervalField. Interval or CRON must be used with RECURRING',
						},
						[EventDetailsKeys.INTERVAL_FIELD]: {
							type: new GraphQLEnumType({
								name: 'MutationCreateOrReplaceEventIntervalField',
								values: {
									milliseconds: {
										value: 'MILLISECONDS',
									},
									seconds: {
										value: 'SECONDS',
									},
									minutes: {
										value: 'MINUTES',
									},
									hours: {
										value: 'HOURS',
									},
									days: {
										value: 'DAYS',
									},
									weeks: {
										value: 'WEEKS',
									},
									months: {
										value: 'MONTHS',
									},
									querters: {
										value: 'QUARTERS',
									},
									years: {
										value: 'YEARS',
									},
								},
							}),
							description: 'Used in pair with intervalField. Interval or CRON must be used with RECURRING',
						},
						[EventDetailsKeys.CRON]: {
							type: GraphQLNonEmptyString,
							description: 'Interval or CRON must be used with RECURRING',
						},
						[EventDetailsKeys.STARTS]: {
							type: GraphQLDateTimeISO,
							description: 'When the event should begin repeating. Ignored for ONE TIME. Defaults to now',
						},
						[EventDetailsKeys.ENDS]: {
							type: GraphQLDateTimeISO,
							description: 'Optionally, when the event should stop repeating. If omitted, that means the event continues executing indefinitely. See auto delete for related options',
						},
						[EventDetailsKeys.ENABLED]: {
							type: new GraphQLNonNull(GraphQLBoolean),
							description: 'Whether the event will execute or not',
							defaultValue: true,
						},
						[EventDetailsKeys.AUTO_DELETE]: {
							type: new GraphQLNonNull(GraphQLBoolean),
							description: 'Whether the event will auto delete upon excuting (for ONE TIME events) or reaches `ENDS` (if specified)',
							defaultValue: true,
						},
						[EventDetailsKeys.EVENT_COMMENT]: {
							type: GraphQLNonEmptyString,
							description: 'Provide a description of the event',
						},
					},
					type: GraphQLJSON,
					resolve: (obj: {}, args: EventDetailGQL, context: GqlContext, info: GraphQLResolveInfo) => {
						if (args[EventDetailsKeys.EVENT_DEFINITION].length > 0) {
							return context.D1_EVENT.get(context.D1_EVENT.idFromName(args[EventDetailsKeys.EVENT_NAME])).setEvent(args) as ReturnType<D1Event['setEvent']>;
						} else {
							throw new GraphQLError('No `sqls` provided');
						}
					},
				},
				deleteEvent: {
					args: {
						id: { type: GraphQLID },
						name: { type: GraphQLNonEmptyString },
					},
					type: new GraphQLNonNull(GraphQLJSONObject),
					resolve: async (
						obj: {},
						args: {
							id?: string;
							name?: string;
						},
						context: GqlContext,
						info: GraphQLResolveInfo,
					) => {
						if (args.id || args.name) {
							const id = args.id ?? context.D1_EVENT.idFromName(args.name!).toString();

							return context.D1_EVENT.get(context.D1_EVENT.idFromString(id)).deleteEvent() as ReturnType<D1Event['deleteEvent']>;
						} else {
							throw new GraphQLError('You must provide either id or name');
						}
					},
				},
			},
		});
	}
}
