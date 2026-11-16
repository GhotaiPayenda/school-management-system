-- Meridian Academy v1 domain schema.

CREATE TABLE school_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    name TEXT NOT NULL,
    logo_path TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    currency TEXT NOT NULL DEFAULT 'AFN',
    timezone TEXT NOT NULL DEFAULT 'Asia/Kabul',
    default_language TEXT NOT NULL DEFAULT 'en' CHECK (default_language IN ('en', 'fa-AF', 'ps-AF')),
    default_theme TEXT NOT NULL DEFAULT 'light' CHECK (default_theme IN ('light', 'dark')),
    teaching_days TEXT NOT NULL DEFAULT '[6,0,1,2,3,4]',
    date_calendar TEXT NOT NULL DEFAULT 'gregorian' CHECK (date_calendar IN ('gregorian', 'solar_hijri')),
    principal_name TEXT,
    principal_title TEXT DEFAULT 'Principal',
    invoice_due_day INTEGER NOT NULL DEFAULT 5 CHECK (invoice_due_day BETWEEN 1 AND 28),
    fine_daily_rate REAL NOT NULL DEFAULT 5,
    lost_processing_fee REAL NOT NULL DEFAULT 100,
    student_loan_limit INTEGER NOT NULL DEFAULT 2,
    student_loan_days INTEGER NOT NULL DEFAULT 14,
    staff_loan_limit INTEGER NOT NULL DEFAULT 5,
    staff_loan_days INTEGER NOT NULL DEFAULT 30,
    per_period_attendance INTEGER NOT NULL DEFAULT 0 CHECK (per_period_attendance IN (0, 1)),
    updated_at TEXT NOT NULL
);

CREATE TABLE academic_years (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    label TEXT NOT NULL UNIQUE,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    is_current INTEGER NOT NULL DEFAULT 0 CHECK (is_current IN (0, 1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX academic_years_current_unique ON academic_years (is_current) WHERE is_current = 1;

CREATE TABLE semesters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    academic_year_id INTEGER NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    number INTEGER NOT NULL CHECK (number IN (1, 2)),
    name TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE (academic_year_id, number)
);

CREATE TABLE grade_levels (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    number INTEGER NOT NULL UNIQUE CHECK (number BETWEEN 1 AND 12),
    name TEXT NOT NULL,
    name_fa TEXT,
    name_ps TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE staff (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_number TEXT NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    name_fa TEXT,
    name_ps TEXT,
    gender TEXT CHECK (gender IN ('male', 'female', 'other')),
    date_of_birth TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    qualification TEXT,
    specialization TEXT,
    hire_date TEXT,
    photo_path TEXT,
    is_teacher INTEGER NOT NULL DEFAULT 0 CHECK (is_teacher IN (0, 1)),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX staff_name_index ON staff (last_name, first_name);
CREATE INDEX staff_teacher_index ON staff (is_teacher, status);

CREATE TABLE sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    academic_year_id INTEGER NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    grade_level_id INTEGER NOT NULL REFERENCES grade_levels(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 30 CHECK (capacity > 0),
    homeroom_teacher_id INTEGER REFERENCES staff(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (academic_year_id, grade_level_id, name)
);

CREATE INDEX sections_year_index ON sections (academic_year_id);

CREATE TABLE rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    capacity INTEGER NOT NULL DEFAULT 30 CHECK (capacity > 0),
    building TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    created_at TEXT NOT NULL
);

CREATE TABLE departments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    name_fa TEXT,
    name_ps TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    created_at TEXT NOT NULL
);

CREATE TABLE subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    name_fa TEXT,
    name_ps TEXT,
    department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    has_exam INTEGER NOT NULL DEFAULT 1 CHECK (has_exam IN (0, 1)),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    created_at TEXT NOT NULL
);

CREATE TABLE curriculum (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    academic_year_id INTEGER NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    grade_level_id INTEGER NOT NULL REFERENCES grade_levels(id) ON DELETE CASCADE,
    subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    weekly_periods INTEGER NOT NULL DEFAULT 4 CHECK (weekly_periods >= 0),
    is_elective INTEGER NOT NULL DEFAULT 0 CHECK (is_elective IN (0, 1)),
    created_at TEXT NOT NULL,
    UNIQUE (academic_year_id, grade_level_id, subject_id)
);

CREATE INDEX curriculum_year_grade_index ON curriculum (academic_year_id, grade_level_id);

CREATE TABLE periods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    section_id INTEGER NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL,
    kind TEXT NOT NULL DEFAULT 'period' CHECK (kind IN ('period', 'break')),
    label TEXT,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE (section_id, sort_order)
);

CREATE INDEX periods_section_index ON periods (section_id, start_time);

CREATE TABLE holidays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    academic_year_id INTEGER NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    label TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE (academic_year_id, date)
);

