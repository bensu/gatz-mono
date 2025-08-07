You are an expert in TypeScript, React, Expo, React Testing Library, and Jest integration testing. Given a root component and QA test flows, you create comprehensive integration tests that replicate human QA testing with full component trees, real state flow, and minimal mocking.

Integration testing validates complete user workflows by rendering full component hierarchies and simulating real user interactions. Unlike unit tests that isolate individual functions, integration tests verify that components work together correctly with actual state management, navigation, and data flow. This means that you very rarely mock child components of the root component being tested.

You focus on creating tests that:
- Render complete component trees from the root component
- Use real state management and context providers
- Simulate actual user interactions (tap, type, swipe)
- Verify end-to-end workflows with minimal mocking
- Test cross-component communication and data flow
- Use real child components instead of mocks whenever possible

When you encounter mocks, categorize them appropriately:

1. **Mock always applies**: Mocks for libraries with native modules (e.g., `react-native-reanimated`) should be moved to `jest.setup.js`
2. **Mock sometimes applies**: Common mocks that could be reused should be put in a `.mock.ts` or `.mock.tsx` file near the component
3. **Mock is Local to test**: Test-specific mocks for external boundaries (APIs, navigation) should remain in the test file
4. **Mock should be removed**: Child component mocks should be replaced with real components using testIDs

We have a series of steps for you to follow. Each step consists of two prompts:

action-prompt: executes the step
check-prompt: helps you check if the action-prompt succeeded

Execute each of the action-prompts separately and then check your work with the corresponding check-prompt. If the check-prompt fails but you see a clear way to fix it, then make a fix plan and execute that.

<analyze-component-dependencies>
<action-prompt>
Read through COMPONENT_FILE to understand the full component tree and dependencies required for integration testing:

1. Root Component Analysis: Identify the main component that serves as the entry point
2. Child Components: Map out all child components that are rendered
3. Context Providers: Find all React Context providers needed (auth, theme, navigation, etc.)
4. State Management: Identify state management libraries (Redux, Zustand, etc.) and their stores
5. Navigation: Determine navigation structure and router requirements
6. External Dependencies: Note APIs, async operations, and external services
7. Props and Configuration: Identify required props and configuration for rendering
8. Mock Assessment: Identify which dependencies should use real implementations vs mocks

Create a dependency analysis in `tmp/component-dependencies.txt` with:

```
ROOT COMPONENT: ComponentName

REQUIRED PROVIDERS:
- AuthProvider (for user authentication state)
- ThemeProvider (for styling context)
- NavigationContainer (for routing)

CHILD COMPONENTS (USE REAL IMPLEMENTATIONS):
- MessageList (renders list of messages) - Add testID for targeting
- MessageInput (handles user input) - Add testID for targeting
- ActionButtons (message actions) - Add testID for targeting

STATE MANAGEMENT (USE REAL):
- useMessages hook (manages message state)
- useAuth hook (user authentication)

EXTERNAL DEPENDENCIES (MOCK AT BOUNDARIES):
- API calls: fetchMessages, sendMessage (mock - external service)
- Navigation: router.push, navigation.navigate (mock - external library)

NATIVE MODULE LIBRARIES (MOCK GLOBALLY):
- react-native-reanimated (move to jest.setup.js)
- react-native-async-storage (move to jest.setup.js)

REQUIRED PROPS:
- userId: string
- channelId: string
- initialMessages?: Message[]

TESTIDS NEEDED:
- TEST_ID.MESSAGE_LIST for MessageList component
- TEST_ID.MESSAGE_INPUT for MessageInput component
- TEST_ID.ACTION_BUTTON for ActionButton component
```

This analysis will determine what needs to be set up in the test environment to replicate the production component tree with minimal but appropriate mocking.
</action-prompt>

<check-prompt>
Check if you can answer YES to the following questions:

1. Did you identify the root component and its purpose?
2. Did you map out all child components in the tree?
3. Did you find all required context providers?
4. Did you identify state management dependencies?
5. Did you note navigation and external service requirements?
6. Did you categorize which dependencies should be real vs mocked?
7. Did you identify which testIDs might be needed for child components?
8. Did you create the dependency analysis file?
</check-prompt>
</analyze-component-dependencies>

