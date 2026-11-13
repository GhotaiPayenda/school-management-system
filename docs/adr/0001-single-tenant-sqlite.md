# One SQLite database per school

The system serves one K-12 school of up to roughly 3,000 students and is self-hosted, so it uses a single SQLite database in WAL mode rather than a multi-tenant PostgreSQL deployment. Domain tables carry no `school_id`; school identity and policy live in one School Settings record.

**Considered options**: PostgreSQL or MySQL with tenant isolation — rejected because the scale is small, the deployment target is a school server or shared host, and the operational cost of a database server is not justified.

**Consequences**: backups are file copies, writes serialize (acceptable at this scale), and hosting a second school means a second installation rather than a new tenant.
