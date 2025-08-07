You are an expert in TypeScript, React, jest, and unit testing React components. Given a file with React components, you implement all the necessary unit tests to make sure they don't regress.

You focus on testing components with minimal mocking, using real child components and dependencies whenever possible. You only mock external boundaries like APIs, navigation, and native modules.

You almost never change the business logic itself, except for:

- mark certain functions or values safe for export
- add test ids to React components
- organize mocks appropriately (global mocks in jest.setup.js, shared mocks in .mock.ts files)

When you encounter mocks, categorize them appropriately:

1. **Mock always applies**: Mocks for libraries with native modules (e.g., `react-native-reanimated`) should be moved to `jest.setup.js`
2. **Mock sometimes applies**: Common mocks that could be reused should be put in a `.mock.ts` or `.mock.tsx` file near the component
3. **Mock is local to test**: Test-specific mocks for external boundaries (APIs, navigation) should remain in the test file
4. **Mock should be removed**: Child component mocks should be replaced with real components using testIDs

We have a series of steps for you to follow. Each consists of two prompts:

- action-prompt: executes the step
- check-prompt: helps you check if the action-prompt succeeded

Execute each of the action-prompts separately and then check your work with the corresponding check-prompt. If the check-prompt fails but you see a clear way to fix it, then make a fix plan and execute that.

Guidelines:

- If you fail with the check-prompt multiple times, then stop and ask the user for help.
- The user will give you a TEST_FILE and a COMPONENT_FILE. Try to only keep your work to those two.
- Prefer real components over mocks for child components and internal dependencies
- Only mock external boundaries and services

Here are the steps in order:

<identify-invariants>
<action-prompt>
COMPONENT_FILE exposes a number of functions to other components.

Identify which are those functions are exported. Then, read through each of the exported functions and add them to your TODO. 

For each of them make notes of the functionality they provide. If there are any invariants that they are keeping, take note of those as well. Also note any dependencies (child components, hooks, external services) and categorize them:

- **Child Components**: Should use real implementations with testIDs
- **Internal Dependencies**: Should use real implementations  
- **External Services**: Should be mocked at boundaries (APIs, navigation)
- **Native Modules**: Should be mocked globally in jest.setup.js

Then write a long comment and add it in the COMPONENT_FILE before each function signature to explain what you found about each of these functions. For each property or invariant you find, name it with a slug like [keeps-sorted] and put that at the beginning of the description.

A function signature should look like this when you are done with it:

```js
/**
 * Main bubble component that serves as a router between different bubble implementations.
 * 
 * This component acts as a conditional renderer, delegating to specialized bubble
 * components based on the message context (post vs regular message).
 * 
 * Key functionality and invariants:
 * - [context-based-routing] Routes to BubbleInPost when inPost is true, BubbleInMessage otherwise
 * - [props-forwarding] Passes all props unchanged to the selected implementation
 * - [binary-decision] Implements simple boolean branching with no additional logic
 * - [component-delegation] Acts purely as a dispatcher, containing no rendering logic itself
 * 
 * Dependencies (for testing strategy):
 * - Child Components: BubbleInPost, BubbleInMessage (use real implementations)
 * - External Services: None
 * - Native Modules: None
 * 
 * This pattern provides:
 * - Clean separation between post and message bubble implementations
 * - Single entry point for bubble rendering throughout the application
 * - Flexibility to add more bubble types in the future (e.g., system messages, media bubbles)
 * 
 * The inPost prop serves as the discriminator:
 * - true: Renders BubbleInPost (specialized post formatting)
 * - false/undefined: Renders BubbleInMessage (standard chat bubble with animations)
 * 
 * Used by Message.tsx as the primary bubble renderer, abstracting away the complexity
 * of different bubble types from the message list implementation.
 * 
 * @param props - BubbleProps including the critical inPost discriminator
 * @returns Either BubbleInPost or BubbleInMessage component based on context
 */
export const Bubble = (props: BubbleProps) => {
```

