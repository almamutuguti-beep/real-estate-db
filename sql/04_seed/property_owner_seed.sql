-- insert property owners(assumes user_account exists)
INSERT INTO property_owner (user_id, company_name, phone, email)
VALUES
((SELECT user_id FROM user_account WHERE username = 'owner1'), 'Dream Homes LLC', '0712345678', 'info@dreamhomes.com'),
((SELECT user_id FROM user_account WHERE username = 'owner2'), 'Urban Living Inc.', '0723456789', 'info@urbanliving.com'),
((SELECT user_id FROM user_account WHERE username = 'owner3'), 'Cozy Nest Properties', '0734567890', 'info@cozynest.com'),
((SELECT user_id FROM user_account WHERE username = 'owner4'), 'Luxury Estates Ltd.', '0745678901', 'info@luxuryestates.com');

-- insert properties
INSERT INTO property (property_owner_id, address, property_type, bedrooms, bathrooms, monthly_rent, status)
VALUES
((SELECT property_owner_id FROM property_owner WHERE company_name = 'Dream Homes LLC'), '123 Main Street, Nairobi', 'Apartment', 2, 1, 1200.00, 'Available'),
((SELECT property_owner_id FROM property_owner WHERE company_name = 'Dream Homes LLC'), '456 Oak Avenue, Nairobi', 'House', 3, 2, 1800.00, 'Rented'),
((SELECT property_owner_id FROM property_owner WHERE company_name = 'Urban Living Inc.'), '789 Pine Road, Nairobi', 'Studio', 1, 1, 900.00, 'Available'),
((SELECT property_owner_id FROM property_owner WHERE company_name = 'Urban Living Inc.'), '321 Elm Drive, Nairobi', 'Apartment', 2, 1, 1300.00, 'Rented'),
((SELECT property_owner_id FROM property_owner WHERE company_name = 'Cozy Nest Properties'), '654 Maple Drive, Nairobi', 'House', 4, 3, 2500.00, 'Available'),
((SELECT property_owner_id FROM property_owner WHERE company_name = 'Cozy Nest Properties'), '987 Cedar Avenue, Nairobi', 'Penthouse', 2, 2, 1500.00, 'Removed'),
((SELECT property_owner_id FROM property_owner WHERE company_name = 'Luxury Estates Ltd.'), '111 Birch Road, Nairobi', 'Studio', 1, 1, 800.00, 'Available'),
((SELECT property_owner_id FROM property_owner WHERE company_name = 'Luxury Estates Ltd.'), '222 Spruce Street, Nairobi', 'House', 3, 2, 2000.00, 'Rented');

UPDATE property_owner
SET db_user = 'root'
WHERE property_owner_id = (
SELECT property_owner_id FROM( SELECT property_owner_id FROM property_owner WHERE company_name = 'Dream Homes LLC'
) AS t
);