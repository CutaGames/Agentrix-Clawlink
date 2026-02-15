-- Fix all camelCase columns to snake_case to match SnakeNamingStrategy
-- Auto-generated from production DB scan
-- Each ALTER runs independently; errors on already-renamed columns are harmless

-- commission_settlements
ALTER TABLE "commission_settlements" RENAME COLUMN "payeeId" TO "payee_id";
ALTER TABLE "commission_settlements" RENAME COLUMN "payeeType" TO "payee_type";
ALTER TABLE "commission_settlements" RENAME COLUMN "settlementDate" TO "settlement_date";
ALTER TABLE "commission_settlements" RENAME COLUMN "transactionHash" TO "transaction_hash";

-- commissions
ALTER TABLE "commissions" RENAME COLUMN "agentType" TO "agent_type";
ALTER TABLE "commissions" RENAME COLUMN "assetType" TO "asset_type";
ALTER TABLE "commissions" RENAME COLUMN "channelFee" TO "channel_fee";
ALTER TABLE "commissions" RENAME COLUMN "commissionBase" TO "commission_base";
ALTER TABLE "commissions" RENAME COLUMN "orderId" TO "order_id";
ALTER TABLE "commissions" RENAME COLUMN "sessionId" TO "session_id";
ALTER TABLE "commissions" RENAME COLUMN "settlementAvailableAt" TO "settlement_available_at";

-- conversation_histories
ALTER TABLE "conversation_histories" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "conversation_histories" RENAME COLUMN "customerId" TO "customer_id";
ALTER TABLE "conversation_histories" RENAME COLUMN "merchantId" TO "merchant_id";
ALTER TABLE "conversation_histories" RENAME COLUMN "updatedAt" TO "updated_at";

-- coupon_usages
ALTER TABLE "coupon_usages" RENAME COLUMN "couponId" TO "coupon_id";
ALTER TABLE "coupon_usages" RENAME COLUMN "discountAmount" TO "discount_amount";
ALTER TABLE "coupon_usages" RENAME COLUMN "finalAmount" TO "final_amount";
ALTER TABLE "coupon_usages" RENAME COLUMN "orderId" TO "order_id";
ALTER TABLE "coupon_usages" RENAME COLUMN "originalAmount" TO "original_amount";
ALTER TABLE "coupon_usages" RENAME COLUMN "usedAt" TO "used_at";
ALTER TABLE "coupon_usages" RENAME COLUMN "userId" TO "user_id";

-- coupons
ALTER TABLE "coupons" RENAME COLUMN "applicableCategories" TO "applicable_categories";
ALTER TABLE "coupons" RENAME COLUMN "applicableProducts" TO "applicable_products";
ALTER TABLE "coupons" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "coupons" RENAME COLUMN "maxDiscountAmount" TO "max_discount_amount";
ALTER TABLE "coupons" RENAME COLUMN "merchantId" TO "merchant_id";
ALTER TABLE "coupons" RENAME COLUMN "minPurchaseAmount" TO "min_purchase_amount";
ALTER TABLE "coupons" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "coupons" RENAME COLUMN "usageLimit" TO "usage_limit";
ALTER TABLE "coupons" RENAME COLUMN "usedCount" TO "used_count";
ALTER TABLE "coupons" RENAME COLUMN "validFrom" TO "valid_from";
ALTER TABLE "coupons" RENAME COLUMN "validUntil" TO "valid_until";

-- developer_accounts
ALTER TABLE "developer_accounts" RENAME COLUMN "statusReason" TO "status_reason";
ALTER TABLE "developer_accounts" RENAME COLUMN "statusUpdatedAt" TO "status_updated_at";