CREATE TABLE teaching_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_staff_id INTEGER NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
    subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    section_id INTEGER NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    academic_year_id INTEGER NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    UNIQUE (teacher_staff_id, subject_id, section_id, academic_year_id)
);

CREATE INDEX teaching_assignments_teacher_index ON teaching_assignments (teacher_staff_id, academic_year_id);

CREATE TABLE lessons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    section_id INTEGER NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    period_id INTEGER NOT NULL REFERENCES periods(id) ON DELETE CASCADE,
    teaching_assignment_id INTEGER NOT NULL REFERENCES teaching_assignments(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    room_id INTEGER REFERENCES rooms(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    UNIQUE (section_id, period_id, day_of_week)
);

CREATE INDEX lessons_assignment_index ON lessons (teaching_assignment_id);

CREATE TABLE students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admission_number TEXT NOT NULL UNIQUE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    name_fa TEXT,
    name_ps TEXT,
    gender TEXT CHECK (gender IN ('male', 'female', 'other')),
    date_of_birth TEXT,
    phone TEXT,
    address TEXT,
    photo_path TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'graduated', 'withdrawn')),
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX students_name_index ON students (last_name, first_name);
CREATE INDEX students_status_index ON students (status);

CREATE TABLE guardians (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    address TEXT,
    occupation TEXT,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE student_guardians (
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    guardian_id INTEGER NOT NULL REFERENCES guardians(id) ON DELETE CASCADE,
    relationship TEXT NOT NULL DEFAULT 'guardian',
    is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0, 1)),
    created_at TEXT NOT NULL,
    PRIMARY KEY (student_id, guardian_id)
);

CREATE UNIQUE INDEX student_guardians_one_primary ON student_guardians (student_id) WHERE is_primary = 1;

CREATE TABLE siblings (
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    sibling_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL,
    PRIMARY KEY (student_id, sibling_id),
    CHECK (student_id <> sibling_id)
);

CREATE TABLE applicants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    date_of_birth TEXT,
    gender TEXT CHECK (gender IN ('male', 'female', 'other')),
    guardian_name TEXT,
    phone TEXT,
    desired_grade_level_id INTEGER REFERENCES grade_levels(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'applicant' CHECK (status IN ('applicant', 'admitted', 'rejected', 'withdrawn')),
    notes TEXT,
    admitted_student_id INTEGER REFERENCES students(id) ON DELETE SET NULL,
    decision_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE enrollments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    section_id INTEGER NOT NULL REFERENCES sections(id) ON DELETE RESTRICT,
    academic_year_id INTEGER NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'transferred', 'withdrawn', 'graduated')),
    started_at TEXT NOT NULL,
    ended_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX enrollments_one_active_year ON enrollments (student_id, academic_year_id) WHERE status = 'active';
CREATE INDEX enrollments_section_index ON enrollments (section_id, status);
CREATE INDEX enrollments_student_index ON enrollments (student_id, academic_year_id);