<parse-qa-test-flows>
<action-prompt>
Read the QA test flows from the CSV file (or list provided by user) into your TODOs. Then convert them into integration test specifications.

For each QA flow, analyze:

1. Flow Identification: Extract the slug, name, and test steps
2. User Actions: Convert human actions into React Testing Library interactions
3. Setup Requirements: Determine what state/props are needed for the test
4. Assertions: Identify what UI changes or state changes to verify
5. Dependencies: Note which other components or services are involved
6. Targeting Strategy: Plan how to target real components using testIDs instead of mocks

Create a test flow analysis in `tmp/integration-test-flows.txt`:

```
FLOW: [message-flagging] - Messages can be flagged
QA STEPS: "1. Long press on a message, 2. Tap Flag, 3. Check for Alert with 'Sure?', 4. Press Yes, Expected: Message disappears"

INTEGRATION TEST SPEC:
Setup: Render chat with mock messages, user authenticated
Actions: 
  - fireEvent.press(screen.getByTestId(TEST_ID.MESSAGE_ITEM), { duration: 500 }) // long press on real message
  - fireEvent.press(screen.getByText('Flag'))
  - fireEvent.press(screen.getByText('Yes'))
Assertions:
  - Alert with confirmation text appears
  - Message is removed from DOM (real MessageList component)
  - API call to flag message is made (mocked boundary)
Dependencies: Real Message component, Real ContextMenu, Real Alert, Mocked API service
Targeting: Use TEST_ID.MESSAGE_ITEM instead of mocking Message component

FLOW: [message-send] - User sends a text message  
QA STEPS: "1. Type message in input, 2. Tap send button, Expected: Message appears in chat"

INTEGRATION TEST SPEC:
Setup: Render chat component with empty message list
Actions:
  - fireEvent.changeText(screen.getByTestId(TEST_ID.MESSAGE_INPUT), 'Hello world')
  - fireEvent.press(screen.getByTestId(TEST_ID.SEND_BUTTON))
Assertions:
  - Message appears in real MessageList component
  - Input field is cleared (real MessageInput component)
  - API call to send message is made (mocked boundary)
Dependencies: Real MessageInput, Real MessageList, Mocked API service
Targeting: Use TEST_ID.MESSAGE_INPUT and TEST_ID.SEND_BUTTON instead of mocking components
```

Convert all QA flows into this integration test specification format, emphasizing real component usage.
</action-prompt>

<check-prompt>
Check if you can answer YES to the following questions:

- Did you parse all QA test flows from the input?
- Did you convert human actions into React Testing Library events?
- Did you identify setup requirements for each test?
- Did you specify clear assertions for each flow?
- Did you note component dependencies for each test?
- Did you plan to use real components with testIDs instead of mocks?
- Did you create the test flow specifications file?
</check-prompt>
</parse-qa-test-flows>

<create-test-setup-utilities>
<action-prompt>
Based on the dependency analysis, create reusable test setup utilities that provide the full component tree and context needed for integration tests.

Create test utilities in TEST_FILE that handle:

1. Test Providers: Wrapper component with all required providers
2. Mock Setup: Minimal mocking only for external boundaries (APIs, navigation, native modules)
3. State Initialization: Helper functions to set up different test states
4. Custom Render: Enhanced render function with providers
5. Common Assertions: Reusable assertion helpers
6. Mock Organization: Properly categorize and organize mocks

Example structure to add to TEST_FILE:

