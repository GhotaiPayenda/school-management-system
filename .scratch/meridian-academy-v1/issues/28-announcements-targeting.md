# 28: Announcements and targeting

**What to build:** An Admin publishes plain-text Announcements to a Role, Grade Level, or Section, archives them, and users see only the Announcements targeted at them, in their active language, with read state.

**Blocked by:** 01 (Walking skeleton: login, roles, and empty dashboard), 05 (Grade Levels, Sections, and Rooms)

**Status:** done

- [x] An Admin can create an Announcement with title, body, target type, target value, and publish or archive state.
- [x] An Announcement can target all users, a Role, a Grade Level, or a Section.
- [x] Targeted users see the Announcement; users outside the target do not.
- [x] Read state is tracked per User, and unread Announcements are distinguishable from read ones.
- [x] The body is stored and rendered as plain text with line breaks, never as HTML.
- [x] The Announcement UI is translated, while the title and body remain exactly as entered.
- [x] API and browser tests cover targeting, visibility isolation, read state, archive behavior, and permission denial.

## Comments

- `AnnouncementController` targets all, role, grade, or section; visibility and read state are per user, with unread counts and archive state.
- Bodies are stored and rendered as plain text with line breaks, never HTML; UI labels are translated while content remains as entered.
- `AnnouncementsPage` and the dashboard announcement cards consume the API; targeting isolation is enforced server-side.
