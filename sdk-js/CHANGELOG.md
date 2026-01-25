# Changelog

All notable changes to the Agentrix JavaScript/TypeScript SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.2.0] - 2025-01-XX

### Added
- Initial release of Agentrix JavaScript/TypeScript SDK
- Payment resource with full CRUD operations
- Agent resource for AI Agent integrations
- Merchant resource for product and order management
- Webhook handler with signature verification
- Complete TypeScript type definitions
- Error handling with custom error classes
- Request retry mechanism with exponential backoff
- Comprehensive documentation and examples

### Features
- **Payment Operations**
  - Create, get, cancel payments
  - Get payment routing recommendations
  - Create payment intents
  - Process payments
  - List payment history

- **AI Agent Operations**
  - Create and manage auto-pay grants
  - Get agent earnings and commissions
  - Create agent payments
  - Confirm agent payments

- **Merchant Operations**
  - Product CRUD operations
  - Order management
  - Product listing and search

- **Webhook Handling**
  - Secure webhook signature verification
  - Event parsing and handling
  - Express.js integration support

### Documentation
- Complete README with usage examples
- 4 Node.js examples
- 1 browser example
- Type definitions for all resources

