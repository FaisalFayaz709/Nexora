const masterDataSections = [
  { title: 'Employees', href: '/employees', createHref: '/employees/create', note: 'Branch, department, job, manager and HR profile records.' },
  { title: 'Customers', href: '/customers', createHref: '/customers/create', note: 'Customer master, contacts, sites, billing and lifecycle links.' },
  { title: 'Customer Sites', href: '/customer-sites', createHref: '/customer-sites/create', note: 'Physical locations used by projects, assets, tickets and work orders.' },
  { title: 'Vendors', href: '/vendors', createHref: '/vendors/create', note: 'Supplier master, contacts, onboarding and procurement governance.' },
  { title: 'Products', href: '/products', createHref: '/products/create', note: 'SKU, category, tracking type, cost, price and reorder metadata.' },
  { title: 'Warehouses', href: '/warehouses', createHref: '/warehouses/create', note: 'Branch-scoped stock locations and warehouse structure.' },
  { title: 'Data Import Wizard', href: '/imports', createHref: '/imports', note: 'Excel/CSV onboarding flow with upload, validation, commit, rollback and audit traceability.' },
];

export function MasterDataDashboard() {
  return (
    <main className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Pass R10</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">Business Master Data</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          This area groups the master records that downstream NEXORA workflows depend on:
          employees, customers, sites, vendors, products and warehouses. Each master now has
          list, create, detail and edit route surfaces, while import onboarding is handled by a
          command-driven wizard.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {masterDataSections.map((section) => (
          <article key={section.href} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow">
            <h2 className="text-lg font-semibold text-slate-950">{section.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{section.note}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-sm font-medium">
              <a className="rounded-md border border-slate-200 px-3 py-2 text-slate-700 hover:bg-slate-50" href={section.href}>Open list</a>
              <a className="rounded-md border border-slate-200 px-3 py-2 text-slate-700 hover:bg-slate-50" href={section.createHref}>Create/import</a>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
