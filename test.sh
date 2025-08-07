#!/bin/bash
npx shadow-cljs compile test
node target/test/test.js 