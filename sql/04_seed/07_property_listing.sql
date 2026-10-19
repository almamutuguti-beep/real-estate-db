-- sql/04_seed/07_property_listing.sql
-- 6 listings. Each agent_id must match the property's assigned_agent_id
-- (the trigger rejects anything else). Adjust ids to the Owner's seed file.
-- Assumed: properties 1-2 -> agent 1, 3-4 -> agent 2, 5 -> agent 3.
USE real_estate_db;

INSERT INTO property_listing (property_id, agent_id, description, listing_status, listed_date) VALUES
(1, 1, 'Bright 2 bedroom apartment in Kilimani with a balcony and parking.', 'Published', '2026-09-01'),
(2, 1, 'Compact studio in Westlands, close to shops and transport.',        'Draft',     '2026-09-10'),
(3, 2, 'Spacious townhouse in Lavington with a small garden.',               'Published', '2026-09-05'),
(4, 2, 'Quiet cottage in Karen, previously let.',                            'Closed',    '2026-08-15'),
(5, 3, 'One bedroom flat in Eastleigh near Currie Road.',                    'Published', '2026-09-20'),
(1, 1, 'Earlier listing for the Kilimani apartment.',                        'Closed',    '2026-06-01');
