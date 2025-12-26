SELECT COUNT(*) as total, 
       COUNT(CASE WHEN "isDefault" = true THEN 1 END) as default_wallets 
FROM wallet_connections;