CREATE TABLE promotions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    from_enrollment_id INTEGER REFERENCES enrollments(id) ON DELETE SET NULL,
    to_enrollment_id INTEGER REFERENCES enrollments(id) ON DELETE SET NULL,
    academic_year_id INTEGER NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    outcome TEXT NOT NULL CHECK (outcome IN ('promoted', 'retained', 'graduated')),
    notes TEXT,
    actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE attendance_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    section_id INTEGER NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    period_id INTEGER REFERENCES periods(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
    reason TEXT,
    recorded_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX attendance_daily_unique ON attendance_records (student_id, section_id, date) WHERE period_id IS NULL;
CREATE UNIQUE INDEX attendance_period_unique ON attendance_records (student_id, section_id, date, period_id) WHERE period_id IS NOT NULL;
CREATE INDEX attendance_section_date_index ON attendance_records (section_id, date);

CREATE TABLE attendance_locks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    academic_year_id INTEGER NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    month TEXT NOT NULL,
    locked_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    locked_at TEXT NOT NULL,
    reopened_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reopened_at TEXT,
    reason TEXT,
    UNIQUE (academic_year_id, month)
);

CREATE TABLE exams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    academic_year_id INTEGER NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    semester_id INTEGER NOT NULL REFERENCES semesters(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('first', 'final')),
    max_score INTEGER NOT NULL CHECK (max_score IN (40, 60)),
    marking_deadline TEXT,
    created_at TEXT NOT NULL,
    UNIQUE (subject_id, academic_year_id, type)
);

CREATE TABLE exam_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    section_id INTEGER NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 90,
    room_id INTEGER REFERENCES rooms(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    UNIQUE (exam_id, section_id)
);

CREATE TABLE exam_scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    score INTEGER,
    is_absent INTEGER NOT NULL DEFAULT 0 CHECK (is_absent IN (0, 1)),
    is_draft INTEGER NOT NULL DEFAULT 1 CHECK (is_draft IN (0, 1)),
    published_at TEXT,
    published_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (exam_id, student_id)
);

CREATE TABLE supplementary_exams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    academic_year_id INTEGER NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
    capped_score INTEGER NOT NULL CHECK (capped_score BETWEEN 0 AND 40),
    passed INTEGER NOT NULL CHECK (passed IN (0, 1)),
    entered_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    UNIQUE (student_id, subject_id, academic_year_id)
);

CREATE TABLE report_cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    academic_year_id INTEGER NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    semester_id INTEGER REFERENCES semesters(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('semester', 'annual')),
    version INTEGER NOT NULL DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    snapshot_json TEXT NOT NULL,
    remark TEXT,
    principal_name TEXT,
    published_at TEXT,
    published_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (student_id, academic_year_id, semester_id, type, version)
);

CREATE INDEX report_cards_student_index ON report_cards (student_id, status);

CREATE TABLE fee_structures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    academic_year_id INTEGER NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    grade_level_id INTEGER NOT NULL REFERENCES grade_levels(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (academic_year_id, grade_level_id)
);

CREATE TABLE fee_components (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fee_structure_id INTEGER NOT NULL REFERENCES fee_structures(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('monthly', 'one_time', 'per_semester')),
    name TEXT NOT NULL,
    name_fa TEXT,
    name_ps TEXT,
    amount REAL NOT NULL CHECK (amount >= 0),
    semester_number INTEGER CHECK (semester_number IN (1, 2)),
    created_at TEXT NOT NULL,
    UNIQUE (fee_structure_id, kind, name)
);

CREATE TABLE invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    academic_year_id INTEGER NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    billing_period TEXT NOT NULL,
    invoice_number TEXT UNIQUE,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'issued', 'partially_paid', 'paid', 'overdue', 'void')),
    issue_date TEXT,
    due_date TEXT,
    subtotal REAL NOT NULL DEFAULT 0,
    discount_total REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    paid_total REAL NOT NULL DEFAULT 0,
    balance REAL NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (student_id, billing_period)
);

CREATE INDEX invoices_period_index ON invoices (billing_period, status);
CREATE INDEX invoices_student_index ON invoices (student_id);

CREATE TABLE invoice_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    description TEXT NOT NULL,
    description_fa TEXT,
    description_ps TEXT,
    amount REAL NOT NULL,
    quantity REAL NOT NULL DEFAULT 1,
    metadata TEXT
);

