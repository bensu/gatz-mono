#!/bin/bash

git submodule update --init

cd vendor/shared
npx install-clojure
yarn install
npx shadow-cljs compile expo