# 26: Library loans, returns, and renewals

**What to build:** A Librarian issues and returns Copies, enforces Role-based loan limits and due dates, allows one renewal when a Copy is not reserved, prevents two open Loans for the same Copy, and shows a borrower's loan history.

**Blocked by:** 07 (Staff records, teacher accounts, and Homeroom assignment), 10 (Students, Guardians, and documents), 25 (Library catalog and Copies)

**Status:** done

- [x] A Librarian can issue an available Copy to a Student or Staff member, and the due date is calculated from the borrower Role's policy.
- [x] Students are limited to 2 open Loans and Staff to 5, and exceeding the limit is rejected with a clear error.
- [x] Returning a Copy records the return date and makes the Copy available again.
- [x] Renewal extends the due date once when the Copy is not reserved, and a second renewal is rejected.
- [x] A Copy cannot have two simultaneous open Loans.
- [x] A borrower's history lists current and returned Loans with Title, Copy accession number, issue date, due date, and return date.
- [x] API and browser tests cover issue, return, limits, due dates, renewal, duplicate open Loans, history, and permission denial.

## Comments

- Loans support student/staff borrowers, role-based due dates, 2/5 open-loan limits, return, single renewal, and duplicate-open-loan prevention.
- Borrower history lists current and returned loans with title, accession, issue/due/return dates.
- `LibraryPage` exposes issue, return, renew, and history flows.
