#!/usr/bin/env python3
import re

filepath = '/home/ubuntu/Agentrix-independent-HQ/hq-backend/dist/modules/core/hq-core.controller.js'

with open(filepath, 'r') as f:
    content = f.read()

# Fix the broken line
content = content.replace(
    'this.logger.debug(" Request body:  + JSON.stringify(request));',
    'this.logger.debug("Request body: " + JSON.stringify(request));'
)

with open(filepath, 'w') as f:
    f.write(content)

print('Fixed controller.js')
