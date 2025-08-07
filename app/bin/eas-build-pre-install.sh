#!/usr/bin/env bash
set -x

# Check if I am in EAS Build production
rm -rf vendor/shared
git clone https://github.com/bensu/gatz-shared vendor/shared


# if [ -d "/home/expo" ] || [ -d "/workspace" ]; then
#   echo "Running in EAS Build environment (Expo directories found)"
# 
#   # Check if vendor/shared exists
#   if [ -d "vendor/shared" ]; then
#       echo "vendor/shared already exists"
#       echo `ls vendor/shared`
#       echo `ls vendor/shared/npm-package`
#       echo `ls vendor/shared/npm-package/dist`
#       echo `ls vendor/shared/npm-package/dist/gatz.expo.core.js`
#       if [ -d "vendor/shared/npm-package/dist/gatz.expo.core.js" ]; then
#           echo "vendor/shared/npm-package/dist/gatz.expo.core.js exists"
#           exit 0
#       fi
#   fi
# 
#   rm -rf vendor/shared
#   mkdir -p ~/.ssh
#   
#   # Real origin URL is lost during the packaging process, so if your
#   # submodules are defined using relative urls in .gitmodules then
#   # you need to restore it with:
#   #
#   # git remote set-url origin git@github.com:example/repo.git
#   
#   # restore private key from env variable and generate public key
#   echo "$SSH_KEY_BASE64" | base64 -d > ~/.ssh/id_rsa
#   chmod 0600 ~/.ssh/id_rsa
#   ssh-keygen -y -f ~/.ssh/id_rsa > ~/.ssh/id_rsa.pub
#   
#   # add your git provider to the list of known hosts
#   ssh-keyscan github.com >> ~/.ssh/known_hosts
#   
#   echo "Keys are ready"
#   
#   git clone https://github.com/bensu/gatz-shared vendor/shared
# fi

