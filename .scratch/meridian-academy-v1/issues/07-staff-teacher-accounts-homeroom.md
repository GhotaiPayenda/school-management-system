# 07: Staff records, teacher accounts, and Homeroom assignment

**What to build:** A Registrar maintains Staff records with employee numbers, qualifications, specialization, photos, documents, and status; marks Teachers; links Users; and assigns one Homeroom Teacher per Section. A newly linked Teacher can sign in with the Teacher Role.

**Blocked by:** 02 (Design system and trilingual RTL shell), 05 (Grade Levels, Sections, and Rooms)

**Status:** done

- [x] A Registrar can create, edit, search, and archive Staff with a unique employee number, qualification, specialization, hire date, contact details, photo, and optional documents.
- [x] A Registrar can mark a Staff member as a Teacher and link an existing User or create a new Teacher account with a temporary password.
- [x] The linked Teacher can sign in and sees only the Teacher Role's navigation.
- [x] A Registrar can assign one Homeroom Teacher per Section and reassign it; the change is visible on the Section and Staff profile.
- [x] Duplicate employee numbers are rejected, and a Staff member without the Teacher flag cannot be assigned teaching duties.
- [x] API and browser tests cover CRUD, duplicate rejection, account linking, Teacher login, Homeroom assignment, and permission denial.

## Comments

- `PeopleController` implements Staff CRUD, employee-number uniqueness, teacher flags, account linking, temporary passwords, and homeroom assignment/reassignment.
- `StaffPage` covers records, profiles, account creation, and homeroom assignment; Teacher accounts receive only Teacher navigation.
- The Teacher RBAC browser journey and API role-isolation test confirm the Teacher surface.
