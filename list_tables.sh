#!/bin/bash
export PGPASSWORD=agentrix_secure_2024
psql -U agentrix -h 127.0.0.1 -d paymind -c "\dt"
