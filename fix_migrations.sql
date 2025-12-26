DELETE FROM migrations WHERE name IN (
    'CreateFundPathsTable1734451200000',
    'CreateProductReviewsTable1765000000200',
    'CreateEcommerceConnectionsTable1765000000201',
    'AddReviewFieldsToProduct1765500646878',
    'CreateMerchantProfile1765538849744',
    'FixMissingSchema1765538849745',
    'ChangeProductStatusToText1765538849746',
    'CreateAdminTables1769000000000',
    'AddGoogleIdToUsers1770000000000',
    'AddPaymindIdToUsers1771000000000',
    'AddAppleIdAndTwitterIdToUsers1771100000000',
    'CreateCommissionSettlementTables1772000000000'
);
INSERT INTO migrations (timestamp, name) VALUES (1734451200000, 'CreateFundPathsTable1734451200000');
INSERT INTO migrations (timestamp, name) VALUES (1765000000200, 'CreateProductReviewsTable1765000000200');
INSERT INTO migrations (timestamp, name) VALUES (1765000000201, 'CreateEcommerceConnectionsTable1765000000201');
INSERT INTO migrations (timestamp, name) VALUES (1765500646878, 'AddReviewFieldsToProduct1765500646878');
INSERT INTO migrations (timestamp, name) VALUES (1765538849744, 'CreateMerchantProfile1765538849744');
INSERT INTO migrations (timestamp, name) VALUES (1765538849745, 'FixMissingSchema1765538849745');
INSERT INTO migrations (timestamp, name) VALUES (1765538849746, 'ChangeProductStatusToText1765538849746');
INSERT INTO migrations (timestamp, name) VALUES (1769000000000, 'CreateAdminTables1769000000000');
INSERT INTO migrations (timestamp, name) VALUES (1770000000000, 'AddGoogleIdToUsers1770000000000');
INSERT INTO migrations (timestamp, name) VALUES (1771000000000, 'AddPaymindIdToUsers1771000000000');
INSERT INTO migrations (timestamp, name) VALUES (1771100000000, 'AddAppleIdAndTwitterIdToUsers1771100000000');
INSERT INTO migrations (timestamp, name) VALUES (1772000000000, 'CreateCommissionSettlementTables1772000000000');