```typescript
// Mock Organization - External boundaries only
const mockNavigation = {
  push: jest.fn(),
  navigate: jest.fn(),
  goBack: jest.fn(),
};

const mockAPI = {
  sendMessage: jest.fn(),
  flagMessage: jest.fn(),
  fetchMessages: jest.fn(),
};

interface TestProvidersProps {
  children: React.ReactNode;
  initialAuth?: { userId: string; isAuthenticated: boolean };
  initialMessages?: Message[];
}

const TestProviders: React.FC<TestProvidersProps> = ({ 
  children, 
  initialAuth = { userId: 'test-user', isAuthenticated: true },
  initialMessages = []
}) => {
  return (
    <AuthProvider initialState={initialAuth}>
      <ThemeProvider>
        <NavigationContainer>
          <MessagesProvider initialMessages={initialMessages}>
            {children}
          </MessagesProvider>
        </NavigationContainer>
      </ThemeProvider>
    </AuthProvider>
  );
};

const renderWithProviders = (
  component: React.ReactElement,
  options?: {
    initialAuth?: { userId: string; isAuthenticated: boolean };
    initialMessages?: Message[];
  }
) => {
  return render(component, {
    wrapper: ({ children }) => (
      <TestProviders {...options}>
        {children}
      </TestProviders>
    ),
  });
};

// Common test data
const mockMessage = {
  id: 'msg-1',
  text: 'Test message',
  userId: 'other-user',
  timestamp: new Date(),
};

const mockMessages = [mockMessage];
```

Focus on creating a realistic test environment that mirrors production. Only mock external boundaries (APIs, navigation, native modules) and use real implementations for all internal components and state management.
</action-prompt>

<check-prompt>
Check if you can answer YES to the following questions:

- Did you create a TestProviders wrapper with all required context?
- Did you set up minimal mocking only for external boundaries?
- Did you avoid mocking child components?
- Did you create a custom render function with providers?
- Did you provide helpers for common test data and state setup?
- Did you organize mocks appropriately (external boundaries only)?
- Did you note that global native module mocks belong in jest.setup.js?
</check-prompt>
</create-test-setup-utilities>

<add-testids-to-components>
<action-prompt>
Based on the dependency analysis and test flow specifications, add necessary testIDs to the COMPONENT_FILE to enable reliable targeting of real components in tests.

If you have access to a src/gifted/Constants.ts that contains a `TEST_ID` dictionary, add new test IDs there first, then use them in the components. If not, define test IDs directly in the component files.

For each child component that needs to be targeted in tests:

1. Add testID prop to the component
2. Use descriptive, consistent naming (e.g., TEST_ID.MESSAGE_LIST, TEST_ID.SEND_BUTTON)
3. Ensure testIDs don't affect component functionality
4. Document which testIDs are added for testing purposes

Example additions to COMPONENT_FILE:

```typescript
// If using src/gifted/Constants.ts:
import { TEST_ID } from '../constants/TestIds';

// Add testIDs to components that need test targeting
<MessageList 
  testID={TEST_ID.MESSAGE_LIST}
  messages={messages}
  onMessagePress={handleMessagePress}
/>

<MessageInput
  testID={TEST_ID.MESSAGE_INPUT}
  value={inputValue}
  onChangeText={setInputValue}
  onSubmit={handleSendMessage}
/>

<TouchableOpacity
  testID={TEST_ID.SEND_BUTTON}
  onPress={handleSendMessage}
>
  <Text>Send</Text>
</TouchableOpacity>
```

Only add testIDs that are necessary for test targeting. Don't add them to every element - focus on components that are mentioned in the test flow specifications.

Document the changes you make:

```typescript
// Added testIDs for integration testing:
// - TEST_ID.MESSAGE_LIST: Target MessageList component
// - TEST_ID.MESSAGE_INPUT: Target message input field  
// - TEST_ID.SEND_BUTTON: Target send button
```
</action-prompt>

<check-prompt>
Check if you can answer YES to the following questions:

- Did you identify which components need testIDs based on test flows?
- Did you add testIDs to the appropriate components in COMPONENT_FILE?
- Did you use consistent, descriptive naming for testIDs?
- Did you ensure testIDs don't affect component functionality?
- Did you document which testIDs were added and why?
- Are the testIDs aligned with what's needed in the test flow specifications?
</check-prompt>
</add-testids-to-components>

<write-integration-tests>
<action-prompt>
Using the test flow specifications and setup utilities, write the actual integration tests in TEST_FILE that use real components with testIDs instead of mocks.

Load the QA flows from `tmp/integration-test-flows.txt` into your TODO. For each QA flow, create a corresponding integration test that:

1. Uses Descriptive Names: Include the slug and describe the complete user workflow
2. Sets Up Realistic State: Use the test utilities to create realistic initial conditions  
3. Simulates Real User Actions: Use React Testing Library events that match actual user behavior
4. Tests Real Components: Target real components using testIDs instead of mocks
5. Tests Full Workflows: Verify the complete end-to-end flow, not just individual steps
6. Asserts on User-Visible Changes: Focus on what users see and experience
7. Includes Slug References: Add slug comments for traceability

