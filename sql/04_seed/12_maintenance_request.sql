USE real_estate_db;

INSERT INTO maintenance_request
  (property_id, tenant_id, assigned_to, description, status, completed_at) VALUES
  (1, 1, NULL, 'Leaking kitchen tap', 'Open', NULL),
  (2,2, NULL, 'Broken window latch in master bedroom', 'Open', NULL),
  (3,3,1, 'Blocked bathroom drain', 'Assigned', NULL),
  (4,4,2, 'Faulty socket in living room', 'In Progress', NULL),
  (5,5,3, 'Front door lock needed replacing', 'Complete', '2026-10-10 15:35:00');
  