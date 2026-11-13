# 25: Library catalog and Copies

**What to build:** A Librarian catalogs Titles with bibliographic details, adds multiple physical Copies with unique accession numbers, searches the catalog, and archives records without destroying loan history.

**Blocked by:** 02 (Design system and trilingual RTL shell)

**Status:** ready-for-agent

- [ ] A Librarian can create, edit, search, and archive a Title with title, author, ISBN, category, publisher, and description.
- [ ] A Title can have multiple Copies, each with a unique accession number, an optional barcode value, and an available status.
- [ ] Duplicate accession numbers and duplicate ISBN and copy combinations are rejected.
- [ ] Catalog search works by title, author, ISBN, and category, with pagination.
- [ ] Archived Titles and Copies are hidden from active circulation but remain visible in history.
- [ ] API and browser tests cover CRUD, duplicate accession numbers, search, archive behavior, and permission denial.