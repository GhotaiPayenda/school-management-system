# 28: Announcements and targeting

**What to build:** An Admin publishes plain-text Announcements to a Role, Grade Level, or Section, archives them, and users see only the Announcements targeted at them, in their active language, with read state.

**Blocked by:** 01 (Walking skeleton: login, roles, and empty dashboard), 05 (Grade Levels, Sections, and Rooms)

**Status:** ready-for-agent

- [ ] An Admin can create an Announcement with title, body, target type, target value, and publish or archive state.
- [ ] An Announcement can target all users, a Role, a Grade Level, or a Section.
- [ ] Targeted users see the Announcement; users outside the target do not.
- [ ] Read state is tracked per User, and unread Announcements are distinguishable from read ones.
- [ ] The body is stored and rendered as plain text with line breaks, never as HTML.
- [ ] The Announcement UI is translated, while the title and body remain exactly as entered.
- [ ] API and browser tests cover targeting, visibility isolation, read state, archive behavior, and permission denial.