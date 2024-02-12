import { GraphQLError, GraphQLNonNull, GraphQLObjectType, type GraphQLResolveInfo } from 'graphql';
import { GraphQLJSON, GraphQLNonEmptyString } from 'graphql-scalars';
import type { DefinedEvent } from '../../do/types.mjs';
import { BaseSchema } from '../../shared/baseSchema.mjs';
import type { GqlContext } from '../../types.mjs';

export class QueryIndex extends BaseSchema {
	protected override async createQueryType(): Promise<void> {
		this.queryType = new GraphQLObjectType({
			name: 'Query',
			fields: {
				getEvents: {
					type: GraphQLJSON,
					resolve: async (obj: {}, args: {}, context: GqlContext, info: GraphQLResolveInfo) => {
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
					},
				},
				hello: {
					type: new GraphQLNonNull(GraphQLNonEmptyString),
					resolve: () => 'Hello World!',
				},
			},
		});
	}
}