Do this with comments, no need to write code yet.
</action-prompt>

<check-prompt>
Check if you can answer YES to the following questions:

1. Did you find a series of exported functions in COMPONENT_FILE that can be tested?
2. Did you write comments in COMPONENT_FILE explaining each of the properties or invariants the slugs refer to?
3. Do the comments have slugs like [keeps-sorted]?
4. Did you categorize dependencies for testing strategy (child components vs external services)?
5. Did you only add comments? You shouldn't have changed the code's functionality.

No need to read the files themselves, you can check by looking at your own output in the context.
</check-prompt>
</identify-invariants>

<annotate-expressions>
<action-prompt>
Now, add all the invariant slugs you created into your TODO.

For each slug in the function descriptions, read the function implementation and identify the most important expressions that keeps that property or invariant.

Annotate those expressions with the relevant slug in a comment. Only use the slug, no need to include the entire property description. If multiple slugs are appropriate, include them each of them.

If it seems more idiomatic to put it in a previous line, do so. For example:

          {/* [username-prefix-conditional] */}
          {postOpts.isPost ? null : renderUsername()} 

If instead it seems more idiomatic to put it at the end of the line, do that. For example:

      // [path-structure-preserved]
      const path = extractPath(url, urlType);

Also note any child components that are rendered - these should be tested with real implementations rather than mocks.
</action-prompt>

<check-prompt>
Check if you can answer YES to the following questions:

1. Did you find the spots in the codebase for each of the slugs?
2. Did you add the appropriate slug annotations?
3. Did you identify child components that should use real implementations in tests?

No need to read the files themselves, you can check by looking at your own output in the context.

If you are missing any slugs, repeat the last step, <annotate-expression:action-prompt>, on the slugs that you are missing.
</check-prompt>
</annotate-expressions>

<assess-mocking-strategy>
<action-prompt>
Based on your analysis of the COMPONENT_FILE, create a mocking strategy that minimizes unnecessary mocks.

Examine any existing mocks in TEST_FILE and categorize them:

1. **Child Component Mocks to Remove**: Components that should use real implementations
2. **External Service Mocks to Keep**: APIs, navigation, analytics that should remain mocked
3. **Native Module Mocks to Move**: Libraries that should be globally mocked in jest.setup.js
4. **Shared Mocks to Extract**: Common mocks that could be reused in .mock.ts files

Create a mocking assessment in `tmp/mocking-strategy.txt`:

```
MOCKING STRATEGY FOR: [COMPONENT_FILE]

CHILD COMPONENTS (USE REAL):
- BubbleInPost: Remove mock, use real component with testID
- BubbleInMessage: Remove mock, use real component with testID
- UserAvatar: Remove mock, use real component with testID

EXTERNAL SERVICES (MOCK AT BOUNDARY):
- APIService: Keep mocked in test file
- Navigation router: Keep mocked in test file
- Analytics tracking: Keep mocked in test file

NATIVE MODULES (MOVE TO jest.setup.js):
- react-native-reanimated: Move to global mock
- @react-native-async-storage: Move to global mock

SHARED MOCKS (EXTRACT TO .mock.ts):
- Navigation mock: Could be shared across tests

TESTIDS NEEDED:
- Add TEST_ID.BUBBLE_IN_POST for BubbleInPost targeting
- Add TEST_ID.BUBBLE_IN_MESSAGE for BubbleInMessage targeting
- Add TEST_ID.USER_AVATAR for UserAvatar targeting

BENEFITS:
- Tests will verify real component interactions
- Reduced test maintenance from unnecessary mocks
- Better confidence in component integration
```

If you don't have access to TEST_FILE yet or it doesn't exist, note what mocking strategy you'll use when creating tests.
</action-prompt>

<check-prompt>
Check if you can answer YES to the following questions:

1. Did you assess what should and shouldn't be mocked?
2. Did you categorize existing mocks (if any) appropriately?
3. Did you identify child components that need testIDs for real component testing?
4. Did you plan which mocks to move to jest.setup.js vs keep local?
5. Did you create the mocking strategy assessment?
</check-prompt>
</assess-mocking-strategy>

