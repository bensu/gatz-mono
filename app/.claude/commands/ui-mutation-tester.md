You are an expert in TypeScript, React, jest, Stryke, and testing React components. Given a file with React components, you set up mutation testing to ensure that the code is thoroughly tested.

Mutation testing is when one randomly changes parts of the codebase to see if the tests catch the changes. For example, if we were to make the following change, we should expect at least one of the tests to fail:

```diff
- if (critical_condition) return special_value
+ if (false) return special_value
```

If we make the change, run the tests, and see no failures, then we know we forgot to test the `critical_condition` code path.

Stryker is a tool that generates those changes (called "mutations"), applies them, runs the tests, and tells us which mutations didn't generate any test failures. We say those mutations "survived".

Your goal is to find mutations that survived and then add the missing tests to make sure that those mutations are caught.

You almost never change the business logic itself, except for:

- mark certain functions or values safe for export
- add test ids to React components

We have a series of steps for you to follow. Each step consists of two prompts:

- action-prompt: executes the step
- check-prompt: helps you check if the action-prompt succeeded

Execute each of the action-prompts separately and then check your work with the corresponding check-prompt. If the check-prompt fails but you see a clear way to fix it, then make a fix plan and execute that.

<mark-stryker-ranges>
<action-prompt>
Add Stryker mutation testing regions to focus testing only on critical code paths

Context on Stryker comments:

Stryker region comments can disable all mutations by default and selectively enable specific ranges:

// Stryker disable all
function example() {
  const setup = initializeApp(); // No mutations here
  
  // Stryker restore all
  const result = criticalLogic(input); // Mutations enabled
  // Stryker disable all
  
  return result;
}

Context on invariant slugs:

Files in this codebase are peppered with slugs of the form `[slug-invariant]` that indicate which lines of code are covering important logic that needs to be tested. For example:

{/* [truncation-gradient] */}
{isTruncated && <FadeGradient colors={colors} />}

// [null-safety-guard]
if (!currentMessage || !currentMessage.text) {
  return null;
}

Task: Add `// Stryker disable all` at the top of the relevant file, then use `// Stryker restore all` and `// Stryker disable all` blocks to enable mutation testing ONLY for expressions marked with function property/invariant slugs.

Examples:

// Stryker disable all
const logger = new Logger('utils');
// Stryker restore all
// [path-structure-preserved] 
const path = extractPath(url, urlType);
// Stryker disable all

{/* Stryker disable all */}
<div className="wrapper">
  {/* Stryker restore all */}
  {/* [username-prefix-conditional] */}
  {postOpts.isPost ? null : renderUsername()}
  {/* Stryker disable all */}
</div>

Guidelines:

- Don't change the existing code, you should only be adding comments.
- It is fine if the Stryker comments cover a little more than the target expression, it doesn't have to be perfectly precise.
</action-prompt>

<check-prompt>
Check if you can answer YES to the following questions:

1. Did you find the spots in the codebase for each of the slugs?
2. Did you add the appropriate Stryker annotations?

No need to read the files themselves, you can check by looking at your own output in the context.

If you are missing any slugs, repeat the last step, <mark-stryker-ranges:action-prompt>, on the slugs that you are missing.
</check-prompt>
</mark-stryker-ranges>

<run-stryker>
<action-prompt>
Now that the file is properly annotated run Stryker. You need to do two steps:


Make a new file, stryker.focused.js with the following contents:

```js
// @ts-check
/**
* @type {import('@stryker-mutator/api/core').PartialStrykerOptions}
*/
module.exports = {
  disableTypeChecks: 'src/**/*.{ts,tsx,js,jsx}',
  babel: {
    optionsFile: 'babel.config.js'
  },
  jest: {
    configFile: 'jest.config.js',
    config: {
        testMatch: ['**/TEST_FILE'] // replace with the relative path to TEST_FILE here
      }
  },
  reporters: ['clear-text', 'progress'],
  clearTextReporter: {
    allowColor: false
  },
  mutate: [
    COMPONENT_FILE, // replace with the relative path to COMPONENT_FILE
  ],
};
```

And then run the tool pointed at that file:

```sh
npx stryker run striker.focused.js > reports/mutation/stryker-before-changes.txt
```

This will save the output to a file that you can read in the next step.
</action-prompt>

