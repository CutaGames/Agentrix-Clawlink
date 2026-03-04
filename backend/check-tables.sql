-- 检查表结构
\d commission_settlements_v4

-- 检查batch_payments表中待处理的支付
SELECT id, payment_id, amount, status FROM batch_payments ORDER BY id DESC LIMIT 10;