Example test structure using real components:

```typescript
describe('Message Interaction Flows', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // [message-flagging] Test complete flagging workflow with real components
  it('[message-flagging] should allow user to flag a message with confirmation', async () => {
    // Setup: Render chat with real components and mock data
    renderWithProviders(<ChatComponent />, {
      initialMessages: [mockMessage],
      initialAuth: { userId: 'current-user', isAuthenticated: true }
    });

    // Verify initial state in real MessageList component
    expect(screen.getByTestId(TEST_ID.MESSAGE_LIST)).toBeInTheDocument();
    expect(screen.getByText('Test message')).toBeInTheDocument();

    // Simulate user long press on real message component
    const messageItem = screen.getByTestId(TEST_ID.MESSAGE_ITEM);
    fireEvent.press(messageItem, { duration: 500 });

    // Verify real context menu appears
    await waitFor(() => {
      expect(screen.getByText('Flag')).toBeInTheDocument();
    });

    // User taps flag option in real context menu
    fireEvent.press(screen.getByText('Flag'));

    // Verify real confirmation alert appears
    await waitFor(() => {
      expect(screen.getByText('Are you sure you want to flag this message?')).toBeInTheDocument();
    });

    // User confirms flagging
    fireEvent.press(screen.getByText('Yes'));

    // Verify message is removed from real MessageList and API called (mocked boundary)
    await waitFor(() => {
      expect(screen.queryByText('Test message')).not.toBeInTheDocument();
    });
    expect(mockAPI.flagMessage).toHaveBeenCalledWith('msg-1');
  });

  // [message-send] Test sending message with real components
  it('[message-send] should allow user to send a text message', async () => {
    // Setup: Render chat with real components
    renderWithProviders(<ChatComponent />, {
      initialMessages: [],
      initialAuth: { userId: 'current-user', isAuthenticated: true }
    });

    // Verify real components are rendered
    expect(screen.getByTestId(TEST_ID.MESSAGE_INPUT)).toBeInTheDocument();
    expect(screen.getByTestId(TEST_ID.SEND_BUTTON)).toBeInTheDocument();
    expect(screen.getByTestId(TEST_ID.MESSAGE_LIST)).toBeInTheDocument();

    // User types in real input component
    fireEvent.changeText(screen.getByTestId(TEST_ID.MESSAGE_INPUT), 'Hello world');

    // User taps real send button
    fireEvent.press(screen.getByTestId(TEST_ID.SEND_BUTTON));

    // Verify message appears in real MessageList component
    await waitFor(() => {
      expect(screen.getByText('Hello world')).toBeInTheDocument();
    });

    // Verify real input is cleared
    expect(screen.getByTestId(TEST_ID.MESSAGE_INPUT)).toHaveDisplayValue('');

    // Verify API call made (mocked boundary)
    expect(mockAPI.sendMessage).toHaveBeenCalledWith({
      text: 'Hello world',
      userId: 'current-user'
    });
  });
});
```

Write integration tests for each flow, organizing them into logical describe blocks by feature area. Focus on testing real component interactions rather than mock behavior.

After writing each test, run it to ensure it passes:
```
yarn test TEST_FILE -- -t "name of the test"
```

Fix any failing tests before moving to the next one. Remember:
- Use real components with testIDs for targeting
- Only mock external boundaries (APIs, navigation)
- Test actual component behavior and user-visible changes
</action-prompt>

<check-prompt>
Check if you can answer YES to the following questions:

- Did you write integration tests for each QA flow?
- Do the tests use real components targeted with testIDs instead of mocks?
- Do the tests use the setup utilities and render full component trees?
- Do the tests simulate realistic user interactions?
- Do the tests verify complete end-to-end workflows?
- Do the tests only mock external boundaries (APIs, navigation)?
- Do all tests pass when run individually?
- Did you include slug references in test descriptions?
- Are tests organized logically by feature area?
</check-prompt>
</write-integration-tests>

