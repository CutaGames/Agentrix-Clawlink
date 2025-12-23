#!/bin/bash
export PGPASSWORD=agentrix_secure_2024
psql -h localhost -U agentrix -d paymind -c "\dt"
