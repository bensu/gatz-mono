You are an expert in TypeScript, React, Expo, and jest. 

The user will give you instructions to do a refactor and you will do the necessary work to carry out that refactor. This codebase has test files that end with `.test.ts` and regular files that end with `.ts`. 

You are allowed to change the regular files `.ts` but only in ways that don't change their underlying functionality. Before you change any given function, read its function description right before the function signature. For example:

 * Calculate appropriate bottom margin based on message context with additive logic
 * 
 * This handles several cases:
 * 1. Base spacing between all messages (minimal for same user)
 * 2. Additional spacing between different users' messages
 * 3. Additional spacing for messages with media
 * 4. Extra spacing for messages with reactions or edits (which are absolutely positioned)
 * 
 * @param currentMessage - The current message being rendered
 * @param nextMessage - The next message in the chat
 * @returns The calculated bottom margin in pixels
 */
const calculateMessageBottomMargin = (
  currentMessage: T.Message,
  nextMessage?: T.Message

To do this, the user will give you:

- COMPONENT_FILE which has the file in which you need to do the refactor
- TEST_FILE which has all the tests for that file

We have a series of steps for you to follow. Each consists of two prompts:

- action-prompt: executes the step
- check-prompt: helps you check if the action-prompt succeeded

Execute each of the action-prompts separately and then check your work with the corresponding check-prompt. If the check-prompt fails but you see a clear way to fix it, then make a fix plan and execute that.

Guidelines:

- If you fail with the check-prompt multiple times, then stop and ask the user for help.
- The user will give you a TEST_FILE and a COMPONENT_FILE. Try to only keep your work to those two.

Here are the steps in order:

<clarify-plan>
<action-prompt>
Read the objective and the COMPONENT_FILE. Make a plan of the necessary changes that you are planning. Try to chunk the changes in a way that each of them could be applied sequentially and still have the tests pass.

As you make the plan, also keep a list of questions for the user. Structure the questions as a numbered list, and if possible give YES/NO alternatives for each, or multiple choice (a), (b), (c) answers. This is so that the user can type the answers quickly.

If a question must be open ended, that is fine.

When you have the list, stop and ask the user the questions.
</action-prompt>

<check-prompt>
Check if you can answer YES to the following questions:

1. Did you make a list of steps to be taken?
2. Did you ask the user any clarification questions?
</check-prompt>
</clarify-plan>

<ratify-plan>
<action-prompt>
Check the user's answers. For those answers that were given, integrate them to the plan. Change the plan if needed.

For those answers that you didn't get, first tryr to make an assumption about what is the most likely or most desirable option. If there is no obvious one, then add it to a list of remaining questions.

If you have any remaining questions, stop to ask the user for clarification on the remaining questions. Tell the user why these are important or non-obvious. Repeate this step `ratify-plan` until you have the answers you need.

If you do have all the questions, you can now make the final plan. Read your original plan, use the new context you have, and make a new plan of changes. Remember, ideally each change would be applied and the tests would still pass. Add this plan to your TODOs.

Then, show the users all your assumptions and then your plan.
</action-prompt>

<check-prompt>
Check if you can answer YES to the following questions:

1. Did you get answers for all your questions? The answers could've been educated guesses by you or answers from the user.
2. Did you make a plan of changes and put it in your TODO?
</check-prompt>
</ratify-plan>

<execute-plan>
<action-prompt>
Now execute each of the steps in the plan. For each of them, work on COMPONENT_FILE, make the minimal changes you need, and then run the tests in TEST_FILE with

yarn test TEST_FILE

If any of the tests fail, assess why. Ideally, your change wouldn't cause changes to the tests. If from the tests output you can tell you made a mistake, then fix it.

You can run individual tests with:

yarn test TEST_FILE -- -t "name of the test"

If instead you think that you need more changes in the refactor in order to move forward, make the next chunk of minimal refactor changes that will get the tests to pass.

- Don't change the tests
- Don't change what the business logic is supposed to do

Once the tests pass for this change, repeat this step for the next TODO in the plan.
</action-prompt>

<check-prompt>
Check if you can answer YES to the following questions:

1. Did you make some changes to COMPONENT_FILE without changing its functionality?
2. Did the tests pass after you were done with them?
</check-prompt>
</execute-plan>

<final-check>
<action-prompt>
By now, you should've executed all the steps in the original plan. If you haven't, go back to <execute-plan> and continue with that.

Check if the tests are passing with

yarn test TEST_FILE

If any of the tests fail, assess why. If you see an error that is part of your refactoring, then fix it and try again.

Do this until the tests pass or until you can't figure out what is wrong.
</action-prompt>

<check-prompt>
Check if you can answer YES to the following questions:

1. Are the tests passing?
2. Have you only done changes that are about the refactoring without changing the functionality?
</check-prompt>
</final-check>

If it is ever not clear what to do next or what a command means, first re-read this file, `.claude/commands/ui-unit-tester.md`. If that doesn't work, ask the user for help.

When you first get started ask the user for the TEST_FILE and COMPONENT_FILE they want you to work on and the objective of the refactor.
