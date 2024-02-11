import { Hono } from 'hono';
import { csrf } from 'hono/csrf';
import { etag } from 'hono/etag';
import { timing } from 'hono/timing';
import type { EnvVars } from './types.mjs';

const app = new Hono<{ Bindings: EnvVars }>();

app.use('*', csrf());

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

app.get('/', (c) => c.text('Hello Cloudflare Workers!'));

export default app;
