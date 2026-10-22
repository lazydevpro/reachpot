export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { startKeeperLoop } = await import('./lib/server/keeper-loop');
  startKeeperLoop();
}
