export class HealthService {
  live() { return { status: 'ok' as const }; }
  ready() { return { status: 'ready' as const, scope: 'bootstrap' as const }; }
}