-- external_skill_mappings
ALTER TABLE "external_skill_mappings" RENAME COLUMN "agentrixMarkup" TO "agentrix_markup";
ALTER TABLE "external_skill_mappings" RENAME COLUMN "agentrixSkillId" TO "agentrix_skill_id";
ALTER TABLE "external_skill_mappings" RENAME COLUMN "callCount" TO "call_count";
ALTER TABLE "external_skill_mappings" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "external_skill_mappings" RENAME COLUMN "externalEndpoint" TO "external_endpoint";
ALTER TABLE "external_skill_mappings" RENAME COLUMN "externalId" TO "external_id";
ALTER TABLE "external_skill_mappings" RENAME COLUMN "externalName" TO "external_name";
ALTER TABLE "external_skill_mappings" RENAME COLUMN "externalPlatform" TO "external_platform";
ALTER TABLE "external_skill_mappings" RENAME COLUMN "lastSyncedAt" TO "last_synced_at";
ALTER TABLE "external_skill_mappings" RENAME COLUMN "originalSchema" TO "original_schema";
ALTER TABLE "external_skill_mappings" RENAME COLUMN "passthroughPricing" TO "passthrough_pricing";
ALTER TABLE "external_skill_mappings" RENAME COLUMN "proxyConfig" TO "proxy_config";
ALTER TABLE "external_skill_mappings" RENAME COLUMN "syncError" TO "sync_error";
ALTER TABLE "external_skill_mappings" RENAME COLUMN "syncStatus" TO "sync_status";
ALTER TABLE "external_skill_mappings" RENAME COLUMN "updatedAt" TO "updated_at";

-- fulfillment_records
ALTER TABLE "fulfillment_records" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "fulfillment_records" RENAME COLUMN "fulfilledAt" TO "fulfilled_at";
ALTER TABLE "fulfillment_records" RENAME COLUMN "merchantId" TO "merchant_id";
ALTER TABLE "fulfillment_records" RENAME COLUMN "orderId" TO "order_id";
ALTER TABLE "fulfillment_records" RENAME COLUMN "paymentId" TO "payment_id";
ALTER TABLE "fulfillment_records" RENAME COLUMN "trackingNumber" TO "tracking_number";
ALTER TABLE "fulfillment_records" RENAME COLUMN "updatedAt" TO "updated_at";

-- marketing_campaigns
ALTER TABLE "marketing_campaigns" RENAME COLUMN "couponId" TO "coupon_id";
ALTER TABLE "marketing_campaigns" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "marketing_campaigns" RENAME COLUMN "merchantId" TO "merchant_id";
ALTER TABLE "marketing_campaigns" RENAME COLUMN "scheduledAt" TO "scheduled_at";
ALTER TABLE "marketing_campaigns" RENAME COLUMN "sentAt" TO "sent_at";
ALTER TABLE "marketing_campaigns" RENAME COLUMN "targetUsers" TO "target_users";
ALTER TABLE "marketing_campaigns" RENAME COLUMN "updatedAt" TO "updated_at";

-- marketplace_assets
ALTER TABLE "marketplace_assets" RENAME COLUMN "change24hPercent" TO "change24h_percent";
ALTER TABLE "marketplace_assets" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "marketplace_assets" RENAME COLUMN "externalId" TO "external_id";
ALTER TABLE "marketplace_assets" RENAME COLUMN "imageUrl" TO "image_url";
ALTER TABLE "marketplace_assets" RENAME COLUMN "lastIngestedAt" TO "last_ingested_at";
ALTER TABLE "marketplace_assets" RENAME COLUMN "liquidityUsd" TO "liquidity_usd";
ALTER TABLE "marketplace_assets" RENAME COLUMN "priceUsd" TO "price_usd";
ALTER TABLE "marketplace_assets" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "marketplace_assets" RENAME COLUMN "volume24hUsd" TO "volume24h_usd";

-- merchant_profiles
ALTER TABLE "merchant_profiles" RENAME COLUMN "businessDescription" TO "business_description";
ALTER TABLE "merchant_profiles" RENAME COLUMN "businessInfo" TO "business_info";
ALTER TABLE "merchant_profiles" RENAME COLUMN "businessLicense" TO "business_license";
ALTER TABLE "merchant_profiles" RENAME COLUMN "businessName" TO "business_name";
ALTER TABLE "merchant_profiles" RENAME COLUMN "contactInfo" TO "contact_info";
ALTER TABLE "merchant_profiles" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "merchant_profiles" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "merchant_profiles" RENAME COLUMN "userId" TO "user_id";

