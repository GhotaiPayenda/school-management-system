# 25: Library catalog and Copies

**What to build:** A Librarian catalogs Titles with bibliographic details, adds multiple physical Copies with unique accession numbers, searches the catalog, and archives records without destroying loan history.

**Blocked by:** 02 (Design system and trilingual RTL shell)

**Status:** done

- [x] A Librarian can create, edit, search, and archive a Title with title, author, ISBN, category, publisher, and description.
- [x] A Title can have multiple Copies, each with a unique accession number, an optional barcode value, and an available status.
- [x] Duplicate accession numbers and duplicate ISBN and copy combinations are rejected.
- [x] Catalog search works by title, author, ISBN, and category, with pagination.
- [x] Archived Titles and Copies are hidden from active circulation but remain visible in history.
- [x] API and browser tests cover CRUD, duplicate accession numbers, search, archive behavior, and permission denial.

## Comments

- `LibraryController` implements Title and Copy CRUD, unique accession numbers, ISBN/copy duplicate checks, category/author/title/ISBN search, pagination, and archive behavior.
- `LibraryPage` provides the catalog, copies, and history views.
- Library permissions and role isolation are enforced server-side.
