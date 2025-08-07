#!/bin/bash
source .env.production # this is not working

cd vendor/shared
npx shadow-cljs compile expo
cd ../../

NODE_ENV=production yarn expo export -p web
