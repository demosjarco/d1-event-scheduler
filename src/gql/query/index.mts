import { GraphQLError, GraphQLID, GraphQLNonNull, GraphQLObjectType, type GraphQLResolveInfo } from 'graphql';
import { GraphQLJSON, GraphQLNonEmptyString } from 'graphql-scalars';
import type { DefinedEvent, EventDetail } from '../../do/types.mjs';
import { BaseSchema } from '../../shared/baseSchema.mjs';
import type { GqlContext } from '../../types.mjs';

export class QueryIndex extends BaseSchema {
	protected override async createQueryType(): Promise<void> {
		this.queryType = new GraphQLObjectType({
			name: 'Query',
			fields: {
				getEvent: {
					type: GraphQLJSON,
					args: {
						id: { type: GraphQLID },
						name: { type: GraphQLNonEmptyString },
					},
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
							const id = args.id ?? context.D1_EVENT_SCHEDULER.idFromName(args.name!).toString();

							const response = await context.D1_EVENT_SCHEDULER.get(context.D1_EVENT_SCHEDULER.idFromString(id)).fetch(
								new Request(new URL(`/${id}`, 'https://d1.event'), {
									// @ts-expect-error
									cf: context.request.cf,
								}),
							);

							try {
								return await response.json<EventDetail>();
							} catch (error) {
								throw new GraphQLError((error as Error).message);
							}
						} else {
							const response = await context.D1_EVENT_SCHEDULER.get(context.D1_EVENT_SCHEDULER.idFromName('d1.event')).fetch(
								new Request(new URL('https://d1.event'), {
									// @ts-expect-error
									cf: context.request.cf,
								}),
							);

							try {
								const json = await response.json<DefinedEvent[]>();
								if (json.length > 0) {
									return json;
								} else {
									return null;
								}
							} catch (error) {
								throw new GraphQLError((error as Error).message);
							}
						}
					},
				},
			},
		});
	}
}
