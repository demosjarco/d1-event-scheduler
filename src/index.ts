import { useDeferStream } from '@graphql-yoga/plugin-defer-stream';
import { createYoga } from 'graphql-yoga';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { csrf } from 'hono/csrf';
import { etag } from 'hono/etag';
import { secureHeaders } from 'hono/secure-headers';
import { timing } from 'hono/timing';
import { useSofa } from 'sofa-api';
import { runningLocally } from './extras.mjs';
import { ApiSchema } from './gql/index.mjs';
import type { EnvVars } from './types.mjs';

// Re-export since workerd can only find from from `wrangler.toml`'s `main` file
export { D1EventScheduler } from './do/D1EventScheduler.mjs';

const app = new Hono<{ Bindings: EnvVars }>();
const validApiMethods = ['POST', 'GET'];

app.use('*', csrf());
app.use('*', (c, next) => {
	return cors({
		origin: '*',
		allowMethods: [...new Set([...validApiMethods, 'OPTIONS'])],
		maxAge: 300,
	})(c, next);
});
app.use('*', secureHeaders());

app.use('*', etag());
app.use('*', timing());
app.use('*', async (c, next) => {
	/**
	 * Dev debug injection point
	 */
	if (c.env.NODE_ENV === 'development') {
	}

	return next();
});

/**
 * @todo Insert auth middleware or put this behind something like Cloudflare ZT Access
 */

app.on(validApiMethods, '/graphql/*', async (c) =>
	createYoga<EnvVars & ExecutionContext>({
		// `NODE_ENV` is under `c.env`
		maskedErrors: c.env.NODE_ENV !== 'production',
		graphqlEndpoint: '/graphql',
		landingPage: false,
		graphiql: {
			title: 'D1 Event Scheduler',
		},
		schema: await new ApiSchema({ c }).schema(),
		plugins: [useDeferStream()],
	}).fetch(c.req.raw, c.env, c.executionCtx),
);
app.on(validApiMethods, '/*', async (c) =>
	useSofa({
		basePath: '/',
		schema: await new ApiSchema({ c }).schema(),
		openAPI: {
			info: {
				title: 'D1 Event Scheduler',
				version: (runningLocally(c.req.raw as unknown as Request) ? 'Local' : c.env.GIT_HASH ?? 'Live').toLocaleUpperCase(),
			},
			// Needs `/` to carry over route from hono
			servers: [{ url: '/' }],
		},
		swaggerUI: { endpoint: '/docs' },
	}).fetch(c.req.raw, c.env, c.executionCtx),
);

export default app;
