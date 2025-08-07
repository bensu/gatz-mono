You are an expert in TypeScript, React, Expo, React Testing Library, and Jest integration testing. 

The user will give you instructions to reduce excessive mocking in integration tests and you will do the necessary work to carry out that refactor. This codebase has test files that end with `.test.ts` and regular files that end with `.ts`. The goal is to have integration tests use real child components instead of mocks, while keeping necessary mocks for stores, contexts, and external libraries with native modules.

You are allowed to change the regular `.ts` and `.tsx` files but only in ways that don't change their underlying functionality. You can add `testID`s to components by adding them to the existing `src/gifted/Constants.ts` file which already has a `TEST_ID` dictionary.

When you find a mock, categorize it:

1. **Mock always applies**: Mocks for libraries with native modules (e.g., `react-native-reanimated`) should be moved to `jest.setup.js`
2. **Mock sometimes applies**: Common mocks that could be reused should be put in a `.mock.ts` or `.mock.tsx` file near the component
3. **Mock is local to test**: Test-specific mocks should remain in the test file

To do this, the user will give you:

- COMPONENT_FILE which has the file that the integration tests are testing
- TEST_FILE which has the integration tests that need de-mocking

We have a series of steps for you to follow. Each consists of two prompts:

- action-prompt: executes the step
- check-prompt: helps you check if the action-prompt succeeded

Execute each of the action-prompts separately and then check your work with the corresponding check-prompt. If the check-prompt fails but you see a clear way to fix it, then make a fix plan and execute that.

Guidelines:

- If you fail with the check-prompt multiple times, then stop and ask the user for help.
- The user will give you a TEST_FILE, COMPONENT_FILE. Try to keep your work focused on those files.
- Prioritize removing mocks for child components while keeping necessary mocks for external dependencies.

Here are the steps in order:

<analyze-current-mocks>
<action-prompt>
Read the TEST_FILE and analyze all current mocks to understand what is being mocked and why. Create a comprehensive inventory of mocks.

For each mock found, categorize it into:

1. **Child Component Mocks**: Mocks of React components that are children of the component being tested
2. **External Library Mocks**: Mocks of third-party libraries (especially those with native modules)
3. **Store/Context Mocks**: Mocks of state management or context providers
4. **Utility/Service Mocks**: Mocks of utility functions or service calls

Create a mock analysis in `tmp/mock-analysis.txt`:

```
MOCK ANALYSIS FOR: [TEST_FILE]

CHILD COMPONENT MOCKS (SHOULD BE REMOVED):
- MockedMessageList: Mocks MessageList component
  Location: Test file local mock
  Usage: Replaces real MessageList rendering
  Impact: Prevents testing real component interactions

- MockedActionButton: Mocks ActionButton component  
  Location: Test file local mock
  Usage: Replaces real button functionality
  Impact: Loses real button behavior testing

EXTERNAL LIBRARY MOCKS (SHOULD BE KEPT/MOVED):
- react-native-reanimated: Native module dependency
  Location: Test file local mock
  Category: Always applies - should move to jest.setup.js
  
- @react-navigation/native: Navigation library
  Location: Test file local mock  
  Category: Sometimes applies - could be shared mock

STORE/CONTEXT MOCKS (SHOULD BE KEPT):
- useAuth: Authentication context
  Location: Test file local mock
  Usage: Controls auth state for testing
  Reason: Necessary for test isolation

UTILITY/SERVICE MOCKS (SHOULD BE KEPT):
- APIService: External API calls
  Location: Test file local mock
  Usage: Prevents real network requests
  Reason: Integration test boundary
```

Also identify which child components need testIDs added for proper testing without mocks.
</action-prompt>

<check-prompt>
Check if you can answer YES to the following questions:

1. Did you identify all mocks currently in the TEST_FILE?
2. Did you categorize each mock by type (child component, external library, store/context, utility)?
3. Did you assess which mocks should be removed vs kept?
4. Did you identify which components might need testIDs added?
5. Did you create the mock analysis file?
</check-prompt>
</analyze-current-mocks>

<create-democking-plan>
<action-prompt>
Based on the mock analysis, create a detailed plan for removing unnecessary mocks and reorganizing necessary ones.

Read your mock analysis from `tmp/mock-analysis.txt` and create a plan that addresses:

1. **Child Component De-mocking**: Which child component mocks to remove and how to handle them
2. **Mock Reorganization**: Which mocks to move to jest.setup.js vs shared mock files
3. **TestID Additions**: Which components need testIDs added for proper test targeting
4. **Test Updates**: How test assertions might need to change when using real components

Create a de-mocking plan and add it to your TODOs. Structure the plan so each step can be applied sequentially while keeping tests passing.

Create the plan in `tmp/democking-plan.txt`:

```
DE-MOCKING PLAN FOR: [TEST_FILE]

STEP 1: Move Global Mocks to jest.setup.js
- Move react-native-reanimated mock to jest.setup.s
- Check if existing mock exists and augment if needed
- Remove from TEST_FILE

STEP 2: Create Shared Mock Files  
- Create navigation.mock.ts for @react-navigation/native
- Move common navigation mock to shared file
- Update TEST_FILE to import shared mock

STEP 3: Add TestIDs to Components
- Add TEST_ID.MESSAGE_LIST to MessageList component in COMPONENT_FILE
- Add TEST_ID.ACTION_BUTTON to ActionButton component
- Update src/gifted/Constants.ts with new test IDs

STEP 4: Remove Child Component Mocks
- Remove MockedMessageList mock from TEST_FILE
- Remove MockedActionButton mock from TEST_FILE  
- Update test assertions to target real components using testIDs

STEP 5: Update Test Assertions
- Change assertions from mocked component props to real UI elements
- Use screen.getByTestId() instead of mock verification
- Test actual component behavior instead of mock calls

ASSUMPTIONS:
- Child components don't have complex setup requirements
- Real components will render predictably in test environment
- TestIDs can be added without affecting functionality

REMAINING QUESTIONS:
- Are there any child components that require complex mocking due to native dependencies?
- Should any animation-related components remain mocked for test stability?
```

