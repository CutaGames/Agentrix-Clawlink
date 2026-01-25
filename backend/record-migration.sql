-- Record migration
INSERT INTO migrations (timestamp, name) 
VALUES (1774000000000, 'AddDeveloperRoleToEnum1774000000000')
ON CONFLICT DO NOTHING;