-- merchant_referrals
ALTER TABLE "merchant_referrals" RENAME COLUMN "agentId" TO "agent_id";
ALTER TABLE "merchant_referrals" RENAME COLUMN "commissionRate" TO "commission_rate";
ALTER TABLE "merchant_referrals" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "merchant_referrals" RENAME COLUMN "merchantEmail" TO "merchant_email";
ALTER TABLE "merchant_referrals" RENAME COLUMN "merchantId" TO "merchant_id";
ALTER TABLE "merchant_referrals" RENAME COLUMN "merchantName" TO "merchant_name";
ALTER TABLE "merchant_referrals" RENAME COLUMN "oneTimeReward" TO "one_time_reward";
ALTER TABLE "merchant_referrals" RENAME COLUMN "oneTimeRewardPaidAt" TO "one_time_reward_paid_at";
ALTER TABLE "merchant_referrals" RENAME COLUMN "totalCommissionEarned" TO "total_commission_earned";
ALTER TABLE "merchant_referrals" RENAME COLUMN "totalMerchantGMV" TO "total_merchant_gmv";
ALTER TABLE "merchant_referrals" RENAME COLUMN "updatedAt" TO "updated_at";

-- merchant_tasks
ALTER TABLE "merchant_tasks" RENAME COLUMN "agentId" TO "agent_id";
ALTER TABLE "merchant_tasks" RENAME COLUMN "completedAt" TO "completed_at";
ALTER TABLE "merchant_tasks" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "merchant_tasks" RENAME COLUMN "merchantId" TO "merchant_id";
ALTER TABLE "merchant_tasks" RENAME COLUMN "orderId" TO "order_id";
ALTER TABLE "merchant_tasks" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "merchant_tasks" RENAME COLUMN "userId" TO "user_id";

-- mpc_wallets
ALTER TABLE "mpc_wallets" RENAME COLUMN "autoSplitAuthorized" TO "auto_split_authorized";
ALTER TABLE "mpc_wallets" RENAME COLUMN "autoSplitExpiresAt" TO "auto_split_expires_at";
ALTER TABLE "mpc_wallets" RENAME COLUMN "autoSplitMaxAmount" TO "auto_split_max_amount";
ALTER TABLE "mpc_wallets" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "mpc_wallets" RENAME COLUMN "encryptedShardB" TO "encrypted_shard_b";
ALTER TABLE "mpc_wallets" RENAME COLUMN "isActive" TO "is_active";
ALTER TABLE "mpc_wallets" RENAME COLUMN "merchantId" TO "merchant_id";
ALTER TABLE "mpc_wallets" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "mpc_wallets" RENAME COLUMN "walletAddress" TO "wallet_address";

-- nft_collections
ALTER TABLE "nft_collections" RENAME COLUMN "contractAddress" TO "contract_address";
ALTER TABLE "nft_collections" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "nft_collections" RENAME COLUMN "royaltyRecipients" TO "royalty_recipients";
ALTER TABLE "nft_collections" RENAME COLUMN "transactionHash" TO "transaction_hash";
ALTER TABLE "nft_collections" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "nft_collections" RENAME COLUMN "userId" TO "user_id";

-- nfts
ALTER TABLE "nfts" RENAME COLUMN "collectionId" TO "collection_id";
ALTER TABLE "nfts" RENAME COLUMN "contractAddress" TO "contract_address";
ALTER TABLE "nfts" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "nfts" RENAME COLUMN "metadataURI" TO "metadata_uri";
ALTER TABLE "nfts" RENAME COLUMN "productId" TO "product_id";
ALTER TABLE "nfts" RENAME COLUMN "salesHistory" TO "sales_history";
ALTER TABLE "nfts" RENAME COLUMN "tokenId" TO "token_id";
ALTER TABLE "nfts" RENAME COLUMN "transactionHash" TO "transaction_hash";
ALTER TABLE "nfts" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "nfts" RENAME COLUMN "userId" TO "user_id";

