# Claim Zero Secure

Claim Zero - https://claimzero.ai

This project was built with [Lovable](https://lovable.dev).

**Live app (production, custom domain)**: https://claimzero-command-center.claimzero.ai

**Live app (Lovable subdomain)**: https://claimzero-command-center.lovable.app

Both are the same deployment. The previously listed `claimzero-risk-intelligience.lovable.app`
never existed — it was misspelled and pointed at no project.

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b4c70d34-8b40-487d-943f-948732885fe4).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>

# REQUIRED before installing outside Lovable.
# bun.lock pins eleven tarballs to Lovable’s private npm proxy
# (europe-west4-npm.pkg.dev/lovable-core-prod/…), which returns 403 to
# everyone else, so a plain install fails. The packages are public on npmjs.
# Repoint them locally — and NEVER commit the modified bun.lock, because
# Lovable’s own sandbox needs the original URLs.
sed -i 's#https://europe-west4-npm.pkg.dev/lovable-core-prod/sandbox-npm-cache/#https://registry.npmjs.org/#g' bun.lock

bun install
bun run dev
```
