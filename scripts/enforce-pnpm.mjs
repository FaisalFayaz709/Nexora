const ua = process.env.npm_config_user_agent ?? '';
if (!ua.startsWith('pnpm/')) {
  console.error('NEXORA uses one root pnpm workspace. Run installs with pnpm, not npm/yarn.');
  process.exit(1);
}
