export default function LandedCostsPage() {
  return (
    <>
      <main className="space-y-4">
        <h1 className="text-2xl font-semibold">Landed Costs</h1>
        <p className="text-sm text-slate-600">
          Landed cost operations are command-driven by the locked API: create, allocate and post.
          Posting reconciles allocations and updates inventory/project costing through transactional services.
        </p>
      </main>
    </>
  );
}