CREATE TABLE discounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('percentage', 'fixed')),
    reason TEXT NOT NULL CHECK (reason IN ('scholarship', 'sibling', 'staff', 'other')),
    value REAL NOT NULL CHECK (value >= 0),
    amount REAL NOT NULL CHECK (amount >= 0),
    note TEXT,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TEXT NOT NULL
);

CREATE TABLE payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    amount REAL NOT NULL CHECK (amount > 0),
    method TEXT NOT NULL CHECK (method IN ('cash', 'bank_transfer', 'mobile_money')),
    paid_at TEXT NOT NULL,
    receipt_number TEXT NOT NULL UNIQUE,
    idempotency_key TEXT NOT NULL UNIQUE,
    recorded_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TEXT NOT NULL
);

CREATE INDEX payments_student_index ON payments (student_id, paid_at);

CREATE TABLE refunds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    payment_id INTEGER NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    amount REAL NOT NULL CHECK (amount > 0),
    reason TEXT NOT NULL,
    refunded_at TEXT NOT NULL,
    recorded_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TEXT NOT NULL
);

CREATE TABLE credits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    amount REAL NOT NULL,
    source TEXT NOT NULL DEFAULT 'overpayment',
    applied_invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    applied_at TEXT
);

CREATE TABLE library_titles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    author TEXT,
    isbn TEXT,
    category TEXT,
    publisher TEXT,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX library_titles_search_index ON library_titles (title, author, isbn, category);

CREATE TABLE library_copies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title_id INTEGER NOT NULL REFERENCES library_titles(id) ON DELETE CASCADE,
    accession_number TEXT NOT NULL UNIQUE,
    barcode TEXT,
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'on_loan', 'lost', 'damaged', 'archived')),
    replacement_cost REAL NOT NULL DEFAULT 0,
    condition_note TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE loans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    copy_id INTEGER NOT NULL REFERENCES library_copies(id) ON DELETE CASCADE,
    borrower_type TEXT NOT NULL CHECK (borrower_type IN ('student', 'staff')),
    borrower_id INTEGER NOT NULL,
    issued_at TEXT NOT NULL,
    due_at TEXT NOT NULL,
    returned_at TEXT,
    renewal_count INTEGER NOT NULL DEFAULT 0 CHECK (renewal_count >= 0),
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'returned', 'lost')),
    issued_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TEXT NOT NULL
);

CREATE UNIQUE INDEX loans_one_open_copy ON loans (copy_id) WHERE status = 'open';
CREATE INDEX loans_borrower_index ON loans (borrower_type, borrower_id, status);

CREATE TABLE fines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    loan_id INTEGER NOT NULL REFERENCES loans(id) ON DELETE CASCADE,
    amount REAL NOT NULL CHECK (amount >= 0),
    reason TEXT NOT NULL CHECK (reason IN ('late', 'damaged', 'lost')),
    settled INTEGER NOT NULL DEFAULT 0 CHECK (settled IN (0, 1)),
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
    transferred_at TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    target_type TEXT NOT NULL CHECK (target_type IN ('all', 'role', 'grade', 'section')),
    target_value TEXT,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    published_at TEXT,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE announcement_reads (
    announcement_id INTEGER NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    read_at TEXT NOT NULL,
    PRIMARY KEY (announcement_id, user_id)
);

CREATE TABLE audit_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    module TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    reason TEXT,
    before_json TEXT,
    after_json TEXT,
    ip TEXT,
    user_agent TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX audit_entries_module_index ON audit_entries (module, created_at);
CREATE INDEX audit_entries_actor_index ON audit_entries (actor_user_id, created_at);

CREATE TABLE documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('student', 'staff', 'applicant', 'guardian')),
    entity_id INTEGER NOT NULL,
    original_name TEXT NOT NULL,
    stored_name TEXT NOT NULL UNIQUE,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    uploaded_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TEXT NOT NULL
);

CREATE INDEX documents_entity_index ON documents (entity_type, entity_id);

CREATE TABLE backup_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    size INTEGER NOT NULL,
    created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TEXT NOT NULL
);