-- notifications
ALTER TABLE "notifications" RENAME COLUMN "actionUrl" TO "action_url";
ALTER TABLE "notifications" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "notifications" RENAME COLUMN "userId" TO "user_id";

-- orders (some may already be renamed by existing migration)
ALTER TABLE "orders" RENAME COLUMN "assetType" TO "asset_type";
ALTER TABLE "orders" RENAME COLUMN "autoConfirmedAt" TO "auto_confirmed_at";
ALTER TABLE "orders" RENAME COLUMN "execAgentId" TO "exec_agent_id";
ALTER TABLE "orders" RENAME COLUMN "executorHasWallet" TO "executor_has_wallet";
ALTER TABLE "orders" RENAME COLUMN "isDisputed" TO "is_disputed";
ALTER TABLE "orders" RENAME COLUMN "merchantNetAmount" TO "merchant_net_amount";
ALTER TABLE "orders" RENAME COLUMN "netRevenue" TO "net_revenue";
ALTER TABLE "orders" RENAME COLUMN "platformTax" TO "platform_tax";
ALTER TABLE "orders" RENAME COLUMN "platformTaxRate" TO "platform_tax_rate";
ALTER TABLE "orders" RENAME COLUMN "promoterId" TO "promoter_id";
ALTER TABLE "orders" RENAME COLUMN "refAgentId" TO "ref_agent_id";
ALTER TABLE "orders" RENAME COLUMN "settlementDueTime" TO "settlement_due_time";
ALTER TABLE "orders" RENAME COLUMN "settlementTimeline" TO "settlement_timeline";
ALTER TABLE "orders" RENAME COLUMN "settlementTriggerTime" TO "settlement_trigger_time";

-- pay_intents
ALTER TABLE "pay_intents" RENAME COLUMN "agentId" TO "agent_id";
ALTER TABLE "pay_intents" RENAME COLUMN "completedAt" TO "completed_at";
ALTER TABLE "pay_intents" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "pay_intents" RENAME COLUMN "expiresAt" TO "expires_at";
ALTER TABLE "pay_intents" RENAME COLUMN "idempotencyKey" TO "idempotency_key";
ALTER TABLE "pay_intents" RENAME COLUMN "merchantId" TO "merchant_id";
ALTER TABLE "pay_intents" RENAME COLUMN "orderId" TO "order_id";
ALTER TABLE "pay_intents" RENAME COLUMN "paymentId" TO "payment_id";
ALTER TABLE "pay_intents" RENAME COLUMN "paymentMethod" TO "payment_method";
ALTER TABLE "pay_intents" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "pay_intents" RENAME COLUMN "userId" TO "user_id";

-- payments
ALTER TABLE "payments" RENAME COLUMN "agentId" TO "agent_id";
ALTER TABLE "payments" RENAME COLUMN "channelFee" TO "channel_fee";
ALTER TABLE "payments" RENAME COLUMN "commissionRate" TO "commission_rate";
ALTER TABLE "payments" RENAME COLUMN "countryCode" TO "country_code";
ALTER TABLE "payments" RENAME COLUMN "merchantId" TO "merchant_id";
ALTER TABLE "payments" RENAME COLUMN "sessionId" TO "session_id";
ALTER TABLE "payments" RENAME COLUMN "taxAmount" TO "tax_amount";
ALTER TABLE "payments" RENAME COLUMN "taxRate" TO "tax_rate";
ALTER TABLE "payments" RENAME COLUMN "transactionHash" TO "transaction_hash";

-- product_country_prices
ALTER TABLE "product_country_prices" RENAME COLUMN "countryCode" TO "country_code";
ALTER TABLE "product_country_prices" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "product_country_prices" RENAME COLUMN "productId" TO "product_id";
ALTER TABLE "product_country_prices" RENAME COLUMN "taxIncluded" TO "tax_included";
ALTER TABLE "product_country_prices" RENAME COLUMN "taxRate" TO "tax_rate";
ALTER TABLE "product_country_prices" RENAME COLUMN "updatedAt" TO "updated_at";