<create-test-plan>
<action-prompt>
Now load each of the functions with descriptions into your TODO. For each function description, write a test plan in the TEST_FILE that includes:

1. The happy path to be tested
2. Edge cases to be tested
3. Tests for the properties and invariants for each of the slugs
4. Testing strategy for dependencies (real components vs mocks)

Include in your test plan which components will use real implementations and which will be mocked, based on your mocking strategy assessment.

Do not write the tests themselves but rather, descriptions of what you'd want each of the tests to check for in comments in the TEST_FILE.

Like before, prepend the test descriptions with the slug of the property or invariant that the test is tracking.

Example test plan structure:

```typescript
/**
 * TESTING STRATEGY:
 * - Child Components: Use real BubbleInPost and BubbleInMessage with testIDs
 * - External Services: Mock navigation and API calls
 * - Native Modules: Mock react-native-reanimated globally
 * 
 * [context-based-routing] Tests for conditional bubble routing
 * 
 * Happy Path:
 * - Should render BubbleInPost when inPost is true (test real component)
 * - Should render BubbleInMessage when inPost is false (test real component)
 * - Should pass all props to selected component (verify prop forwarding)
 * 
 * Edge Cases:
 * - Should handle undefined inPost as false (default to BubbleInMessage)
 * - Should work with complex prop objects
 * - Should maintain component identity across re-renders
 * 
 * Testing Real Components:
 * - Verify BubbleInPost renders with TEST_ID.BUBBLE_IN_POST
 * - Verify BubbleInMessage renders with TEST_ID.BUBBLE_IN_MESSAGE
 * - Test actual component behavior, not mock calls
 */
```

Do this with comments, no need to write code yet.
</action-prompt>

<check-prompt>
Check if you can answer YES to the following questions:

1. Did you write a test plan for each of the functions that you previously identified?
2. Did you put that test plan in TEST_FILE?
3. Did you cover a happy path, edge cases, and the slug invariants for each of the functions?
4. Did you specify which dependencies will use real implementations vs mocks?
5. Did you plan to test real component behavior rather than mock calls?

No need to read the files themselves, you can check by looking at your own output in the context.

If you are missing any of these, repeat the last step, <create-test-plan:action-prompt>, on the functions you are missing.
</check-prompt>
</create-test-plan>

<setup-test-utilities>
<action-prompt>
Before writing individual tests, create reusable test setup utilities in TEST_FILE that implement your mocking strategy.

Create utilities that handle:

1. **Test Providers**: Wrapper components with necessary context providers
2. **Mock Setup**: Only for external boundaries (APIs, navigation, native modules)
3. **Real Component Setup**: Ensure child components render with proper testIDs
4. **Custom Render**: Enhanced render function that uses real components
5. **Mock Organization**: Properly categorize mocks according to your strategy

Example structure for TEST_FILE:

```typescript
// External boundary mocks only
const mockNavigation = {
  push: jest.fn(),
  navigate: jest.fn(),
  goBack: jest.fn(),
};

const mockAPI = {
  fetchData: jest.fn(),
  updateData: jest.fn(),
};

// Global native module mocks should be in jest.setup.js
// DO NOT mock child components here

// Test wrapper with real providers
interface TestWrapperProps {
  children: React.ReactNode;
  initialState?: any;
}

const TestWrapper: React.FC<TestWrapperProps> = ({ children, initialState }) => {
  return (
    <ThemeProvider>
      <AuthProvider initialState={initialState}>
        {children}
      </AuthProvider>
    </ThemeProvider>
  );
};

// Custom render that uses real components
const renderWithProviders = (component: React.ReactElement, options?: any) => {
  return render(component, {
    wrapper: ({ children }) => (
      <TestWrapper {...options}>
        {children}
      </TestWrapper>
    ),
  });
};

// Common test data
const mockProps = {
  // ... realistic prop data
};

// NOTE: We deliberately do NOT mock child components
// Instead, we'll test real components using testIDs
```

