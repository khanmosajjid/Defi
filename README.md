# Shadcn-UI Template Usage Instructions

## technology stack

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

All shadcn/ui components have been downloaded under `@/components/ui`.

## File Structure

- `index.html` - HTML entry point
- `vite.config.ts` - Vite configuration file
- `tailwind.config.js` - Tailwind CSS configuration file
- `package.json` - NPM dependencies and scripts
- `src/app.tsx` - Root component of the project
- `src/main.tsx` - Project entry point
- `src/index.css` - Existing CSS configuration
- `src/pages/Index.tsx` - Home page logic

## Components

- All shadcn/ui components are pre-downloaded and available at `@/components/ui`

## Styling

- Add global styles to `src/index.css` or create new CSS files as needed
- Use Tailwind classes for styling components

## Development

- Import components from `@/components/ui` in your React components
- Customize the UI by modifying the Tailwind configuration

### BSC RPC configuration

The staking dashboard relies on public Binance Smart Chain RPC endpoints. Some public nodes, like `bsc.publicnode.com`, block browser requests with CORS, which prevents on-chain reads in development. To avoid this:

- Prefer supplying a Thirdweb API key by setting `VITE_THIRDWEB_API_KEY` in `.env`.
- Or point directly to a CORS-friendly RPC by setting `VITE_BSC_RPC_URL` (and `VITE_BSC_RPC_FALLBACK_URLS` for a comma-separated list). The defaults include Ankr and Binance-hosted RPCs that accept browser traffic, but providing your own endpoint ensures stability.
- For testnet usage, you can override with `VITE_BSC_TESTNET_RPC_URL` and `VITE_BSC_TESTNET_RPC_FALLBACK_URLS`.

After updating environment variables, restart the dev server so wagmi picks up the new transports.

## Note

- The `@/` path alias points to the `src/` directory
- In your typescript code, don't re-export types that you're already importing

# Commands

**Install Dependencies**

```shell
pnpm i
```

**Add Dependencies**

```shell
pnpm add some_new_dependency

**Start Preview**

```shell
pnpm run dev
```

**To build**

```shell
pnpm run build
```
