import { initDatabase } from './schema.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export function seedDatabase(db) {
  // Check if society already exists
  const existingSociety = db.prepare('SELECT id FROM societies WHERE code = ?').get('GREEN-VISTA-01');
  if (existingSociety) {
    console.log('Database already seeded. Skipping.');
    return existingSociety.id;
  }

  console.log('Seeding demo housing society and accounts...');

  const societyId = 'soc_' + uuidv4();
  const managerId = 'usr_' + uuidv4();
  const residentId = 'usr_' + uuidv4();
  const resident2Id = 'usr_' + uuidv4();
  const staffId = 'usr_' + uuidv4();

  const passwordHash = bcrypt.hashSync('Password123!', 10);

  // Insert Society
  const insertSociety = db.prepare(`
    INSERT INTO societies (id, name, code, address, city, wings_config)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertSociety.run(
    societyId,
    'Green Vista Cooperative Housing Society',
    'GREEN-VISTA-01',
    'Plot 42, Eco Park Road, Sector 14',
    'Mumbai',
    JSON.stringify(['Wing A', 'Wing B', 'Wing C'])
  );

  // Insert Users
  const insertUser = db.prepare(`
    INSERT INTO users (id, society_id, full_name, email, password_hash, role, phone, wing, flat_number)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertUser.run(managerId, societyId, 'Anita Deshmukh (Secretary)', 'manager@greenvista.org', passwordHash, 'manager', '+919876543210', 'Wing A', 'A-101');
  insertUser.run(residentId, societyId, 'Rajesh Sharma', 'resident@greenvista.org', passwordHash, 'resident', '+919876543211', 'Wing B', 'B-402');
  insertUser.run(resident2Id, societyId, 'Priya Nair', 'priya@greenvista.org', passwordHash, 'resident', '+919876543212', 'Wing C', 'C-701');
  insertUser.run(staffId, societyId, 'Ramesh Kumar (Housekeeping)', 'staff@greenvista.org', passwordHash, 'staff', '+919876543213', null, null);

  // Insert Schedules
  const insertSchedule = db.prepare(`
    INSERT INTO collection_schedules (id, society_id, waste_category, days_of_week, start_time, end_time, instructions)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  insertSchedule.run(
    'sch_' + uuidv4(),
    societyId,
    'WET_ORGANIC',
    JSON.stringify(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']),
    '08:00',
    '10:00',
    'Place green organic bins outside your flat door by 7:45 AM. Ensure no plastic wraps are mixed with food waste.'
  );

  insertSchedule.run(
    'sch_' + uuidv4(),
    societyId,
    'DRY_RECYCLABLE',
    JSON.stringify(['MON', 'WED', 'FRI']),
    '10:30',
    '12:30',
    'Clean paper, cardboard boxes (flattened), and dry plastic containers. Place in blue recycling bin.'
  );

  insertSchedule.run(
    'sch_' + uuidv4(),
    societyId,
    'E_WASTE_HAZARDOUS',
    JSON.stringify(['SAT']),
    '15:00',
    '17:00',
    'Drop batteries, expired medicines, and e-waste at the Central Clubhouse disposal point.'
  );

  // Insert initial realistic complaints
  const insertComplaint = db.prepare(`
    INSERT INTO complaints (
      id, society_id, reference_number, resident_id, category, description,
      wing, floor_location, photo_url, status, assigned_to_user_id,
      resolution_photo_url, resolution_notes, resolved_at, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertStatusHistory = db.prepare(`
    INSERT INTO status_history (id, complaint_id, from_status, to_status, changed_by_user_id, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  // Complaint 1: Overflowing bin (Pending)
  const cmp1Id = 'cmp_' + uuidv4();
  insertComplaint.run(
    cmp1Id, societyId, 'SC-20261028-0010', residentId,
    'OVERFLOWING_BIN',
    'The 4th floor chute bin is overflowing onto the floor. Heavy food waste accumulating.',
    'Wing B', 'Floor 4 Chute Area', null, 'PENDING', null, null, null, null,
    new Date(Date.now() - 3600000 * 3).toISOString()
  );
  insertStatusHistory.run(
    'sth_' + uuidv4(), cmp1Id, null, 'PENDING', residentId, 'Complaint submitted by resident',
    new Date(Date.now() - 3600000 * 3).toISOString()
  );

  // Complaint 2: Unclean room (In Progress)
  const cmp2Id = 'cmp_' + uuidv4();
  insertComplaint.run(
    cmp2Id, societyId, 'SC-20261028-0008', resident2Id,
    'UNCLEAN_ROOM',
    'Refuse collection lobby on Ground Floor has dark liquid stains and foul odour.',
    'Wing C', 'Ground Floor Refuse Room', null, 'IN_PROGRESS', staffId, null, null, null,
    new Date(Date.now() - 3600000 * 8).toISOString()
  );
  insertStatusHistory.run(
    'sth_' + uuidv4(), cmp2Id, null, 'PENDING', resident2Id, 'Complaint submitted by resident',
    new Date(Date.now() - 3600000 * 8).toISOString()
  );
  insertStatusHistory.run(
    'sth_' + uuidv4(), cmp2Id, 'PENDING', 'IN_PROGRESS', managerId, 'Assigned to Ramesh Kumar for deep cleaning',
    new Date(Date.now() - 3600000 * 6).toISOString()
  );

  // Complaint 3: Bad Odour (Resolved)
  const cmp3Id = 'cmp_' + uuidv4();
  insertComplaint.run(
    cmp3Id, societyId, 'SC-20261028-0001', residentId,
    'BAD_ODOUR',
    'Severe rotting smell near the Wing B elevator foyer.',
    'Wing B', 'Floor 2 Elevator Foyer', null, 'RESOLVED', staffId,
    null, 'Deodorized area with eco-disinfectant and replaced trash liner.',
    new Date(Date.now() - 3600000).toISOString(),
    new Date(Date.now() - 3600000 * 24).toISOString()
  );
  insertStatusHistory.run(
    'sth_' + uuidv4(), cmp3Id, null, 'PENDING', residentId, 'Complaint submitted',
    new Date(Date.now() - 3600000 * 24).toISOString()
  );
  insertStatusHistory.run(
    'sth_' + uuidv4(), cmp3Id, 'PENDING', 'IN_PROGRESS', managerId, 'Dispatched staff',
    new Date(Date.now() - 3600000 * 20).toISOString()
  );
  insertStatusHistory.run(
    'sth_' + uuidv4(), cmp3Id, 'IN_PROGRESS', 'RESOLVED', staffId, 'Cleaned and sanitized',
    new Date(Date.now() - 3600000).toISOString()
  );

  console.log('Database successfully seeded with demo accounts & records.');
  return societyId;
}

// If run directly
if (process.argv[1]?.endsWith('seed.js')) {
  const db = initDatabase();
  seedDatabase(db);
  db.close();
}