<check-prompt>
Check if you can answer YES to the following questions:

1. Did you create the Stryker config file?
2. Did you call the tool?
3. Did the tool terminate?
</check-prompt>
</run-stryker>

<check-stryker-output>
<action-prompt>
We have the test output of Stryker in reports/mutation/stryker.txt which will contain a number of mutations that survived in this format:

[Survived] LogicalOperator
src/gifted/Bubble.tsx:423:9
-       if (showFull && !hasMedia) {
+       if (showFull || !hasMedia) {

Make a TODO list of the all the mutations that survived. For each of them, identify the slug invariant that is most closely related to that code. If there is none, create a new slug with the format [important-slug] and document it in the function's description like the other ones are documented.

When you are done with that make a TODO list of the slugs that you found and created.

1. The existing invariants that weren't properly tested whose mutations survived
2. The missing invariants that you created.

Guideline:

- Don't change any code, only find the corresponding slugs or create missing ones.
</action-prompt>

<check-prompt>
Check if you can answer YES to the following questions:

1. Did you go through all the Stryker mutations?
2. Did you match each Stryker mutation to a slug or created a missing one?
3. For new slugs you created, did you document them near the function signature?
</check-prompt>
</check-stryker-output>

<describe-tests-for-missing-slugs>
<action-prompt>
For the new slugs that don't have a corresponding test, do the following:

1. Go through each of those slugs and write in the TEST_FILE a test description what needs to be tested in order to check that the Stryker mutation is detected when this test runs. 
2. Prepend each of the test descriptions which the slug of the property or invariant that the test is tracking.

Do this with test descriptions in comments, no need to write code yet.
</action-prompt>

<check-prompt>
Check if you can answer YES to the following questions:

1. Did you cover all the new slugs?
2. Did you write comments for them in TEST_FILE?
</check-prompt>
</describe-tests-for-missing-slugs>

<describe-tests-for-existing-slugs>
<action-prompt>
For the existing slugs that survived and are missing some tests:

Go through each of those slugs and write in the TEST_FILE a test description of what needs to be tested in order to check that the Stryker mutation is detected when this test runs. Do this close to where that slug is already tested.

Do this with test descriptions in comments, no need to write code yet.
</action-prompt>
<check-prompt>
Check if you can answer YES to the following questions:

1. Did you cover all the missing slugs?
2. Did you write comments for them in TEST_FILE?
3. Are the comments near the place the slugs are already tested?
</check-prompt>
</describe-tests-for-existing-slugs>

<write-each-test>
<action-prompt>
For each of the test descriptions in TEST_FILE, write the accompanying tests. Include the slug of the property or invariant that it is testing in the tests description.

After writing each test, run it and see if it is working properly with:

yarn test TEST_FILE -- -t "name of the test" 

Fix that test before you move into the next one.

Repeat this action-prompt for each of the unit tests descriptions.

You can now write TypeScript logic for the tests in TEST_FILE but avoid writing in the COMPONENT_FILE, except possibly to `export` functions that need to be exported.
</action-prompt>

<check-prompt>
Check if you can answer YES to the following questions:

1. Did you write tests for each of the items described by the test plan?
2. Did the tests pass?

If you are missing any parts of the test plan, repeat the last step, <write-each-test:action-prompt>, on the parts that you are missing.
</check-prompt>
</write-each-test>

<rerun-stryker>
<action-prompt>
Now that we've made changes, we are going to re-run Stryker to see if we've tested the code more thoroughly.

Re-use stryker.focused.js

And then run the tool, with a new output file:

```sh
npx stryker run striker.focused.js > reports/mutation/stryker-after-changes.txt
```

This will save the output to a file that you can read in the next step.
</action-prompt>

<check-prompt>
Check if you can answer YES to the following questions:

1. Did you create the Stryker config file?
2. Did you call the tool?
3. Did the tool terminate?
</check-prompt>
</rerun-stryker>

Guidelines:

- If you fail with the check-prompt multiple times, then stop and ask the user for help.
- The user will give you a TEST_FILE and a COMPONENT_FILE. Try to only keep your work to those two.

If it is ever not clear what to do next or what a command means, first re-read this file, `.claude/commands/ui-mutation-tester.md`. If that doesn't work, ask the user for help.

When you first get started ask the user for the TEST_FILE and COMPONENT_FILE they want you to work on.