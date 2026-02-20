#!/bin/bash
export GOOGLE_API_KEY=AIzaSyDH6jHpd857EaxTXbFJaqXT4EgDxMib428
# Using scp and ssh directly from the WSL environment
scp -i ~/.ssh/hq.pem -o StrictHostKeyChecking=no fix_503.sh ubuntu@18.139.157.116:~/fix_503.sh
ssh -i ~/.ssh/hq.pem -o StrictHostKeyChecking=no ubuntu@18.139.157.116 'chmod +x ~/fix_503.sh; ~/fix_503.sh'