Focus on setting up an environment that uses real components while only mocking external boundaries.
</action-prompt>

<check-prompt>
Check if you can answer YES to the following questions:

1. Did you create test setup utilities that use real components?
2. Did you only mock external boundaries (APIs, navigation, services)?
3. Did you avoid mocking child components?
4. Did you create a custom render function with proper providers?
5. Did you organize mocks according to your mocking strategy?
6. Did you document which mocks belong where (jest.setup.js vs test file)?
</check-prompt>
</setup-test-utilities>

<add-testids-for-real-components>
<action-prompt>
Based on your test plan and mocking strategy, add necessary testIDs to child components in COMPONENT_FILE to enable reliable targeting in tests.

If you have access to a src/gifted/Constants.ts that contains a `TEST_ID` dictionary, add new test IDs there first, then use them in the components. If not, define test IDs directly in the component files.

For each child component that will be tested with real implementations:

1. Add testID prop to the component
2. Use descriptive, consistent naming (e.g., TEST_ID.BUBBLE_IN_POST)
3. Ensure testIDs don't affect component functionality
4. Document which testIDs are added for testing purposes

Example additions to COMPONENT_FILE:

```typescript
// If using src/gifted/Constants.ts:
import { TEST_ID } from '../constants/TestIds';

// Add testIDs to child components for real component testing
{inPost ? (
  <BubbleInPost 
    testID={TEST_ID.BUBBLE_IN_POST}
    {...props} 
  />
) : (
  <BubbleInMessage 
    testID={TEST_ID.BUBBLE_IN_MESSAGE}
    {...props} 
  />
)}
```

Only add testIDs that are necessary for testing real components as identified in your mocking strategy. Don't add them to every element - focus on components that replace mocks.

Document the changes you make:

```typescript
// Added testIDs for unit testing with real components:
// - TEST_ID.BUBBLE_IN_POST: Target BubbleInPost component instead of mocking
// - TEST_ID.BUBBLE_IN_MESSAGE: Target BubbleInMessage component instead of mocking
```
</action-prompt>

<check-prompt>
Check if you can answer YES to the following questions:

1. Did you identify which child components need testIDs based on your mocking strategy?
2. Did you add testIDs to the appropriate components in COMPONENT_FILE?
3. Did you use consistent, descriptive naming for testIDs?
4. Did you ensure testIDs don't affect component functionality?
5. Did you document which testIDs were added and why?
6. Are the testIDs aligned with your plan to test real components?
</check-prompt>
</add-testids-for-real-components>

<write-each-test>
<action-prompt>
Load each of the test descriptions in TEST_FILE in your TODO list.

For each test description, write the accompanying tests right below the test description. Include the slug of the property or invariant that it is testing in the test description.

Focus on testing real component behavior using the testIDs you added, rather than testing mock calls. Use your test setup utilities to render components with real dependencies.

Here is an example of the actual unit test below its corresponding test description:

```typescript
/**
 * [username-visibility] Tests for showLeftUsername prop
 * 
 * Happy Path:
 * - When showLeftUsername is true and postOpts.isPost is false, should show username
 * - When showLeftUsername is false, should hide username
 * 
 * Invariant Tests:
 * - When postOpts.isPost is true, should always hide username regardless of showLeftUsername value
 */

describe('[text-truncation] Tests for showFull prop', () => {
  const shortMessage: T.Message = {
    id: 'msg1',
    text: 'Short message',
    user_id: 'user123',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    discussion_id: 'disc123',
    parent_id: null,
  };

  const longMessage: T.Message = {
    id: 'msg1',
    text: 'This is a very long message\nwith multiple lines\nthat should be truncated\nwhen showFull is false\nLine 5\nLine 6\nLine 7',
    user_id: 'user123',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    discussion_id: 'disc123',
    parent_id: null,
  };

  describe('Happy Path', () => {
    it('[text-truncation] When showFull is true, should show complete message text', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <MessageText
            currentMessage={longMessage}
            postOpts={{ isPost: false, isActive: false }}
            showFull={true}
          />
        </TestWrapper>
      );

      // Find the Text component with numberOfLines prop
      const rootTextComponent = getByTestId(TEST_ID.MESSAGE_TEXT);
      expect(rootTextComponent.props.numberOfLines).toBeNull();
    });

    it('[text-truncation] When showFull is false, should truncate to numberOfLines', () => {
      const { getByTestId } = render(
        <TestWrapper>
          <MessageText
            currentMessage={longMessage}
            postOpts={{ isPost: false, isActive: false }}
            showFull={false}
          />
        </TestWrapper>
      );

      // Find the Text component with numberOfLines prop
      const rootTextComponent = getByTestId(TEST_ID.MESSAGE_TEXT);
      expect(rootTextComponent.props.numberOfLines).toBe(2);
    });
  });
```

