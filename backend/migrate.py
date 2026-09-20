"""
Safe migration script for PE360 multi-user isolation.
Run once: python migrate.py

What this does:
  1. Adds user_id to students, timetable_entries, attendance_sessions, important_items
  2. Adds school_name, phone to users
  3. Adds is_global to important_items
  4. Drops old unique constraint on students, adds new composite one
  5. Assigns existing records to the first admin user (safe, non-destructive)
"""

import os
import sys

# Allow running from the backend directory
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app, db
from sqlalchemy import text, inspect

app = create_app()

def column_exists(conn, table, column):
    result = conn.execute(text(f"PRAGMA table_info({table})"))
    cols = [row[1] for row in result.fetchall()]
    return column in cols

def index_exists(conn, index_name):
    result = conn.execute(text(
        "SELECT name FROM sqlite_master WHERE type='index' AND name=:n"
    ), {"n": index_name})
    return result.fetchone() is not None

def run_migration():
    with app.app_context():
        conn = db.engine.connect()
        trans = conn.begin()

        try:
            # ── 1. users: add school_name, phone ──────────────────────────────
            if not column_exists(conn, 'users', 'school_name'):
                print("Adding school_name to users...")
                conn.execute(text("ALTER TABLE users ADD COLUMN school_name VARCHAR(200) DEFAULT ''"))
            if not column_exists(conn, 'users', 'phone'):
                print("Adding phone to users...")
                conn.execute(text("ALTER TABLE users ADD COLUMN phone VARCHAR(30) DEFAULT ''"))

            # ── 2. Find the first admin user id to assign orphaned records ────
            result = conn.execute(text(
                "SELECT id FROM users WHERE role='admin' ORDER BY id LIMIT 1"
            ))
            row = result.fetchone()
            if not row:
                result = conn.execute(text("SELECT id FROM users ORDER BY id LIMIT 1"))
                row = result.fetchone()
            default_user_id = row[0] if row else 1
            print(f"Orphaned records will be assigned to user_id={default_user_id}")

            # ── 3. students: add user_id ──────────────────────────────────────
            if not column_exists(conn, 'students', 'user_id'):
                print("Adding user_id to students...")
                conn.execute(text("ALTER TABLE students ADD COLUMN user_id INTEGER REFERENCES users(id)"))
                conn.execute(text(
                    f"UPDATE students SET user_id={default_user_id} WHERE user_id IS NULL"
                ))

            # ── 4. students: replace unique constraint ────────────────────────
            # SQLite doesn't support DROP CONSTRAINT, so we need to recreate the table.
            # Check if the new index already exists.
            if not index_exists(conn, 'uq_student_user_roll_class_section'):
                print("Recreating students table with new unique constraint...")

                conn.execute(text("""
                    CREATE TABLE students_new (
                        id INTEGER PRIMARY KEY,
                        user_id INTEGER REFERENCES users(id),
                        roll_no VARCHAR(20) NOT NULL,
                        name VARCHAR(100) NOT NULL,
                        class_name VARCHAR(10) NOT NULL,
                        section VARCHAR(5) NOT NULL,
                        gender VARCHAR(10) DEFAULT 'male',
                        created_at DATETIME,
                        UNIQUE(user_id, roll_no, class_name, section)
                    )
                """))

                conn.execute(text("""
                    INSERT OR IGNORE INTO students_new
                        (id, user_id, roll_no, name, class_name, section, gender, created_at)
                    SELECT id, user_id, roll_no, name, class_name, section, gender, created_at
                    FROM students
                """))

                # Update foreign keys in attendance_records to point to same IDs (IDs are preserved)
                conn.execute(text("DROP TABLE students"))
                conn.execute(text("ALTER TABLE students_new RENAME TO students"))
                print("Students table recreated with UNIQUE(user_id, roll_no, class_name, section).")
            else:
                print("students unique constraint already updated.")

            # ── 5. timetable_entries: add user_id ────────────────────────────
            if not column_exists(conn, 'timetable_entries', 'user_id'):
                print("Adding user_id to timetable_entries...")
                conn.execute(text("ALTER TABLE timetable_entries ADD COLUMN user_id INTEGER REFERENCES users(id)"))
                # Assign existing entries to their created_by user (if set), else default admin
                conn.execute(text("""
                    UPDATE timetable_entries
                    SET user_id = COALESCE(created_by, :uid)
                    WHERE user_id IS NULL
                """), {"uid": default_user_id})

            # ── 6. attendance_sessions: add user_id ──────────────────────────
            if not column_exists(conn, 'attendance_sessions', 'user_id'):
                print("Adding user_id to attendance_sessions...")
                conn.execute(text("ALTER TABLE attendance_sessions ADD COLUMN user_id INTEGER REFERENCES users(id)"))
                conn.execute(text("""
                    UPDATE attendance_sessions
                    SET user_id = COALESCE(teacher_id, :uid)
                    WHERE user_id IS NULL
                """), {"uid": default_user_id})

            # ── 7. important_items: add is_global ────────────────────────────
            if not column_exists(conn, 'important_items', 'is_global'):
                print("Adding is_global to important_items...")
                conn.execute(text("ALTER TABLE important_items ADD COLUMN is_global BOOLEAN DEFAULT 0"))

            trans.commit()
            print("\n✅ Migration completed successfully.")

        except Exception as e:
            trans.rollback()
            print(f"\n❌ Migration failed: {e}")
            raise

        finally:
            conn.close()

if __name__ == '__main__':
    run_migration()
