import { GraphQLID, GraphQLObjectType, type GraphQLResolveInfo } from 'graphql';
import { GraphQLJSON, GraphQLNonEmptyString } from 'graphql-scalars';
import type { D1Event } from '../../do/D1Event.mjs';
import type { D1EventScheduler } from '../../do/D1EventScheduler.mjs';
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
					resolve: (
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

							return context.D1_EVENT.get(context.D1_EVENT.idFromString(id)).event as D1Event['event'];
						} else {
							return context.D1_EVENT_SCHEDULER.get(context.D1_EVENT_SCHEDULER.idFromName('d1.event')).events as D1EventScheduler['events'];
						}
					},
				},
			},
		});
	}
}
