# Assignment Module Migration Guide

## Overview

The assignment module has been completely restructured to match the Umar Academy system requirements. This guide explains the changes and how to migrate existing data.

## New Structure

### Key Changes

1. **Single Student per Assignment**: Assignments are now created per student (not multiple students per assignment)
2. **Classwork Structure**: Supports three phases - Sabq, Sabqi, and Manzil - each with multiple entries
3. **Structured Homework**: Homework items with range modes (surah_ayah, surah_surah, juz_juz, multiple_juz)
4. **Source Tracking**: Links to tickets, evaluations, and reviews
5. **Mushaf Mistakes**: Integration with recitation mistake tracking
6. **Status System**: active, completed, archived (replaces pending/submitted/graded/overdue)

## Migration Steps

### Step 1: Backup Database

```bash
# Backup MongoDB
mongodump --uri="your-connection-string" --out=./backup-$(date +%Y%m%d)
```

### Step 2: Run Migration Script

```bash
# Install tsx if not already installed
npm install -g tsx

# Run migration script
npx tsx scripts/migrate-assignments.ts
```

The migration script will:
- Find all old-format assignments (without `studentId` field)
- Convert each assignment to new format
- Create separate assignments for each student
- Convert old status to new status
- Convert old type to classwork/homework structure
- Delete old assignments

### Step 3: Verify Migration

```javascript
// Check assignments in MongoDB
db.assignments.find({ studentId: { $exists: true } }).count()
// Should match the number of migrated assignments

// Check for any remaining old format
db.assignments.find({ studentId: { $exists: false } }).count()
// Should be 0
```

## API Changes

### New Endpoints

1. **GET /api/assignments/me** - Get assignments for authenticated student
2. **GET /api/assignments/student/:studentId** - Get all assignments for a student
3. **POST /api/assignments/:id/submit-homework** - Submit homework (students)
4. **POST /api/assignments/:id/grade-homework** - Grade homework (teachers/admins)
5. **GET /api/assignments/:id/pdf-annotations** - Get PDF annotations
6. **POST /api/assignments/:id/pdf-annotations** - Add PDF annotation

### Updated Endpoints

1. **GET /api/assignments** - Now returns `data` array instead of `assignments`
2. **POST /api/assignments** - Accepts new structure with classwork/homework
3. **PUT /api/assignments/:id** - Validates homework items and ranges

## Frontend Changes

### Updated Components

1. **CreateAssignmentModal** - Now supports:
   - Classwork entries (sabq, sabqi, manzil)
   - Homework items with range modes
   - Qaidah homework
   - PDF selection

2. **AssignmentCard** - Updated to show:
   - Student name instead of title
   - Classwork count
   - Homework status
   - New status system

3. **AssignmentDetailsModal** - Updated to display:
   - Classwork entries by phase
   - Homework items with ranges
   - Qaidah homework
   - PDF with annotations
   - Homework submission/grading

4. **SubmissionForm** - Updated to use:
   - New homework submission endpoint
   - Audio recording support
   - Multiple attachment types

5. **GradeHomeworkModal** - New component for grading homework

## Integration Points

### Ticket Approval

When a ticket is approved:
- Creates assignment with classwork entry based on workflow step
- Copies ticket mistakes to assignment's mushafMistakes
- Links via `fromTicketId`

### Evaluation Review

When an evaluation is approved:
- Can create assignment with homework items
- Links via `weeklyEvaluationId`

## Data Structure Examples

### Classwork Entry

```json
{
  "type": "sabq",
  "assignmentRange": "Surah Al-Fatiha, Ayah 1-7",
  "details": "First recitation",
  "surahNumber": 1,
  "surahName": "الفاتحة",
  "fromAyah": 1,
  "toAyah": 7,
  "createdAt": "2024-01-15T10:00:00Z"
}
```

### Homework Item

```json
{
  "type": "sabq",
  "range": {
    "mode": "surah_ayah",
    "from": {
      "surah": 1,
      "surahName": "الفاتحة",
      "ayah": 1
    },
    "to": {
      "surah": 1,
      "surahName": "الفاتحة",
      "ayah": 7
    }
  },
  "source": {
    "suggestedFrom": "ticket",
    "ticketIds": ["507f191e810c19729de860ec"]
  },
  "content": "Practice recitation with proper tajweed"
}
```

### Homework Submission

```json
{
  "submitted": true,
  "submittedAt": "2024-01-16T14:30:00Z",
  "submittedBy": "507f191e810c19729de860ea",
  "submittedByName": "Ahmed Ali",
  "content": "Student's written notes",
  "link": "https://example.com/recitation",
  "audioUrl": "https://example.com/audio.mp3",
  "attachments": [
    {
      "name": "recitation.pdf",
      "url": "https://example.com/file.pdf",
      "type": "application/pdf"
    }
  ],
  "status": "submitted"
}
```

## Testing Checklist

After migration, verify:

- [ ] All assignments migrated successfully
- [ ] Student can view their assignments
- [ ] Teacher can create assignments with classwork
- [ ] Teacher can create assignments with homework items
- [ ] Student can submit homework (text, link, audio, files)
- [ ] Teacher can grade homework
- [ ] PDF annotations work for assignments
- [ ] Qaidah homework displays correctly
- [ ] Ticket approval creates assignments
- [ ] Evaluation approval can create assignments
- [ ] WebSocket events fire correctly
- [ ] Permissions are enforced

## Rollback Plan

If migration fails:

1. Restore database from backup
2. Revert code changes
3. Investigate issues
4. Fix migration script
5. Re-run migration

## Support

For issues or questions:
1. Check migration script logs
2. Verify database connection
3. Check assignment model schema
4. Review API endpoint responses