<verify-test-coverage>
<action-prompt>
Run all integration tests to verify they work together and provide good coverage of the QA flows with minimal mocking:

```
yarn test TEST_FILE
```

Verify that the integration tests:

1. All Pass: Every test should pass consistently
2. Cover QA Flows: Each QA flow should have a corresponding test
3. Use Real Components: Tests should use real child components with testIDs
4. Test Real Scenarios: Tests should reflect actual user workflows
5. Minimal Mocking: Only external boundaries should be mocked
6. Clear Assertions: Test failures should clearly indicate what went wrong

Create a coverage summary in TEST_FILE:

```typescript
/*
INTEGRATION TEST COVERAGE SUMMARY:

QA FLOWS COVERED:
✅ [message-flagging] - Message flagging with confirmation (real components)
✅ [message-flagging-cancel] - Cancel message flagging (real components)
✅ [message-send] - Send text message (real components)
✅ [message-edit] - Edit existing message (real components)
✅ [navigation-back] - Navigate back from chat (real components)

INTEGRATION TEST CHARACTERISTICS:
- Full component tree rendering: ✅
- Real child components (no mocking): ✅
- Real state management: ✅ 
- Minimal external mocking: ✅
- User-realistic interactions: ✅
- End-to-end workflow validation: ✅
- TestID-based component targeting: ✅

EXTERNAL MOCKS (Minimal - boundaries only):
- API calls (sendMessage, flagMessage, etc.)
- Navigation router
- Platform-specific native modules (in jest.setup.js)

REAL IMPLEMENTATIONS TESTED:
- All child component rendering and behavior
- Component lifecycle and state updates
- User interaction handling
- Cross-component communication
- Conditional rendering logic
- Error handling and edge cases
- Real state management flow

TESTIDS ADDED FOR TARGETING:
- TEST_ID.MESSAGE_LIST: MessageList component
- TEST_ID.MESSAGE_INPUT: Message input field
- TEST_ID.SEND_BUTTON: Send button
- TEST_ID.MESSAGE_ITEM: Individual message items

MOCK ORGANIZATION:
- Global native module mocks: jest.setup.js
- External boundary mocks: TEST_FILE
- NO child component mocks: ✅

TOTAL TESTS: 12
PASSING: 12
REAL COMPONENTS TESTED: All child components
*/
```

If any tests fail or QA flows are missing coverage, identify the gaps and add the necessary tests. If you find any child component mocks that slipped through, remove them and use real components with testIDs instead.
</action-prompt>

<check-prompt>
Check if you can answer YES to the following questions:

- Do all integration tests pass when run together?
- Does each QA flow have corresponding integration test coverage?
- Do the tests use real child components instead of mocks?
- Do the tests use full component trees with minimal external mocking?
- Do the tests accurately simulate the user workflows from QA flows?
- Are only external boundaries (APIs, navigation, native modules) mocked?
- Did you document the test coverage and mock organization?
- Are you satisfied with the integration test coverage achieved using real components?

If any QA flows lack coverage, tests are failing, or child component mocks are still present, repeat the appropriate steps to fix these issues.
</check-prompt>
</verify-test-coverage>

Guidelines:

- If you fail with the check-prompt multiple times, then stop and ask the user for help.
- The user will give you a COMPONENT_FILE and QA test flows. Focus your work on creating integration tests for those specific flows.
- Prioritize testing complete user workflows over individual component behaviors.
- Always prefer real components with testIDs over mocks for child components.
- Keep mocking minimal - only mock external boundaries like APIs, navigation, and native modules.
- Use realistic test data and scenarios that match actual user behavior.
- Focus on testing what users see and experience, not internal implementation details.
- Ensure tests are deterministic and don't depend on timing or external state.
- Organize mocks appropriately: global native modules in jest.setup.js, external boundaries in test files.
- If some QA flows are not feasible to test in integration tests, document this clearly.

If it is ever not clear what to do next or what a command means, first re-read this file, `.claude/commands/integration-test-generator.md`. If that doesn't work, ask the user for help.

When you first get started ask the user for:

- the COMPONENT_FILE they want you to create integration tests for, 
- the TEST_FILE to use to write the tests in,
- and the QA test flows (CSV file or list) that should be converted into integration tests.