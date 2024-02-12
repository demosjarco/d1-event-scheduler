# d1-event-scheduler

MySQL like Event Scheduler, but for Cloudflare D1

For status on the project see [Projects](/projects) tab at the top of the repo.

## Features

-   Every scheduled event is stored as a DO object and is triggered using DO's [Alarms API](https://developers.cloudflare.com/durable-objects/api/alarms/)
-   Supports 1 time and recurring events with optional end date and self delete on completion
-   Supports SQL's interval syntax or cron syntax
-   Auto batch transactions all SQL statements in a single event
-   Each SQL statement can provide variable storage and binds/escapes at runtime
    -   Coming soon: Optionally support online fetching of variable
-   Each event interacts with D1 over bindings
    -   Coming soon: Support HTTP Rest D1 interaction
-   A main DO object for keeping track of all events
-   All management of events is done via GraphQL (with GraphiQL enabled)/REST API (Swagger documented)

## Prerequisites

-   [ ] One or more D1 instances to manage
-   [ ] Workers Paid plan

> [!NOTE]
> Durable Objects are only available on the Workers Paid plan.
> https://developers.cloudflare.com/workers/platform/pricing/#durable-objects

## Getting Started

1.  Clone
2.  Setup D1 binding(s) in [`wrangler.toml`](wrangler.toml#L12)
3.  Uncomment route and set custom domain accordingly > [!WARNING]

> [!CAUTION]
> This has no inherent auth so do not use [`workers_dev`](wrangler.toml#L5) without middleware auth or [`custom_domain`](wrangler.toml#L6) without being behind a auth proxy or middleware auth.

> [!TIP]
> You can use Cloudflare Zero Trust by setting a [`custom_domain`](wrangler.toml#L6) and creating a [Self-hosted application](https://developers.cloudflare.com/cloudflare-one/applications/configure-apps/self-hosted-apps/) on that domain.
> This can be done completely on the ZT Free plan

> [!TIP]
> An alternative is to embed your own custom authentication as a middleware (this project uses [`hono`](https://hono.dev/))
> See [`@todo` comment in `index.ts`](src/index.ts#L34)

4.  Deploy via Wrangler
5.  Use GraphQL or REST apis to create, view, edit, or delete events

| Service        | Route                |
| -------------- | -------------------- |
| GraphQL        | `/graphql`           |
| REST           | `/`                  |
| Swagger Docs   | `/docs`              |
| OpenAPI Schema | `/docs/openapi.json` |

## Internal nerd stuff

-   REST is auto generated with [`sofa-api`](https://the-guild.dev/graphql/sofa-api) from GraphQL schemas
    -   REST API is still subject to the same GraphQL schema and validation
-   GraphQL is setup to support [`@defer`](https://graphql.org/blog/2020-12-08-improving-latency-with-defer-and-stream-directives/) (useful if you have a long list of DO events)
-   GraphQL and REST are both behind `hono`.
-   Each DO fetch handler is behind `hono`
-   Internal DO fetch handler runs on `https://d1.event/:id?` url scheme
    -   Main DO object responds on `/` while every event DO responds on `/:id`
-   The API has [`csrf`](https://hono.dev/middleware/builtin/csrf), [`cors`](https://hono.dev/middleware/builtin/cors), [`secureHeaders`](https://hono.dev/middleware/builtin/secure-headers), [`etag`](https://hono.dev/middleware/builtin/etag), and [`timing`](https://hono.dev/middleware/builtin/timing) enabled
    -   Comming soon: The duration of all internal tasks will be reported via timing header (visible in Network tools of browser)
