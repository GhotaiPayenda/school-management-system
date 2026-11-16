import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { api } from '../api/client.js';
import { selectAuth } from '../features/auth/authSlice.js';

const ReferenceContext = createContext(null);

async function get(path, params) {
  try {
    const response = await api.get(path, params ? { params } : undefined);
    return response.data.data;
  } catch {
    return null;
  }
}

function deriveFromStudents(students) {
  const sections = new Map();
  const years = new Map();
  const grades = new Map();
  for (const student of students) {
    if (student.section_id) {
      sections.set(student.section_id, {
        id: student.section_id,
        name: student.section_name,
        grade_number: student.grade_number,
        grade_name: student.grade_name,
        academic_year_id: student.academic_year_id,
        academic_year_label: student.academic_year_label,
      });
    }
    if (student.academic_year_id) {
      years.set(student.academic_year_id, {
        id: student.academic_year_id,
        label: student.academic_year_label,
        is_current: 1,
      });
    }
    if (student.grade_number) {
      grades.set(student.grade_number, {
        id: student.grade_number,
        number: student.grade_number,
        name: student.grade_name,
      });
    }
  }
  return {
    sections: [...sections.values()].sort((a, b) => a.grade_number - b.grade_number || a.name.localeCompare(b.name)),
    years: [...years.values()],
    grades: [...grades.values()].sort((a, b) => a.number - b.number),
  };
}

export function ReferenceProvider({ children }) {
  const { permissions } = useSelector(selectAuth);
  const permissionKey = permissions.join('|');
  const [data, setData] = useState({
    years: [],
    semesters: [],
    grades: [],
    sections: [],
    rooms: [],
    subjects: [],
    departments: [],
    staff: [],
    students: [],
  });
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const canAcademic = permissions.includes('academic.manage');
      const canStudents = permissions.includes('students.view');
      const canStaff = permissions.includes('staff.view');

      const [years, grades, sections, rooms, subjects, departments, staff, students] = await Promise.all([
        canAcademic ? get('/academic-years') : null,
        canAcademic ? get('/grade-levels') : null,
        canAcademic ? get('/sections', { pageSize: 100 }) : null,
        canAcademic ? get('/rooms', { pageSize: 100 }) : null,
        canAcademic ? get('/subjects', { pageSize: 100 }) : null,
        canAcademic ? get('/departments', { pageSize: 100 }) : null,
        canStaff ? get('/staff', { pageSize: 200 }) : null,
        canStudents ? get('/students', { pageSize: 500 }) : null,
      ]);

      if (!active) return;

      const studentItems = students?.items ?? [];
      const derived = deriveFromStudents(studentItems);
      const yearItems = years?.items ?? derived.years;
      const gradeItems = grades?.items ?? derived.grades;
      const sectionItems = sections?.items ?? derived.sections;
      const currentYear = yearItems.find((year) => Number(year.is_current) === 1) ?? yearItems[0] ?? null;
      let semesters = [];
      if (canAcademic && currentYear) {
        const yearDetail = await get(`/academic-years/${currentYear.id}`);
        semesters = yearDetail?.semesters ?? [];
      }

      if (!active) return;
      setData({
        years: yearItems,
        semesters,
        grades: gradeItems,
        sections: sectionItems,
        rooms: rooms?.items ?? [],
        subjects: subjects?.items ?? [],
        departments: departments?.items ?? [],
        staff: staff?.items ?? [],
        students: studentItems,
      });
      setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionKey, version]);

  const reload = useCallback(() => setVersion((value) => value + 1), []);

  const value = useMemo(() => {
    const currentYear = data.years.find((year) => Number(year.is_current) === 1) ?? data.years[0] ?? null;
    return {
      ...data,
      currentYear,
      loading,
      reload,
      yearOptions: data.years.map((year) => ({ value: year.id, label: year.label })),
      semesterOptions: data.semesters.map((semester) => ({
        value: semester.id,
        label: `${semester.name} (${semester.number})`,
      })),
      gradeOptions: [...data.grades]
        .sort((a, b) => Number(a.number) - Number(b.number))
        .map((grade) => ({ value: grade.id, label: grade.name || `Grade ${grade.number}` })),
      sectionOptions: [...data.sections]
        .sort((a, b) => Number(a.grade_number) - Number(b.grade_number) || String(a.name).localeCompare(String(b.name)))
        .map((section) => ({
          value: section.id,
          label: section.grade_name
            ? `${section.grade_name} — ${section.name}`
            : `${section.grade_number ? `Grade ${section.grade_number}` : ''} ${section.name ?? ''}`.trim(),
        })),
      subjectOptions: data.subjects
        .filter((subject) => Number(subject.has_exam) === 1 || subject.has_exam === undefined)
        .map((subject) => ({ value: subject.id, label: `${subject.code} — ${subject.name}` })),
      allSubjectOptions: data.subjects.map((subject) => ({ value: subject.id, label: `${subject.code} — ${subject.name}` })),
      staffOptions: data.staff
        .map((member) => ({
          value: member.id,
          label: `${member.first_name} ${member.last_name}${Number(member.is_teacher) ? ' (Teacher)' : ''}`,
          isTeacher: Number(member.is_teacher) === 1,
        })),
      teacherOptions: data.staff
        .filter((member) => Number(member.is_teacher) === 1)
        .map((member) => ({ value: member.id, label: `${member.first_name} ${member.last_name}` })),
      roomOptions: data.rooms.map((room) => ({ value: room.id, label: room.name })),
      studentOptions: data.students.map((student) => ({
        value: student.id,
        label: `${student.first_name} ${student.last_name} (${student.admission_number})`,
      })),
      sectionLabel(sectionId) {
        const section = data.sections.find((item) => Number(item.id) === Number(sectionId));
        if (!section) return sectionId ? `Section #${sectionId}` : '—';
        return section.grade_name ? `${section.grade_name} — ${section.name}` : `Grade ${section.grade_number} — ${section.name}`;
      },
    };
  }, [data, loading, reload]);

  return <ReferenceContext.Provider value={value}>{children}</ReferenceContext.Provider>;
}

export function useReference() {
  const value = useContext(ReferenceContext);
  if (!value) throw new Error('useReference must be used inside ReferenceProvider');
  return value;
}