-- product_prices
ALTER TABLE "product_prices" RENAME COLUMN "baseCurrency" TO "base_currency";
ALTER TABLE "product_prices" RENAME COLUMN "basePrice" TO "base_price";
ALTER TABLE "product_prices" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "product_prices" RENAME COLUMN "productId" TO "product_id";
ALTER TABLE "product_prices" RENAME COLUMN "taxIncluded" TO "tax_included";
ALTER TABLE "product_prices" RENAME COLUMN "updatedAt" TO "updated_at";

-- product_region_prices
ALTER TABLE "product_region_prices" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "product_region_prices" RENAME COLUMN "productId" TO "product_id";
ALTER TABLE "product_region_prices" RENAME COLUMN "regionCode" TO "region_code";
ALTER TABLE "product_region_prices" RENAME COLUMN "taxIncluded" TO "tax_included";
ALTER TABLE "product_region_prices" RENAME COLUMN "taxRate" TO "tax_rate";
ALTER TABLE "product_region_prices" RENAME COLUMN "updatedAt" TO "updated_at";

-- product_reviews
ALTER TABLE "product_reviews" RENAME COLUMN "autoReviewResult" TO "auto_review_result";
ALTER TABLE "product_reviews" RENAME COLUMN "productSnapshot" TO "product_snapshot";
ALTER TABLE "product_reviews" RENAME COLUMN "rejectionReason" TO "rejection_reason";
ALTER TABLE "product_reviews" RENAME COLUMN "reviewComment" TO "review_comment";
ALTER TABLE "product_reviews" RENAME COLUMN "revisionFields" TO "revision_fields";

-- product_skill_conversions
ALTER TABLE "product_skill_conversions" RENAME COLUMN "conversionConfig" TO "conversion_config";
ALTER TABLE "product_skill_conversions" RENAME COLUMN "conversionError" TO "conversion_error";
ALTER TABLE "product_skill_conversions" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "product_skill_conversions" RENAME COLUMN "generatedDescription" TO "generated_description";
ALTER TABLE "product_skill_conversions" RENAME COLUMN "generatedInputSchema" TO "generated_input_schema";
ALTER TABLE "product_skill_conversions" RENAME COLUMN "generatedOutputSchema" TO "generated_output_schema";
ALTER TABLE "product_skill_conversions" RENAME COLUMN "lastConvertedAt" TO "last_converted_at";
ALTER TABLE "product_skill_conversions" RENAME COLUMN "productId" TO "product_id";
ALTER TABLE "product_skill_conversions" RENAME COLUMN "productLastUpdatedAt" TO "product_last_updated_at";
ALTER TABLE "product_skill_conversions" RENAME COLUMN "skillId" TO "skill_id";
ALTER TABLE "product_skill_conversions" RENAME COLUMN "updatedAt" TO "updated_at";

-- quick_pay_grants
ALTER TABLE "quick_pay_grants" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "quick_pay_grants" RENAME COLUMN "expiresAt" TO "expires_at";
ALTER TABLE "quick_pay_grants" RENAME COLUMN "paymentMethod" TO "payment_method";
ALTER TABLE "quick_pay_grants" RENAME COLUMN "revokedAt" TO "revoked_at";
ALTER TABLE "quick_pay_grants" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "quick_pay_grants" RENAME COLUMN "userId" TO "user_id";

-- reconciliation_records
ALTER TABLE "reconciliation_records" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "reconciliation_records" RENAME COLUMN "matchedCount" TO "matched_count";
ALTER TABLE "reconciliation_records" RENAME COLUMN "merchantId" TO "merchant_id";
ALTER TABLE "reconciliation_records" RENAME COLUMN "totalAmount" TO "total_amount";
ALTER TABLE "reconciliation_records" RENAME COLUMN "totalCount" TO "total_count";
ALTER TABLE "reconciliation_records" RENAME COLUMN "unmatchedCount" TO "unmatched_count";

