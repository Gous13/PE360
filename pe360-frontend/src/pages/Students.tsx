import React, { useState, useEffect, useRef } from 'react';
import { Upload, Download, Search, Trash2, Users, AlertCircle, CheckCircle2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { studentsApi } from '../services/api';
import { useToastStore } from '../store/toastStore';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal, ConfirmModal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { Badge } from '../components/ui/Badge';
import type { Student, ImportPreview } from '../types';

const CLASSES = ['6','7','8','9','10','11','12'];
const SECTIONS = ['A','B','C','D','E'];

export function Students() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('8');
  const [selectedSection, setSelectedSection] = useState('A');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'student' | 'class'; id?: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { addToast } = useToastStore();

  useEffect(() => { fetchClasses(); }, []);
  useEffect(() => { fetchStudents(); }, [selectedClass, selectedSection]);

  const fetchClasses = async () => {
    try {
      const r = await studentsApi.getClasses();
      setClasses(r.data.classes || []);
    } catch {}
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const r = await studentsApi.getByClass(selectedClass, selectedSection);
      setStudents(r.data.students || []);
    } catch {
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });
        const errors: string[] = [];
        const students: Partial<Student>[] = [];
        const rollNos = new Set<string>();

        rows.forEach((row, i) => {
          const rowNum = i + 2;
          const rollNo = String(row['Roll No'] || row['rollNo'] || row['Roll Number'] || '').trim();
          const name = String(row['Student Name'] || row['Name'] || row['name'] || '').trim();
          const cls = String(row['Class'] || row['class'] || selectedClass).trim();
          const section = String(row['Section'] || row['section'] || selectedSection).trim();
          const gender = String(row['Gender'] || row['gender'] || 'male').trim().toLowerCase();

          if (!name) { errors.push(`Row ${rowNum}: Missing student name`); return; }
          if (!rollNo) { errors.push(`Row ${rowNum}: Missing roll number`); return; }
          if (rollNos.has(rollNo)) { errors.push(`Row ${rowNum}: Duplicate roll number ${rollNo}`); return; }
          rollNos.add(rollNo);

          students.push({ rollNo, name, class: cls, section, gender: gender as any });
        });

        setImportPreview({
          students: students as Student[],
          errors,
          total: rows.length,
          valid: students.length,
        });
        setShowImport(true);
      } catch {
        addToast('Failed to parse Excel file. Please check the format.', 'error');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const handleImport = async () => {
    if (!importPreview?.students.length) return;
    setImportLoading(true);
    try {
      const formData = new FormData();
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(
        importPreview.students.map(s => ({
          'Roll No': s.rollNo, 'Student Name': s.name,
          'Class': s.class, 'Section': s.section, 'Gender': s.gender,
        }))
      );
      XLSX.utils.book_append_sheet(wb, ws, 'Students');
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
      const blob = new Blob([s2ab(wbout)], { type: 'application/octet-stream' });
      formData.append('file', blob, 'students.xlsx');
      await studentsApi.importExcel(formData);
      addToast(`${importPreview.valid} students imported successfully`);
      setShowImport(false);
      setImportPreview(null);
      fetchStudents();
      fetchClasses();
    } catch (err: any) {
      addToast(err.response?.data?.error || 'Import failed. Please try again.', 'error');
    } finally {
      setImportLoading(false);
    }
  };

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet([
      { 'Roll No': '1', 'Student Name': 'Rahul Kumar', 'Class': '8', 'Section': 'A', 'Gender': 'male' },
      { 'Roll No': '2', 'Student Name': 'Priya Sharma', 'Class': '8', 'Section': 'A', 'Gender': 'female' },
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'Students');
    XLSX.writeFile(wb, 'PE360_Student_Template.xlsx');
    addToast('Template downloaded', 'info');
  };

  const handleDeleteStudent = async () => {
    if (!deleteTarget || deleteTarget.type !== 'student' || !deleteTarget.id) return;
    try {
      await studentsApi.delete(deleteTarget.id);
      addToast('Student removed');
      fetchStudents();
    } catch {
      addToast('Failed to remove student', 'error');
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleDeleteClass = async () => {
    if (deleteTarget?.type !== 'class') return;
    try {
      await studentsApi.deleteByClass(selectedClass, selectedSection);
      addToast(`Class ${selectedClass}-${selectedSection} cleared`);
      fetchStudents();
      fetchClasses();
    } catch {
      addToast('Failed to clear class', 'error');
    } finally {
      setDeleteTarget(null);
    }
  };

  function s2ab(s: string) {
    const buf = new ArrayBuffer(s.length);
    const view = new Uint8Array(buf);
    for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xFF;
    return buf;
  }

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.rollNo.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="px-4 py-5 max-w-2xl mx-auto lg:max-w-3xl lg:px-8 lg:py-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Students</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage class-wise student data</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={downloadTemplate}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
            title="Download template"
          >
            <Download size={18} />
          </button>
          <Button onClick={() => fileRef.current?.click()} icon={<Upload size={16} />} size="md">
            Import Excel
          </Button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
        </div>
      </div>

      {/* Class selector */}
      <div className="mb-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Class</p>
        <div className="flex gap-2 flex-wrap">
          {CLASSES.map((cls) => {
            const total = classes.find(c => c.class === cls)?.count || 0;
            return (
              <button
                key={cls}
                onClick={() => setSelectedClass(cls)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  selectedClass === cls
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-300'
                }`}
              >
                {cls}
                {total > 0 && <span className="ml-1.5 text-xs opacity-70">{total}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Section selector */}
      <div className="mb-5">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Section</p>
        <div className="flex gap-2">
          {SECTIONS.map((sec) => (
            <button
              key={sec}
              onClick={() => setSelectedSection(sec)}
              className={`w-10 h-10 rounded-xl text-sm font-semibold transition-all ${
                selectedSection === sec
                  ? 'bg-slate-800 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-400'
              }`}
            >
              {sec}
            </button>
          ))}
        </div>
      </div>

      {/* Class header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-slate-400" />
          <span className="font-semibold text-slate-700">
            Class {selectedClass}-{selectedSection}
          </span>
          <Badge variant="default" size="sm">{students.length} students</Badge>
        </div>
        {students.length > 0 && (
          <button
            onClick={() => setDeleteTarget({ type: 'class' })}
            className="text-xs text-red-500 hover:text-red-700 font-medium"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Search */}
      {students.length > 0 && (
        <div className="mb-4">
          <Input
            placeholder="Search by name or roll no..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Search size={15} />}
          />
        </div>
      )}

      {/* Student list */}
      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4].map(i => <div key={i} className="h-16 bg-slate-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length > 0 ? (
        <div className="space-y-2">
          {filtered.map((student) => (
            <div key={student.id} className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                <span className="font-bold text-slate-600 text-sm">{student.rollNo}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-800 text-sm">{student.name}</div>
                <div className="text-xs text-slate-400 mt-0.5">
                  Class {student.class}-{student.section} •
                  <span className="capitalize ml-1">{student.gender}</span>
                </div>
              </div>
              <button
                onClick={() => setDeleteTarget({ type: 'student', id: student.id })}
                className="p-2 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      ) : students.length === 0 ? (
        <EmptyState
          emoji="👨‍🎓"
          title="No students in this class"
          description="Import student data from an Excel file to get started."
          action={{ label: 'Import Excel', onClick: () => fileRef.current?.click() }}
        />
      ) : (
        <EmptyState emoji="🔍" title="No students found" description={`No results for "${search}"`} />
      )}

      {/* Import preview modal */}
      <Modal
        isOpen={showImport}
        onClose={() => { setShowImport(false); setImportPreview(null); }}
        title="Preview Import"
        size="lg"
        footer={
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => { setShowImport(false); setImportPreview(null); }} fullWidth>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              loading={importLoading}
              disabled={!importPreview?.valid}
              fullWidth
            >
              Import {importPreview?.valid} Students
            </Button>
          </div>
        }
      >
        {importPreview && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="text-xl font-bold text-slate-900">{importPreview.total}</div>
                <div className="text-xs text-slate-500">Total Rows</div>
              </div>
              <div className="bg-green-50 rounded-xl p-3">
                <div className="text-xl font-bold text-green-700">{importPreview.valid}</div>
                <div className="text-xs text-slate-500">Valid</div>
              </div>
              <div className="bg-red-50 rounded-xl p-3">
                <div className="text-xl font-bold text-red-700">{importPreview.errors.length}</div>
                <div className="text-xs text-slate-500">Errors</div>
              </div>
            </div>

            {importPreview.errors.length > 0 && (
              <div className="bg-red-50 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle size={14} className="text-red-600" />
                  <span className="text-sm font-medium text-red-700">Issues found</span>
                </div>
                <ul className="space-y-1">
                  {importPreview.errors.map((err, i) => (
                    <li key={i} className="text-xs text-red-600">{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {importPreview.valid > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 size={14} className="text-green-600" />
                  <span className="text-sm font-medium text-slate-700">Students to import (first 5)</span>
                </div>
                <div className="space-y-1.5">
                  {importPreview.students.slice(0, 5).map((s, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2 bg-slate-50 rounded-xl text-sm">
                      <span className="text-slate-500 w-6">{s.rollNo}</span>
                      <span className="font-medium text-slate-800 flex-1">{s.name}</span>
                      <span className="text-slate-400 text-xs">{s.class}-{s.section}</span>
                    </div>
                  ))}
                  {importPreview.students.length > 5 && (
                    <p className="text-xs text-slate-400 px-3">+ {importPreview.students.length - 5} more students</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmModal
        isOpen={deleteTarget?.type === 'student'}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteStudent}
        title="Remove Student"
        message="Remove this student from the class? Attendance records will be preserved."
        confirmLabel="Remove"
        danger
      />

      <ConfirmModal
        isOpen={deleteTarget?.type === 'class'}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteClass}
        title="Clear Class"
        message={`Remove all students from Class ${selectedClass}-${selectedSection}? This cannot be undone.`}
        confirmLabel="Clear All"
        danger
      />
    </div>
  );
}