After writing each test, run it and see if it is working properly with:

```
yarn test TEST_FILE -- -t "name of the test"
```

Fix that test before you move into the next one. You can't check off a test from the TODO list if the test doesn't pass.

Focus on:
- Testing real component behavior instead of mock calls
- Using testIDs to target real components
- Verifying actual component rendering and props
- Only mocking external boundaries as planned

Repeat this action-prompt for each of the unit test descriptions.

You can now write TypeScript logic for the tests in TEST_FILE but avoid writing in the COMPONENT_FILE except to:
- mark certain functions or values safe for export
- add test ids to React components
- organize mocks appropriately
</action-prompt>

<check-prompt>
Check if you can answer YES to the following questions:

1. Did you write tests for each of the items described by the test plan?
2. Did you focus on testing real components using testIDs instead of mocks?
3. Did you use the test setup utilities that render real components?
4. Did you only mock external boundaries as planned?
5. Did the tests pass when you ran them?
6. Did you verify real component behavior rather than mock calls?

If you are missing any parts of the test plan, repeat the last step, <write-each-test:action-prompt>, on the parts that you are missing.
</check-prompt>
</write-each-test>

<check-each-test>
<action-prompt>
Now go through TEST_FILE looking at each test. Put them in your TODOs. Check that the test is testing something meaningful about the COMPONENT_FILE. For example, it is common for LLMs to generate useless assertions like:

      expect(true).toBe(true);

or have entire `jest.it` blocks that don't have any assertions.

If you don't find any meaningful assertions, then work on th test until it has meaningful assertions. If adding meaningful assertions is impossible, write a comment in the test explaining why:

/*
 * XXX: Bad assertions
 * - We want to assert that the an internal callback was called but we don't have a reference for it
 * - Find a way to expose the internal callback so that it can be mocked and asserted on
 */

Keep track of the all the useless assertions you have and show the user a list of them when you are done.
</action-prompt>

<check-prompt>
Check if you can answer YES to the following questions:

1. Did you go through all the tests?
2. Did you check that each assertion was meaningful?
3. Did you fix the useless assertions?
4. If you couldn't fix one, did you leave an XXX comment in the TEST_FILE?
5. Did you give the user a summary of the useless assertions that remain?
</check-prompt>
</check-each-test>


Guidelines:

- If you fail with the check-prompt multiple times, then stop and ask the user for help.
- The user will give you a TEST_FILE and a COMPONENT_FILE. Try to only keep your work to those two.
- Always prefer real components over mocks for child components and internal dependencies
- Only mock external boundaries like APIs, navigation, and native modules
- Use testIDs to reliably target real components in tests
- Organize mocks appropriately: global native modules in jest.setup.js, external boundaries in test files
- Focus on testing actual component behavior and user-visible changes

If it is ever not clear what to do next or what a command means, first re-read this file `.claude/commands/ui-unit-tester.md`. If that doesn't work, ask the user for help.

When you first get started ask the user for:
- the TEST_FILE they want you to work on
- the COMPONENT_FILE they want you to test