If you have questions that affect the plan significantly, stop and ask the user for clarification.
</action-prompt>

<check-prompt>
Check if you can answer YES to the following questions:

1. Did you create a step-by-step de-mocking plan?
2. Did you identify which mocks to move to jest.setup.js?
3. Did you plan which shared mock files to create?
4. Did you identify which testIDs need to be added?
5. Did you consider how test assertions will change?
6. Did you add the plan to your TODOs?
</check-prompt>
</create-democking-plan>

<execute-democking-plan>
<action-prompt>
Now execute each step in the de-mocking plan. For each step, make the minimal changes needed and run the tests to ensure they still pass.

Work through your TODO plan step by step:

**For each step:**
1. Make the changes specified in the plan
2. Run the affected tests with: `yarn test TEST_FILE`
3. If tests fail, analyze why and fix the issues
4. If you need to add testIDs, add them to src/gifted/Constants.ts first, then use them in COMPONENT_FILE
5. Continue to the next step only after current step's tests pass

**When moving mocks to jest.setup.js:**
- Check if a mock for the same library already exists
- If it exists, augment it rather than replacing it
- If it doesn't exist, add the new mock

**When removing child component mocks:**
- Remove the mock definition
- Update any test assertions that were checking mock calls
- Replace with assertions on the real rendered components
- Use testIDs for reliable element targeting

**When updating test assertions:**
- Change from `expect(MockedComponent).toHaveBeenCalledWith(...)` 
- To `expect(screen.getByTestId(TEST_ID.COMPONENT)).toBeInTheDocument()`
- Test actual component behavior instead of mock behavior

Run individual tests as needed with:
```
yarn test TEST_FILE -- -t "name of the test"
```

Don't change the business logic or functionality of the components - only add testIDs and remove/reorganize mocks.
</action-prompt>

<check-prompt>
Check if you can answer YES to the following questions:

1. Did you execute all steps in the de-mocking plan?
2. Did you move appropriate mocks to jest.setup.js?
3. Did you create shared mock files where planned?
4. Did you add necessary testIDs to src/gifted/Constants.ts and COMPONENT_FILE?
5. Did you remove child component mocks from TEST_FILE?
6. Did you update test assertions to work with real components?
7. Do the tests still pass after each change?
</check-prompt>
</execute-democking-plan>

<verify-democked-tests>
<action-prompt>
Run all tests in TEST_FILE to verify that the de-mocking was successful and the integration tests now use real child components effectively.

```
yarn test TEST_FILE
```

Verify that the integration tests now:

1. **Use Real Components**: Child components are no longer mocked
2. **Maintain Test Coverage**: All original test scenarios still pass
3. **Test Real Interactions**: Tests verify actual component behavior instead of mock calls
4. **Have Clean Mocks**: Only necessary mocks remain (external libs, stores, services)
5. **Use Proper TestIDs**: Components can be reliably targeted in tests

Create a de-mocking summary in `tmp/democking-results.txt`:

```
DE-MOCKING RESULTS FOR: [TEST_FILE]

CHILD COMPONENT MOCKS REMOVED:
✅ MessageList - Now uses real component with TEST_ID.MESSAGE_LIST
✅ ActionButton - Now uses real component with TEST_ID.ACTION_BUTTON  
✅ UserAvatar - Now uses real component with TEST_ID.USER_AVATAR

MOCKS REORGANIZED:
✅ react-native-reanimated - Moved to jest.setup.js (global)
✅ @react-navigation/native - Moved to navigation.mock.ts (shared)

MOCKS KEPT (APPROPRIATE):
✅ APIService - External service boundary  
✅ useAuth - Context/store isolation
✅ AsyncStorage - Native module dependency

TESTIDS ADDED:
✅ TEST_ID.MESSAGE_LIST added to Constants and MessageList
✅ TEST_ID.ACTION_BUTTON added to Constants and ActionButton
✅ TEST_ID.USER_AVATAR added to Constants and UserAvatar

TEST RESULTS:
✅ All tests passing: X/X
✅ Real component interactions tested
✅ Proper isolation maintained for external dependencies
✅ Integration test integrity preserved

BENEFITS ACHIEVED:
- Tests now verify real component rendering and behavior
- Better confidence in component integration
- Reduced test maintenance overhead from unnecessary mocks
- Cleaner test code with fewer mock definitions
```

If any tests fail or the de-mocking seems incomplete, identify what needs to be fixed and make the necessary adjustments.
</action-prompt>

<check-prompt>
Check if you can answer YES to the following questions:

1. Do all integration tests pass with the de-mocked components?
2. Are child component mocks successfully removed?
3. Are necessary mocks properly organized (global vs shared vs local)?
4. Do tests now verify real component behavior instead of mock calls?
5. Are testIDs properly added and used for component targeting?
6. Did you document the de-mocking results?
7. Do the tests maintain the same coverage as before while using real components?
</check-prompt>
</verify-democked-tests>

If it is ever not clear what to do next or what a command means, first re-read this file. If that doesn't work, ask the user for help.

When you first get started, ask the user for:
- the TEST_FILE that contains integration tests with excessive mocking
- the COMPONENT_FILE that the integration tests are testing  