-- redemption_records
ALTER TABLE "redemption_records" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "redemption_records" RENAME COLUMN "merchantId" TO "merchant_id";
ALTER TABLE "redemption_records" RENAME COLUMN "orderId" TO "order_id";
ALTER TABLE "redemption_records" RENAME COLUMN "paymentId" TO "payment_id";
ALTER TABLE "redemption_records" RENAME COLUMN "redeemedAt" TO "redeemed_at";

-- referral_commissions
ALTER TABLE "referral_commissions" RENAME COLUMN "agentId" TO "agent_id";
ALTER TABLE "referral_commissions" RENAME COLUMN "commissionAmount" TO "commission_amount";
ALTER TABLE "referral_commissions" RENAME COLUMN "commissionRate" TO "commission_rate";
ALTER TABLE "referral_commissions" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "referral_commissions" RENAME COLUMN "merchantId" TO "merchant_id";
ALTER TABLE "referral_commissions" RENAME COLUMN "paymentAmount" TO "payment_amount";
ALTER TABLE "referral_commissions" RENAME COLUMN "paymentId" TO "payment_id";
ALTER TABLE "referral_commissions" RENAME COLUMN "referralId" TO "referral_id";
ALTER TABLE "referral_commissions" RENAME COLUMN "settledAt" TO "settled_at";
ALTER TABLE "referral_commissions" RENAME COLUMN "settlementPeriod" TO "settlement_period";
ALTER TABLE "referral_commissions" RENAME COLUMN "updatedAt" TO "updated_at";

-- referral_links
ALTER TABLE "referral_links" RENAME COLUMN "agentId" TO "agent_id";
ALTER TABLE "referral_links" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "referral_links" RENAME COLUMN "merchantId" TO "merchant_id";
ALTER TABLE "referral_links" RENAME COLUMN "shortLink" TO "short_link";

-- risk_assessments
ALTER TABLE "risk_assessments" RENAME COLUMN "riskLevel" TO "risk_level";

-- settlement_records
ALTER TABLE "settlement_records" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "settlement_records" RENAME COLUMN "merchantId" TO "merchant_id";
ALTER TABLE "settlement_records" RENAME COLUMN "settledAt" TO "settled_at";
ALTER TABLE "settlement_records" RENAME COLUMN "transactionHash" TO "transaction_hash";

-- skill_analytics
ALTER TABLE "skill_analytics" RENAME COLUMN "callerId" TO "caller_id";
ALTER TABLE "skill_analytics" RENAME COLUMN "callerType" TO "caller_type";
ALTER TABLE "skill_analytics" RENAME COLUMN "commissionAmount" TO "commission_amount";
ALTER TABLE "skill_analytics" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "skill_analytics" RENAME COLUMN "errorMessage" TO "error_message";
ALTER TABLE "skill_analytics" RENAME COLUMN "executionTimeMs" TO "execution_time_ms";
ALTER TABLE "skill_analytics" RENAME COLUMN "inputParams" TO "input_params";
ALTER TABLE "skill_analytics" RENAME COLUMN "orderId" TO "order_id";
ALTER TABLE "skill_analytics" RENAME COLUMN "revenueGenerated" TO "revenue_generated";
ALTER TABLE "skill_analytics" RENAME COLUMN "sessionId" TO "session_id";
ALTER TABLE "skill_analytics" RENAME COLUMN "skillId" TO "skill_id";
ALTER TABLE "skill_analytics" RENAME COLUMN "userAgent" TO "user_agent";
ALTER TABLE "skill_analytics" RENAME COLUMN "userIpHash" TO "user_ip_hash";

-- strategy_configs
ALTER TABLE "strategy_configs" RENAME COLUMN "agentId" TO "agent_id";
ALTER TABLE "strategy_configs" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "strategy_configs" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "strategy_configs" RENAME COLUMN "userId" TO "user_id";

