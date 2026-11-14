# parcel-resolver-hono-jsx-hydrate

Parcel resolver for [`hono-jsx-hydrate`](https://github.com/aur0/hono-jsx-hydrate). Install both packages:

```sh
npm install hono-jsx-hydrate parcel-resolver-hono-jsx-hydrate
```

Add the resolver before Parcel's default resolver in `.parcelrc`:

```json
{
  "extends": "@parcel/config-default",
  "resolvers": ["parcel-resolver-hono-jsx-hydrate", "..."]
}
```
