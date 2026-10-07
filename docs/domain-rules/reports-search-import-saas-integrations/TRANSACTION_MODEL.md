# Transaction Model

- Report export request: creates ReportExecution, audit and report.export.requested event in one transaction; document generation is async after commit.
- Import upload: creates ImportBatch and upload audit in one transaction.
- Import validate: locks ImportBatch, replaces row validation evidence and writes validation audit in one transaction.
- Import commit: locks validated ImportBatch, marks rows committed and writes audit/event in one transaction.
- Import rollback: locks committed ImportBatch, marks rows rolled back and writes rollback audit in one transaction.
- SaaS subscription: creates subscription, plan features and audit in one transaction.
- SaaS invoice post: posts invoice state and audit in one transaction.

Queues are allowed only for report generation, notifications and external webhooks, not for domain-critical financial/inventory effects.