-- subscriptions
ALTER TABLE "subscriptions" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "subscriptions" RENAME COLUMN "merchantId" TO "merchant_id";
ALTER TABLE "subscriptions" RENAME COLUMN "nextBillingDate" TO "next_billing_date";
ALTER TABLE "subscriptions" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "subscriptions" RENAME COLUMN "userId" TO "user_id";

-- tax_rates
ALTER TABLE "tax_rates" RENAME COLUMN "countryCode" TO "country_code";
ALTER TABLE "tax_rates" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "tax_rates" RENAME COLUMN "effectiveDate" TO "effective_date";
ALTER TABLE "tax_rates" RENAME COLUMN "endDate" TO "end_date";
ALTER TABLE "tax_rates" RENAME COLUMN "regionCode" TO "region_code";
ALTER TABLE "tax_rates" RENAME COLUMN "taxType" TO "tax_type";
ALTER TABLE "tax_rates" RENAME COLUMN "updatedAt" TO "updated_at";

-- tokens
ALTER TABLE "tokens" RENAME COLUMN "contractAddress" TO "contract_address";
ALTER TABLE "tokens" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "tokens" RENAME COLUMN "productId" TO "product_id";
ALTER TABLE "tokens" RENAME COLUMN "publicSale" TO "public_sale";
ALTER TABLE "tokens" RENAME COLUMN "totalSupply" TO "total_supply";
ALTER TABLE "tokens" RENAME COLUMN "transactionHash" TO "transaction_hash";
ALTER TABLE "tokens" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "tokens" RENAME COLUMN "userId" TO "user_id";

-- user_installed_skills
ALTER TABLE "user_installed_skills" RENAME COLUMN "installedAt" TO "installed_at";
ALTER TABLE "user_installed_skills" RENAME COLUMN "isEnabled" TO "is_enabled";
ALTER TABLE "user_installed_skills" RENAME COLUMN "skillId" TO "skill_id";
ALTER TABLE "user_installed_skills" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "user_installed_skills" RENAME COLUMN "userId" TO "user_id";

-- user_profiles
ALTER TABLE "user_profiles" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "user_profiles" RENAME COLUMN "updatedAt" TO "updated_at";
ALTER TABLE "user_profiles" RENAME COLUMN "userId" TO "user_id";

-- webhook_configs
ALTER TABLE "webhook_configs" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "webhook_configs" RENAME COLUMN "merchantId" TO "merchant_id";
ALTER TABLE "webhook_configs" RENAME COLUMN "retryCount" TO "retry_count";
ALTER TABLE "webhook_configs" RENAME COLUMN "updatedAt" TO "updated_at";

-- withdrawals
ALTER TABLE "withdrawals" RENAME COLUMN "agentrixFee" TO "agentrix_fee";
ALTER TABLE "withdrawals" RENAME COLUMN "bankAccount" TO "bank_account";
ALTER TABLE "withdrawals" RENAME COLUMN "createdAt" TO "created_at";
ALTER TABLE "withdrawals" RENAME COLUMN "exchangeRate" TO "exchange_rate";
ALTER TABLE "withdrawals" RENAME COLUMN "failureReason" TO "failure_reason";
ALTER TABLE "withdrawals" RENAME COLUMN "finalAmount" TO "final_amount";
ALTER TABLE "withdrawals" RENAME COLUMN "fromCurrency" TO "from_currency";
ALTER TABLE "withdrawals" RENAME COLUMN "merchantId" TO "merchant_id";
ALTER TABLE "withdrawals" RENAME COLUMN "providerFee" TO "provider_fee";
ALTER TABLE "withdrawals" RENAME COLUMN "providerId" TO "provider_id";
ALTER TABLE "withdrawals" RENAME COLUMN "providerTransactionId" TO "provider_transaction_id";
ALTER TABLE "withdrawals" RENAME COLUMN "toCurrency" TO "to_currency";
ALTER TABLE "withdrawals" RENAME COLUMN "transactionHash" TO "transaction_hash";
ALTER TABLE "withdrawals" RENAME COLUMN "updatedAt" TO "updated_at";

-- Done
