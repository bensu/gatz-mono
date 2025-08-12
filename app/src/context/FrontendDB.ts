import { GatzClient } from "../gatz/client";
import * as T from "../gatz/types";

import { appendMessages, byCreatedAtDesc, crdtIsEqual } from "../util";

const getNewDrIds = (
  existingDrs: T.DiscussionResponse[],
  incomingDrs: T.ShallowDiscussionResponse[]
): Set<T.Discussion["id"]> => {
  const existingDids = new Set(existingDrs.filter(Boolean).map((dr) => dr.discussion.id));
  const incomingDids = new Set(incomingDrs.filter(Boolean).map((dr) => dr.discussion.id));
  return new Set(Array.from(incomingDids).filter((did) => !existingDids.has(did)));
}

const getNewFeedItemIds = (
  existingItems: T.FeedItem[],
  incomingItems: T.FeedItem[]
): Set<T.FeedItem["id"]> => {
  const existingIds = new Set(existingItems.filter(Boolean).map((item) => item.id));
  const incomingIds = new Set(incomingItems.filter(Boolean).map((item) => item.id));
  return new Set(Array.from(incomingIds).filter((id) => !existingIds.has(id)));
}

const isContactEqual = (a: T.Contact | null | undefined, b: T.Contact | null | undefined): boolean => {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.id === b.id && a.name === b.name && a.avatar === b.avatar;
}

enum ObjectType {
  User = "user",
  Discussion = "discussion",
}

const callListener = (l: Function) => {
  try {
    l();
  } catch (e) {
    console.error("error while calling listener");
    console.error(e);
  }
};

const MISSING_USER: T.Contact = {
  id: "deleted",
  name: "[deleted]",
  avatar: "",
};

export type ListenerId = string;

type UserListener = (u: T.Contact) => void;
type GroupListener = (u: T.Group) => void;
type DiscussionListener = (d: T.Discussion) => void;
type DiscussionResponseListener = (d: T.DiscussionResponse) => void;
type MentionResponseListener = (d: T.MentionResponse) => void;
type DeleteMessageListener = (
  did: T.Discussion["id"],
  mid: T.Message["id"],
) => void;
type FeedItemListener = (item: T.FeedItem) => void;

// Generalized listener management
interface EntityListenerManager<T, K extends string | number = string> {
  addListener(id: K, listener: (entity: T) => void): ListenerId;
  removeListener(id: K, listenerId: ListenerId): void;
  notifyListeners(id: K, entity: T): void;
}

interface EntityListenerManagerOptions<T> {
  isEqual?: (a: T, b: T) => boolean;
  onBeforeNotify?: (entity: T) => void;
}

interface ListListenerManager<T> {
  addListener(listener: (entities: T[]) => void): ListenerId;
  removeListener(listenerId: ListenerId): void;
  notifyListeners(entities: T[]): void;
}

interface ArrayListListenerManager<T> {
  addListener(listener: (entities: T[]) => void): void;
  notifyListeners(entities: T[]): void;
}

interface SingleValueListenerManager<T> {
  addListener(listener: (entity: T) => void): ListenerId;
  removeListener(listenerId: ListenerId): void;
  notifyListeners(entity: T): void;
}

interface IdListListenerManager<K extends string | number = string> {
  addListener(listener: (ids: K[]) => void): ListenerId;
  removeListener(listenerId: ListenerId): void;
  notifyListeners(ids: K[]): void;
}

class EntityListenerManagerImpl<T, K extends string | number = string> implements EntityListenerManager<T, K> {
  private listeners: Record<K, Record<ListenerId, (entity: T) => void>> = {} as Record<K, Record<ListenerId, (entity: T) => void>>;
  private getListenerId: () => ListenerId;

  constructor(getListenerId: () => ListenerId) {
    this.getListenerId = getListenerId;
  }

  addListener(id: K, listener: (entity: T) => void): ListenerId {
    const listenerId = this.getListenerId();
    const entityListeners = this.listeners[id] || {};
    entityListeners[listenerId] = listener;
    this.listeners[id] = entityListeners;
    return listenerId;
  }

  removeListener(id: K, listenerId: ListenerId): void {
    if (this.listeners[id]?.[listenerId]) {
      delete this.listeners[id][listenerId];
    }
  }

  notifyListeners(id: K, entity: T): void {
    const entityListeners = this.listeners[id];
    if (entityListeners) {
      Object.values(entityListeners).forEach(listener => {
        if (listener) callListener(() => listener(entity));
      });
    }
  }
}

class ListListenerManagerImpl<T> implements ListListenerManager<T> {
  private listeners: Record<ListenerId, (entities: T[]) => void> = {};
  private getListenerId: () => ListenerId;

  constructor(getListenerId: () => ListenerId) {
    this.getListenerId = getListenerId;
  }

  addListener(listener: (entities: T[]) => void): ListenerId {
    const listenerId = this.getListenerId();
    this.listeners[listenerId] = listener;
    return listenerId;
  }

  removeListener(listenerId: ListenerId): void {
    delete this.listeners[listenerId];
  }

  notifyListeners(entities: T[]): void {
    Object.values(this.listeners).forEach(listener => {
      if (listener) callListener(() => listener(entities));
    });
  }
}

class IdListListenerManagerImpl<K extends string | number = string> implements IdListListenerManager<K> {
  private listeners: Record<ListenerId, (ids: K[]) => void> = {};
  private getListenerId: () => ListenerId;

  constructor(getListenerId: () => ListenerId) {
    this.getListenerId = getListenerId;
  }

  addListener(listener: (ids: K[]) => void): ListenerId {
    const listenerId = this.getListenerId();
    this.listeners[listenerId] = listener;
    return listenerId;
  }

  removeListener(listenerId: ListenerId): void {
    delete this.listeners[listenerId];
  }

  notifyListeners(ids: K[]): void {
    Object.values(this.listeners).forEach(listener => {
      if (listener) callListener(() => listener(ids));
    });
  }
}

class ArrayListListenerManagerImpl<T> implements ArrayListListenerManager<T> {
  private listeners: ((entities: T[]) => void)[] = [];

  addListener(listener: (entities: T[]) => void): void {
    this.listeners.push(listener);
  }

  notifyListeners(entities: T[]): void {
    this.listeners.forEach(listener => {
      if (listener) callListener(() => listener(entities));
    });
  }
}

class SingleValueListenerManagerImpl<T> implements SingleValueListenerManager<T> {
  private listeners: Record<ListenerId, (entity: T) => void> = {};
  private getListenerId: () => ListenerId;

  constructor(getListenerId: () => ListenerId) {
    this.getListenerId = getListenerId;
  }

  addListener(listener: (entity: T) => void): ListenerId {
    const listenerId = this.getListenerId();
    this.listeners[listenerId] = listener;
    return listenerId;
  }

  removeListener(listenerId: ListenerId): void {
    delete this.listeners[listenerId];
  }

  notifyListeners(entity: T): void {
    Object.values(this.listeners).forEach(listener => {
      if (listener) callListener(() => listener(entity));
    });
  }
}

/**
 * Main frontend database class that manages all client-side data and state.
 * 
 * This class serves as the central data store for the application, managing
 * users, discussions, messages, and feed items with real-time updates.
 * 
 * Key functionality and invariants:
 * - [singleton-per-client] Each GatzClient instance should have its own FrontendDB
 * - [in-memory-storage] All data is stored in memory and not persisted
 * - [listener-pattern] Uses event listeners for reactive updates
 * - [transaction-batching] Batches multiple updates to reduce listener calls
 * - [crdt-consistency] Uses CRDT equality checks to prevent unnecessary updates
 * 
 * This pattern provides:
 * - Centralized state management for the entire application
 * - Real-time updates through listener pattern
 * - Efficient batching of updates during transactions
 * - Consistent data access across all components
 * 
 * The database manages:
 * - User profiles and contacts
 * - Discussion threads and messages
 * - Feed items and their ordering
 * - Group memberships
 * - Invite links and contact requests
 * 
 * Used throughout the application as the primary data store,
 * ensuring consistent state and efficient updates.
 */
export class FrontendDB {
  // Unique identifier for the frontend db instance
  _id: string;

  _users: { [id: T.Contact["id"]]: T.Contact } = {};
  _userListeners: Record<T.Contact["id"], Record<ListenerId, (user: T.Contact) => void>> = {};

  _discussions: { [id: T.Discussion["id"]]: T.Discussion } = {};
  _discussionListeners: Record<
    T.Discussion["id"],
    Record<ListenerId, DiscussionListener>
  > = {};

  _discussionResponses: { [id: T.Discussion["id"]]: T.DiscussionResponse } = {};
  _drListeners: Record<
    T.Discussion["id"],
    Record<ListenerId, DiscussionResponseListener>
  > = {};

  _deleteMessageListeners: Record<
    T.Discussion["id"],
    Record<ListenerId, DeleteMessageListener>
  > = {};

  _userListListeners: ((users: T.Contact[]) => void)[] = [];
  _discussionListListeners: ((ds: T.Discussion[]) => void)[] = [];
  _drListListeners: Record<ListenerId, (drs: T.DiscussionResponse[]) => void> =
    {};

  _feedItems: Record<T.FeedItem["id"], T.FeedItem> = {};
  _feedItemListeners: Record<T.FeedItem["id"], Record<ListenerId, FeedItemListener>> = {};
  _feedItemListListeners: Record<ListenerId, (items: T.FeedItem[]) => void> = {};
  _feedItemDirty = false;

  _myContacts: Set<T.Contact["id"]> = new Set();

  _gatzClient: GatzClient;

  /**
   * Creates a new FrontendDB instance bound to a specific GatzClient.
   * 
   * Key functionality and invariants:
   * - [client-binding] Each instance is permanently bound to one GatzClient
   * - [unique-id] Generates a unique random ID for debugging/tracking
   * - [empty-initialization] Starts with empty data structures
   * 
   * @param gatzClient - The GatzClient instance for API communication
   */
  constructor(gatzClient: GatzClient) {
    this._gatzClient = gatzClient;
    this._id = Math.random().toString();
    
    // Initialize listener managers
    this._groupEntityListenerManager = new EntityListenerManagerImpl(() => this._getListenerId());
    this._groupListListenerManager = new ArrayListListenerManagerImpl();
    this._inviteLinkEntityListenerManager = new EntityListenerManagerImpl(() => this._getListenerId());
    this._meListenerManager = new SingleValueListenerManagerImpl(() => this._getListenerId());
    this._pendingContactRequestsCountListenerManager = new SingleValueListenerManagerImpl(() => this._getListenerId());
  }

  _getListenerId(): ListenerId {
    return Math.random().toString();
  }

  // While in a transaction, we don't call list listeners immediately
  // so that we can only call them once at the end of the transaction
  _inTransaction = false;

  /**
   * Executes multiple database operations atomically with batched listener updates.
   * 
   * Key functionality and invariants:
   * - [atomic-execution] All operations within the transaction complete together
   * - [deferred-listeners] List listeners are called once after all operations
   * - [dirty-tracking] Tracks which data types changed during transaction
   * - [exception-safety] Always resets transaction state even if errors occur
   * - [single-notification] Each listener type is called at most once per transaction
   * 
   * This pattern provides:
   * - Improved performance by batching listener notifications
   * - Consistent state updates across multiple operations
   * - Reduced UI re-renders during complex updates
   * 
   * The transaction includes:
   * - Setting the transaction flag to defer list listeners
   * - Executing the provided function
   * - Calling all dirty list listeners once at the end
   * 
   * Used for bulk operations like loading feed data or processing
   * multiple related updates that should appear atomic to listeners.
   * 
   * @param f - Function containing database operations to execute atomically
   */
  transaction(f: () => void): void {
    this._inTransaction = true; // [atomic-execution] [deferred-listeners]
    try {
      f(); // [atomic-execution]
    } finally {
      this._inTransaction = false; // [exception-safety]
    }
    // [dirty-tracking] [single-notification]
    if (this._usersDirty) {
      this._callUserListeners();
    }
    if (this._groupDirty) {
      this._callGroupListeners();
    }
    if (this._dsListDirty) {
      this._callDiscussionListeners();
    }
    if (this._drsDirty) {
      this._callDRListeners();
    }
    if (this._feedItemDirty) {
      this._callFeedItemListeners();
    }
    if (this._feedItemIdsDirty) {
      this._callFeedItemIdsListeners();
    }
    if (this._drIdsDirty) {
      this._callDRIdsListeners();
    }
  }

  _drsDirty = false;
  _callDRListeners(): void {
    const listListeners = this._drListListeners;

    // Cache the DRs to avoid repeated getAllDRs calls
    const drs = this.getAllDRs();

    // Batch all listener calls in a single microtask to avoid blocking the main thread
    Promise.resolve().then(() => {
      Object.values(listListeners).forEach((l) => callListener(() => l(drs)));
    });

    this._drsDirty = false;
  }

  _dsListDirty = false;
  _callDiscussionListeners(): void {
    const listListeners = this._discussionListListeners;
    const ds = this.getAllDiscussions();
    listListeners.forEach((l) => callListener(() => l(ds)));
    this._dsListDirty = false;
  };

  _usersDirty = false;
  _callUserListeners(): void {
    const listListeners = this._userListListeners;
    const users = this.getAllUsers();
    listListeners.forEach((l) => callListener(() => l(users)));
    this._usersDirty = false;
  }

  // Me

  _me: T.User;

  /**
   * Returns the currently authenticated user.
   * 
   * Key functionality and invariants:
   * - [nullable-return] Returns undefined if no user is authenticated
   * - [immutable-read] Returns the stored user object without modification
   * - [no-side-effects] Pure getter with no state changes
   * 
   * @returns The authenticated user or undefined
   */
  getMe(): T.User | undefined {
    return this._me;
  }

  /**
   * Sets the currently authenticated user and notifies listeners.
   * 
   * Key functionality and invariants:
   * - [self-exclusion] Removes self from contacts list to prevent self-messaging
   * - [listener-notification] Immediately notifies all me listeners
   * - [overwrites-existing] Replaces any previously set user
   * 
   * This pattern ensures:
   * - The authenticated user is not in their own contacts list
   * - All components listening to auth state are updated
   * - Consistent state between me and contacts
   * 
   * @param u - The authenticated user object
   */
  setMe(u: T.User) {
    this._me = u; // [overwrites-existing]
    this._myContacts.delete(u.id); // [self-exclusion]
    this._callMeListeners(); // [listener-notification]
  }
  _meListeners: Record<ListenerId, (u: T.User) => void> = {};
  _meListenerManager: SingleValueListenerManager<T.User>;

  /**
   * Adds a listener for authenticated user changes.
   * 
   * Key functionality and invariants:
   * - [unique-listener-id] Generates unique ID for each listener
   * - [listener-storage] Stores listener in internal map for later removal
   * - [returns-id] Returns ID for later removal
   * 
   * @param listener - Callback invoked when authenticated user changes
   * @returns Unique listener ID for removal
   */
  addMeListener(listener: (u: T.User) => void): ListenerId {
    return this._meListenerManager.addListener(listener);
  }
  /**
   * Removes a previously registered me listener.
   * 
   * Key functionality and invariants:
   * - [idempotent-removal] Safe to call multiple times with same ID
   * - [no-error-on-missing] Does not throw if listener doesn't exist
   * 
   * @param lId - Listener ID returned from addMeListener
   */
  removeMeListener(lId: ListenerId) {
    this._meListenerManager.removeListener(lId);
  }
  _callMeListeners() {
    const me = this._me;
    if (me) {
      this._meListenerManager.notifyListeners(me);
    }
  }

  // Contacts

  /**
   * Adds a contact ID to the user's contact list.
   * 
   * Key functionality and invariants:
   * - [self-exclusion] Prevents adding self as contact
   * - [idempotent-add] Safe to call multiple times with same ID
   * - [set-deduplication] Uses Set to prevent duplicates
   * 
   * @param id - Contact ID to add
   */
  addContactId(id: T.Contact["id"]): void {
    const me = this.getMe();
    if (me && me.id === id) { // [self-exclusion]
      return;
    } else {
      this._myContacts.add(id); // [idempotent-add] [set-deduplication]
    }
  }
  /**
   * Removes a contact ID from the user's contact list.
   * 
   * Key functionality and invariants:
   * - [idempotent-removal] Safe to call even if ID not in list
   * - [no-validation] Does not check if contact exists
   * 
   * @param id - Contact ID to remove
   */
  removeContactId(id: T.Contact["id"]): void {
    this._myContacts.delete(id);
  }
  /**
   * Returns the set of contact IDs for the current user.
   * 
   * Key functionality and invariants:
   * - [returns-reference] Returns the actual Set, not a copy
   * - [excludes-self] Never contains the authenticated user's ID
   * 
   * @returns Set of contact IDs
   */
  getMyContacts(): Set<T.Contact["id"]> {
    return this._myContacts;
  }
  /**
   * Checks if a given ID is in the user's contact list.
   * 
   * Key functionality and invariants:
   * - [null-check] Throws error if ID is null/undefined
   * - [boolean-return] Returns true if contact, false otherwise
   * - [excludes-self] Returns false for authenticated user's ID
   * 
   * @param id - Contact ID to check
   * @returns True if ID is a contact
   * @throws Error if id is undefined
   */
  isMyContact(id: T.Contact["id"]): boolean {
    if (!id) { // [null-check]
      throw new Error("id is undefined");
    }
    return this._myContacts.has(id); // [boolean-return] [excludes-self]
  }

  // Default flag values
  _flags: T.FeatureFlags = {
    "post_to_friends_of_friends": false,
    "global_invites_enabled": true,
  };

  _pendingContactRequests: T.PendingContactRequest[] = [];
  _pendingContactRequestsCountListeners: Record<ListenerId, ((cr: number) => void)> = {}
  _pendingContactRequestsCountListenerManager: SingleValueListenerManager<number>;
  /**
   * Adds pending contact requests to the database.
   * 
   * Key functionality and invariants:
   * - [append-only] Adds to existing requests, doesn't replace
   * - [listener-notification] Notifies count listeners after adding
   * - [array-push] Uses push to maintain order
   * 
   * @param cr - Array of pending contact requests to add
   */
  addPendingContactRequests(cr: T.PendingContactRequest[]) {
    cr.forEach((c) => this._pendingContactRequests.push(c)); // [append-only] [array-push]
    this._callPendingContactRequestsCountListeners(); // [listener-notification]
  }
  /**
   * Returns the count of pending contact requests.
   * 
   * Key functionality and invariants:
   * - [array-length] Returns length of requests array
   * - [zero-when-empty] Returns 0 for no requests
   * - [no-side-effects] Pure getter function
   * 
   * @returns Number of pending contact requests
   */
  getPendingContactRequestsCount(): number {
    return this._pendingContactRequests.length;
  }
  /**
   * Removes a pending contact request by ID.
   * 
   * Key functionality and invariants:
   * - [filter-removal] Creates new array without the request
   * - [listener-notification] Notifies count listeners after removal
   * - [idempotent] Safe to call with non-existent ID
   * 
   * @param crId - ID of the contact request to remove
   */
  removePendingContactRequest(crId: T.PendingContactRequest["id"]) {
    this._pendingContactRequests = this._pendingContactRequests.filter((c) => c.id !== crId); // [filter-removal] [idempotent]
    this._callPendingContactRequestsCountListeners(); // [listener-notification]
  }
  listenToPendingContactRequestsCount(listener: (cr: number) => void): ListenerId {
    return this._pendingContactRequestsCountListenerManager.addListener(listener);
  }
  removePendingContactRequestsCountListener(lId: ListenerId) {
    this._pendingContactRequestsCountListenerManager.removeListener(lId);
  }
  _callPendingContactRequestsCountListeners() {
    const count = this._pendingContactRequests.length;
    this._pendingContactRequestsCountListenerManager.notifyListeners(count);
  }


  /**
   * Processes and stores the result of a Me API call.
   * 
   * Key functionality and invariants:
   * - [partial-update] Handles partial responses gracefully
   * - [self-as-contact] Adds authenticated user to users list
   * - [contact-filtering] Filters out self from contacts list
   * - [bulk-storage] Stores all related data (users, groups, contacts)
   * - [feature-flags] Updates feature flags from server
   * 
   * This pattern ensures:
   * - All user data is consistently updated from API response
   * - Self is available as a user but not as a contact
   * - Related entities are stored for later reference
   * 
   * The processing includes:
   * - Setting the authenticated user
   * - Adding all groups the user belongs to
   * - Adding all contacts (excluding self)
   * - Processing pending contact requests
   * - Updating feature flags
   * 
   * @param me - Partial Me API response containing user data
   */
  storeMeResult(me: Partial<T.MeAPIResponse>) {
    const { user, groups, contacts, flags, contact_requests } = me; // [partial-update]
    if (user) {
      this.setMe(user);
      // Extract only Contact fields from User
      const userAsContact: T.Contact = { // [self-as-contact]
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        profile: user.profile
      };
      this.addUser(userAsContact);
    }
    if (groups) { // [bulk-storage]
      groups.forEach((g) => this.addGroup(g));
    }
    if (contacts) {
      contacts
        .filter((c) => user && c.id !== user.id) // [contact-filtering]
        .forEach((c) => this.addUser(c));
      contacts
        .filter((c) => user && c.id !== user.id) // [contact-filtering]
        .forEach((c) => this.addContactId(c.id));
    }
    if (contact_requests) {
      this.addPendingContactRequests(contact_requests);
    }
    if (flags) { // [feature-flags]
      this._flags = flags.values;
    }
  }

  /**
   * Gets the value of a feature flag.
   * 
   * Key functionality and invariants:
   * - [default-false] Returns false for undefined flags
   * - [boolean-coercion] Ensures boolean return value
   * - [no-validation] Doesn't validate flag name
   * 
   * @param flag - Feature flag name to check
   * @returns Boolean value of the flag
   */
  getFeatureFlag(flag: T.FeatureFlag): boolean {
    return this._flags[flag] || false; // [default-false] [boolean-coercion]
  }

  // Users

  _nameToUser = new Map<T.Contact["name"], T.Contact>();

  /**
   * Looks up a user by their name.
   * 
   * Key functionality and invariants:
   * - [nullable-return] Returns undefined if name not found
   * - [name-index] Uses name-to-user map for fast lookup
   * - [last-user-wins] If multiple users have same name, returns last added
   * 
   * @param name - User name to search for
   * @returns User object or undefined
   */
  maybeUserByName(name: T.Contact["name"]): T.Contact | undefined {
    return this._nameToUser.get(name); // [nullable-return] [name-index] [last-user-wins]
  }

  /**
   * Adds or updates a user in the database.
   * 
   * Key functionality and invariants:
   * - [null-safe] Ignores undefined/null users
   * - [equality-check] Only updates if user data has changed
   * - [name-mapping] Maintains name-to-user lookup map
   * - [listener-notification] Notifies both individual and list listeners
   * - [transaction-aware] Defers list listeners during transactions
   * 
   * This pattern ensures:
   * - Efficient updates by skipping unchanged data
   * - Fast lookup by name for mentions and search
   * - Reactive UI updates through listeners
   * 
   * The update process:
   * - Checks if user data has actually changed using isContactEqual
   * - Updates both ID and name indexes
   * - Notifies individual user listeners immediately
   * - Defers list listeners if in transaction
   * 
   * @param user - User object to add or update
   */
  addUser(user: T.Contact | undefined) {
    if (user) { // [null-safe]
      const oldUser = this._users[user.id];
      // Only update if the user has changed
      if (!oldUser || !isContactEqual(oldUser, user)) { // [equality-check]
        this._users[user.id] = user;

        this._nameToUser.set(user.name, user); // [name-mapping]

        const listenersMap = this._userListeners[user.id];
        if (listenersMap) {
          Object.values(listenersMap).forEach((l) => l && callListener(() => l(user))); // [listener-notification]
        }
        // while in a transaction, we don't call listeners immediately
        if (this._inTransaction) { // [transaction-aware]
          this._usersDirty = true;
        } else {
          this._callUserListeners();
        }
      }
    }
  }

  listenToUser(id: T.Contact["id"], listener: (user: T.Contact) => void): ListenerId {
    const ls = this._userListeners[id] || {};
    const lId = this._getListenerId();
    ls[lId] = listener;
    this._userListeners[id] = ls;
    return lId;
  }

  removeUserListener(id: T.Contact["id"], lid: ListenerId) {
    delete this._userListeners[id][lid];
  }

  listenToUsers(listener: (users: T.Contact[]) => void) {
    const ls = this._userListListeners || [];
    ls.push(listener);
    this._userListListeners = ls;
  }

  /**
   * Gets a user by ID, returning undefined if not found.
   * 
   * Key functionality and invariants:
   * - [nullable-return] Returns undefined if user not found
   * - [no-placeholder] Does not create placeholder objects
   * - [direct-lookup] Simple map lookup with no side effects
   * 
   * @param id - User ID to look up
   * @returns User object or undefined
   */
  maybeGetUserById(id: T.Contact["id"]): T.Contact | undefined {
    return this._users[id]; // [nullable-return] [direct-lookup]
  }

  /**
   * Gets a user by ID, returning a placeholder for missing users.
   * 
   * Key functionality and invariants:
   * - [never-null] Always returns a valid Contact object
   * - [missing-user-placeholder] Returns MISSING_USER with random ID if not found
   * - [unique-missing-id] Each missing user gets a unique random ID
   * 
   * This pattern ensures:
   * - UI can always render something for any user ID
   * - Missing users are visually distinct ([deleted])
   * - No null checks needed in consuming code
   * 
   * @param id - User ID to look up
   * @returns User object or missing user placeholder
   */
  getUserById(id: T.Contact["id"]): T.Contact {
    return this._users[id] || { ...MISSING_USER, id: Math.random().toString() }; // [never-null] [missing-user-placeholder] [unique-missing-id]
  }

  /**
   * Returns all users in the database.
   * 
   * Key functionality and invariants:
   * - [returns-array] Returns array of all stored users
   * - [no-ordering] No guaranteed order of users
   * - [includes-all] Includes all users, even non-contacts
   * 
   * @returns Array of all user objects
   */
  getAllUsers(): T.Contact[] {
    return Object.values(this._users); // [returns-array] [includes-all]
  }

  // ======================================================================
  // Groups

  _groups: { [id: T.Group["id"]]: T.Group } = {};
  _groupListeners: Record<T.Group["id"], Record<ListenerId, GroupListener>> =
    {};
  _groupEntityListenerManager: EntityListenerManager<T.Group>;

  _groupListListeners: ((groups: T.Group[]) => void)[] = [];
  _groupListListenerManager: ArrayListListenerManager<T.Group>;

  _groupDirty = false;
  _callGroupListeners(): void {
    const groups = this.getAllGroups();
    this._groupListListenerManager.notifyListeners(groups);
    this._groupDirty = false;
  }

  /**
   * Adds or updates a group in the database.
   * 
   * Key functionality and invariants:
   * - [null-safe] Ignores undefined/null groups
   * - [overwrites-existing] Replaces existing group with same ID
   * - [listener-notification] Notifies individual and list listeners
   * - [transaction-aware] Defers list listeners during transactions
   * 
   * This pattern ensures:
   * - Groups are efficiently stored and updated
   * - UI components react to group changes
   * - Batch updates don't trigger multiple renders
   * 
   * @param group - Group object to add or update
   */
  addGroup(group: T.Group | undefined) {
    if (group) {
      this._groups[group.id] = group;

      this._groupEntityListenerManager.notifyListeners(group.id, group);
      
      // while in a transaction, we don't call listeners immediately
      if (this._inTransaction) {
        this._groupDirty = true;
      } else {
        this._callGroupListeners();
      }
    }
  }

  listenToGroup(id: T.Group["id"], listener: (g: T.Group) => void): ListenerId {
    return this._groupEntityListenerManager.addListener(id, listener);
  }

  removeGroupListener(id: T.Group["id"], lid: ListenerId) {
    this._groupEntityListenerManager.removeListener(id, lid);
  }

  listenToGroups(listener: (groups: T.Group[]) => void) {
    this._groupListListenerManager.addListener(listener);
  }

  /**
   * Gets a group by ID.
   * 
   * Key functionality and invariants:
   * - [nullable-return] Returns undefined if not found
   * - [direct-lookup] Simple map lookup
   * - [no-validation] Does not validate ID
   * 
   * @param id - Group ID to look up
   * @returns Group object or undefined
   */
  getGroupById(id: T.Group["id"]): T.Group {
    return this._groups[id];
  }

  /**
   * Returns all groups in the database.
   * 
   * Key functionality and invariants:
   * - [returns-array] Returns array of all stored groups
   * - [no-ordering] No guaranteed order of groups
   * - [creates-array] Creates new array on each call
   * 
   * @returns Array of all group objects
   */
  getAllGroups(): T.Group[] {
    return Object.values(this._groups);
  }

  // ======================================================================
  // Invite Links

  _inviteLinkResponses: { [id: T.InviteLink["id"]]: T.InviteLinkResponse } = {};
  _inviteLinkResponseListeners: Record<
    T.InviteLink["id"],
    Record<ListenerId, (il: T.InviteLinkResponse) => void>
  > = {};
  _inviteLinkEntityListenerManager: EntityListenerManager<T.InviteLinkResponse, T.InviteLink["id"]>;
  /**
   * Gets an invite link response by ID.
   * 
   * Key functionality and invariants:
   * - [nullable-return] Returns undefined if not found
   * - [direct-lookup] Simple map lookup
   * - [no-validation] Does not validate ID
   * 
   * @param id - Invite link ID to look up
   * @returns Invite link response or undefined
   */
  getInviteLinkResponseById(
    id: T.InviteLink["id"],
  ): T.InviteLinkResponse | undefined {
    return this._inviteLinkResponses[id];
  }
  /**
   * Adds or updates an invite link response.
   * 
   * Key functionality and invariants:
   * - [null-safe] Ignores undefined/null responses
   * - [id-extraction] Uses invite_link.id as key
   * - [listener-notification] Notifies all registered listeners
   * - [overwrites-existing] Replaces existing response with same ID
   * 
   * @param inviteLink - Invite link response to store
   */
  addInviteLinkResponse(inviteLink: T.InviteLinkResponse | undefined) {
    if (inviteLink) {
      const id = inviteLink.invite_link.id;
      this._inviteLinkResponses[id] = inviteLink;

      this._inviteLinkEntityListenerManager.notifyListeners(id, inviteLink);
    }
  }

  /**
   * Listens to updates for a specific invite link response.
   * For testing purposes - allows registration of listeners for invite link updates.
   */
  listenToInviteLink(
    id: T.InviteLink["id"],
    listener: (inviteLink: T.InviteLinkResponse) => void,
  ): ListenerId {
    return this._inviteLinkEntityListenerManager.addListener(id, listener);
  }

  /**
   * Removes an invite link listener.
   * For testing purposes - allows removal of invite link listeners.
   */
  removeInviteLinkListener(id: T.InviteLink["id"], lid: ListenerId) {
    this._inviteLinkEntityListenerManager.removeListener(id, lid);
  }

  // ======================================================================
  // Discussions

  /**
   * Adds or updates a discussion in the database.
   * 
   * Key functionality and invariants:
   * - [null-safe] Ignores undefined/null discussions
   * - [crdt-equality] Uses CRDT equality to detect changes
   * - [listener-notification] Notifies individual and list listeners
   * - [dr-sync] Optionally updates related DiscussionResponse
   * - [transaction-aware] Defers list listeners during transactions
   * 
   * This pattern ensures:
   * - Consistent state between Discussion and DiscussionResponse
   * - Efficient updates by skipping unchanged data
   * - Proper synchronization of discussion metadata
   * 
   * The update process:
   * - Checks if discussion has changed using CRDT equality
   * - Updates discussion storage
   * - Notifies individual discussion listeners
   * - Updates related DiscussionResponse unless opted out
   * - Defers list listeners if in transaction
   * 
   * @param discussion - Discussion object to add or update
   * @param opts - Options to control DR update behavior
   */
  addDiscussion(discussion?: T.Discussion, opts?: { dontCallDr?: boolean }) {
    if (discussion) { // [null-safe]
      const did = discussion.id;
      const oldDiscussion = this._discussions[did];

      if (!oldDiscussion || !crdtIsEqual(oldDiscussion, discussion)) { // [crdt-equality]
        this._discussions[did] = discussion;

        // Only update if the discussion has changed
        this._discussions[did] = discussion;

        const listeners = this._discussionListeners[did];
        if (listeners) {
          Object.values(listeners).forEach((l) => callListener(() => l(discussion))); // [listener-notification]
        }
        // while in a transaction, we don't call listeners immediately
        if (this._inTransaction) { // [transaction-aware]
          this._dsListDirty = true;
        } else {
          this._callDiscussionListeners();
        }

        if (!opts?.dontCallDr) { // [dr-sync]
          const dr = this.getDRById(did);
          if (dr) {
            this.addDiscussionResponse({
              ...dr,
              discussion: discussion,
            });
          }
        }
      }
    }
  }

  listenToDiscussion(
    id: T.Discussion["id"],
    listener: (d: T.Discussion) => void,
  ): ListenerId {
    const lId = this._getListenerId();
    const listeners = this._discussionListeners[id] || {};
    listeners[lId] = listener;
    this._discussionListeners[id] = listeners;
    return lId;
  }

  /**
   * Gets a specific message from a discussion.
   * 
   * Key functionality and invariants:
   * - [nullable-return] Returns undefined if discussion or message not found
   * - [linear-search] Searches through messages array
   * - [dr-lookup] Requires discussion response to exist
   * 
   * @param did - Discussion ID containing the message
   * @param mid - Message ID to find
   * @returns Message object or undefined
   */
  getMessageById(
    did: T.Discussion["id"],
    mid: T.Message["id"],
  ): T.Message | undefined {
    const dr = this.getDRById(did); // [dr-lookup]
    return dr && dr.messages.find((m) => m.id === mid); // [nullable-return] [linear-search]
  }

  removeDiscussionListener(did: T.Discussion["id"], lid: ListenerId) {
    if (this._discussionListeners[did]) {
      if (this._discussionListeners[did][lid]) {
        delete this._discussionListeners[did][lid];
      }
    }
  }

  listenToDiscussions(listener: (ds: T.Discussion[]) => void) {
    const ls = this._discussionListListeners || [];
    ls.push(listener);
    this._discussionListListeners = ls;
  }

  /**
   * Gets a discussion by ID.
   * 
   * Key functionality and invariants:
   * - [nullable-return] Returns undefined if not found
   * - [direct-lookup] Simple map lookup
   * - [no-validation] Does not validate ID
   * 
   * @param id - Discussion ID to look up
   * @returns Discussion object or undefined
   */
  getDiscussionById(id: T.Discussion["id"]): T.Discussion | undefined {
    return this._discussions[id];
  }

  /**
   * Returns all discussions in the database.
   * 
   * Key functionality and invariants:
   * - [returns-array] Returns array of all stored discussions
   * - [no-ordering] No guaranteed order of discussions
   * - [creates-array] Creates new array on each call
   * 
   * @returns Array of all discussion objects
   */
  getAllDiscussions(): T.Discussion[] {
    return Object.values(this._discussions);
  }

  /**
   * Converts a shallow discussion response to full response and stores it.
   * 
   * Key functionality and invariants:
   * - [user-hydration] Converts user IDs to user objects
   * - [missing-user-handling] Uses MISSING_USER for unknown IDs
   * - [delegation] Delegates to addDiscussionResponse
   * 
   * This pattern allows:
   * - API to send user IDs instead of full objects
   * - Efficient data transfer
   * - Local user lookup from cache
   * 
   * @param sdr - Shallow discussion response with user IDs
   */
  addShallowDiscussionResponse(sdr: T.ShallowDiscussionResponse): void {
    const users = sdr.user_ids.map(
      (id) => this.getUserById(id) || MISSING_USER, // [user-hydration] [missing-user-handling]
    );
    const dr: T.DiscussionResponse = { ...sdr, users };
    this.addDiscussionResponse(dr); // [delegation]
  }

  /**
   * Deletes a message from a discussion.
   * 
   * Key functionality and invariants:
   * - [message-filtering] Removes message by filtering array
   * - [dr-update] Updates the DR to trigger re-renders
   * - [delete-notification] Notifies delete listeners with IDs
   * - [no-error-on-missing] Silently ignores if discussion not found
   * 
   * This pattern ensures:
   * - Messages are properly removed from the UI
   * - Delete animations can be triggered via listeners
   * - The DR is updated to reflect the deletion
   * 
   * @param did - Discussion ID containing the message
   * @param mid - Message ID to delete
j  */
  deleteMessage(did: T.Discussion["id"], mid: T.Message["id"]): void {
    const dr = this.getDRById(did);
    if (dr) { // [no-error-on-missing]
      const newMessages = dr.messages.filter((m) => m.id !== mid); // [message-filtering]
      dr.messages = newMessages;
      this.addDiscussionResponse(dr); // [dr-update]

      const listeners = this._deleteMessageListeners[did];
      if (listeners) {
        Object.values(listeners).forEach((l) =>
          callListener(() => l(dr.discussion.id, mid)), // [delete-notification]
        );
      }
    }
  }

  listenToDeletedMessages(
    did: T.Discussion["id"],
    listener: DeleteMessageListener,
  ): ListenerId {
    const lId = this._getListenerId();
    const listeners = this._deleteMessageListeners[did] || {};
    listeners[lId] = listener;
    this._deleteMessageListeners[did] = listeners;
    return lId;
  }

  removeDeleteMessageListener(did: T.Discussion["id"], lid: ListenerId) {
    if (this._deleteMessageListeners[did]) {
      if (this._deleteMessageListeners[did][lid]) {
        delete this._deleteMessageListeners[did][lid];
      }
    }
  }

  /**
   * Adds or updates a discussion response (discussion with messages and users).
   * 
   * Key functionality and invariants:
   * - [crdt-equality] Uses CRDT equality on discussion for change detection
   * - [first-add-tracking] Tracks if this is the first time adding a DR
   * - [dual-storage] Stores both DR and underlying discussion
   * - [listener-notification] Notifies DR listeners and optionally ID listeners
   * - [transaction-aware] Batches notifications during transactions
   * - [bidirectional-sync] Keeps Discussion and DR in sync
   * 
   * This pattern ensures:
   * - Discussion metadata stays synchronized with DR
   * - Efficient updates by checking CRDT equality
   * - Proper notification of new discussions vs updates
   * 
   * The update process:
   * - Checks if discussion has changed using CRDT equality
   * - Updates DR storage
   * - Notifies individual DR listeners
   * - Notifies ID listeners only on first add
   * - Updates underlying discussion without recursion
   * 
   * @param dr - DiscussionResponse containing discussion, messages, and users
   */
  addDiscussionResponse(dr: T.DiscussionResponse): void {
    const did = dr.discussion.id;
    if (dr && dr.discussion) {
      const oldDr = this._discussionResponses[did];
      const isFirstAdd = !oldDr; // [first-add-tracking]

      if (!oldDr || !crdtIsEqual(oldDr.discussion, dr.discussion)) { // [crdt-equality]

        this._discussionResponses[did] = dr; // [dual-storage]

        const listenersMap = this._drListeners[did];
        if (listenersMap) {
          Object.values(listenersMap).forEach((l) => callListener(() => l(dr))); // [listener-notification]
        }

        // while in a transaction, we don't call list listeners immediately
        if (this._inTransaction) { // [transaction-aware]
          this._drsDirty = true;
          if (isFirstAdd) {
            this._drIdsDirty = true;
          }
        } else {
          if (isFirstAdd) {
            this._callDRIdsListeners();
          }
          this._callDRListeners();
        }

        this.addDiscussion(dr.discussion, { dontCallDr: true }); // [bidirectional-sync]
      }
    }
  }

  _drIdsDirty = false;
  _drIdsListeners: Record<ListenerId, (ids: T.Discussion["id"][]) => void> = {};
  _callDRIdsListeners(): void {
    const listeners = this._drIdsListeners;
    const ids = Object.keys(this._discussionResponses);
    if (listeners) {
      Object.values(listeners).forEach((l) => callListener(() => l(ids)));
    }
    this._drIdsDirty = false;
  }
  /**
   * Returns all discussion response IDs.
   * 
   * Key functionality and invariants:
   * - [returns-ids] Returns array of discussion IDs
   * - [string-array] Returns string IDs from object keys
   * - [no-ordering] No guaranteed order of IDs
   * 
   * @returns Array of discussion IDs that have responses
   */
  getAllDRIds(): T.Discussion["id"][] {
    return Object.keys(this._discussionResponses);
  }

  listenToDRIds(listener: (ids: T.Discussion["id"][]) => void): ListenerId {
    const lid = this._getListenerId();
    this._drIdsListeners[lid] = listener;
    return lid;
  }
  removeDRIdsListener(lid: ListenerId) {
    if (this._drIdsListeners[lid]) {
      delete this._drIdsListeners[lid];
    }
  }

  /**
   * Appends a message to an existing discussion.
   * 
   * Key functionality and invariants:
   * - [message-ordering] Uses appendMessages for proper ordering
   * - [discussion-update] Optionally updates discussion metadata
   * - [error-on-missing] Throws if discussion doesn't exist
   * - [atomic-update] Updates both messages and discussion together
   * 
   * This pattern ensures:
   * - Messages are properly ordered when appended
   * - Discussion metadata can be updated with new message
   * - Fails fast if trying to add to non-existent discussion
   * 
   * @param m - Message to append
   * @param d - Optional updated discussion metadata
   * @throws Error if discussion not found
   */
  appendMessage(m: T.Message, d?: T.Discussion): void {
    const dr = this.getDRById(m.did);
    if (dr) {
      this.addDiscussionResponse({
        ...dr,
        discussion: d || dr.discussion, // [discussion-update]
        messages: appendMessages(dr.messages, [m]), // [message-ordering]
      }); // [atomic-update]
    } else {
      throw new Error("Discussion not found"); // [error-on-missing]
    }
  }

  /**
   * Gets a discussion response by discussion ID.
   * 
   * Key functionality and invariants:
   * - [nullable-return] Returns undefined if not found
   * - [direct-lookup] Simple map lookup by discussion ID
   * - [includes-messages] Returns full response with messages and users
   * 
   * @param id - Discussion ID to look up
   * @returns Discussion response with messages and users, or undefined
   */
  getDRById(id: T.Discussion["id"]): T.DiscussionResponse | undefined {
    return this._discussionResponses[id];
  }

  listenToDR(
    id: T.Discussion["id"],
    listener: (drs: T.DiscussionResponse) => void,
  ): string {
    const lid = this._getListenerId();
    const listeners = this._drListeners[id] || {};
    listeners[lid] = listener;
    this._drListeners[id] = listeners;
    return lid;
  }

  removeDRListener(id: T.Discussion["id"], lid: string) {
    delete this._drListeners[id][lid];
  }

  /**
   * Returns all discussion responses in the database.
   * 
   * Key functionality and invariants:
   * - [returns-array] Returns array of all discussion responses
   * - [no-ordering] No guaranteed order of responses
   * - [includes-messages] Each response includes messages and users
   * 
   * @returns Array of all discussion response objects
   */
  getAllDRs(): T.DiscussionResponse[] {
    return Object.values(this._discussionResponses);
  }

  // Use Feeds

  _callFeedItemListeners(): void {
    const listeners = Object.values(this._feedItemListListeners);
    const items = this.getAllFeedItems();
    if (listeners) {
      listeners.forEach((l) => callListener(() => l(items)));
    }
  }

  /**
   * Adds or updates a feed item in the database.
   * 
   * Key functionality and invariants:
   * - [first-add-tracking] Tracks if this is a new feed item
   * - [listener-notification] Notifies item and list listeners
   * - [id-listener-update] Only notifies ID listeners on first add
   * - [transaction-aware] Batches notifications during transactions
   * - [overwrite-existing] Replaces existing items with same ID
   * 
   * This pattern ensures:
   * - Feed items are efficiently updated
   * - New items trigger ID list updates
   * - Updates don't trigger unnecessary ID notifications
   * 
   * @param item - Feed item to add or update
   */
  addFeedItem(item: T.FeedItem): void {
    const isFirstAdd = !this._feedItems[item.id]; // [first-add-tracking]
    const oldItem = this._feedItems[item.id];
    
    // Check if dismissed_by has changed
    const dismissedByChanged = oldItem && 
      JSON.stringify(oldItem.dismissed_by || []) !== JSON.stringify(item.dismissed_by || []);

    this._feedItems[item.id] = item; // [overwrite-existing]
    const listeners = this._feedItemListeners[item.id];
    if (listeners) {
      Object.values(listeners).forEach((l) => callListener(() => l(item))); // [listener-notification]
    }

    // call the list listeners only if not in transaction
    if (!this._inTransaction) { // [transaction-aware]
      this._callFeedItemListeners();
      if (isFirstAdd || dismissedByChanged) { // [id-listener-update]
        this._callFeedItemIdsListeners();
      }
    } else {
      this._feedItemDirty = true;
      this._feedItemIdsDirty = true;
    }
  }
  _feedItemIdsDirty = false;

  listenToFeedItem(id: T.FeedItem["id"], listener: FeedItemListener): ListenerId {
    const lid = this._getListenerId();
    const listeners = this._feedItemListeners[id] || {};
    listeners[lid] = listener;
    this._feedItemListeners[id] = listeners;
    return lid;
  }

  listenToFeedItems(listener: (items: T.FeedItem[]) => void): ListenerId {
    const lid = this._getListenerId();
    this._feedItemListListeners[lid] = listener;
    return lid;
  }

  removeFeedItemListener(lid: ListenerId) {
    if (this._feedItemListeners[lid]) {
      delete this._feedItemListeners[lid];
    }
  }

  removeFeedItemListListener(lid: ListenerId) {
    if (this._feedItemListListeners[lid]) {
      delete this._feedItemListListeners[lid];
    }
  }

  _feedItemIdsListeners: Record<ListenerId, (ids: T.FeedItem["id"][]) => void> = {};

  listenToFeedItemIds(listener: (ids: T.FeedItem["id"][]) => void): ListenerId {
    const lid = this._getListenerId();
    this._feedItemIdsListeners[lid] = listener;
    return lid;
  }
  removeFeedItemIdsListener(lid: ListenerId) {
    if (this._feedItemIdsListeners[lid]) {
      delete this._feedItemIdsListeners[lid];
    }
  }
  /**
   * Returns all feed item IDs in sorted order.
   * 
   * Key functionality and invariants:
   * - [sorted-ids] Returns IDs in alphabetical order
   * - [stable-order] Consistent ordering across calls
   * - [string-array] Returns array of string IDs
   * 
   * @returns Array of feed item IDs sorted alphabetically
   */
  getAllFeedItemIds(): T.FeedItem["id"][] {
    return Object.keys(this._feedItems).sort(); // [sorted-ids] [stable-order]
  }
  _callFeedItemIdsListeners() {
    const ids = this.getAllFeedItemIds();
    Object.values(this._feedItemIdsListeners).forEach((l) => l(ids));
    this._feedItemIdsDirty = false;
  }

  /**
   * Returns all feed items sorted by creation date.
   * 
   * Key functionality and invariants:
   * - [sorted-output] Always returns items sorted newest first
   * - [creates-array] Creates new array on each call
   * - [includes-all] Includes all stored feed items
   * 
   * @returns Array of feed items sorted by created_at descending
   */
  getAllFeedItems(): T.FeedItem[] {
    return Object.values(this._feedItems).sort(byCreatedAtDesc); // [sorted-output] [creates-array]
  }

  /**
   * Gets a feed item by ID.
   * 
   * Key functionality and invariants:
   * - [nullable-return] Returns undefined if not found
   * - [direct-lookup] Simple map lookup
   * - [no-validation] Does not validate ID
   * 
   * @param id - Feed item ID to look up
   * @returns Feed item or undefined
   */
  getFeedItemById(id: T.FeedItem["id"]): T.FeedItem {
    return this._feedItems[id];
  }

  _lastFeedFetchTs: Map<
    string, // JSON.stringify(T.FeedQuery)
    {
      ts: Date;
      result: { drs: T.DiscussionResponse[] };
    }
  > = new Map();

  /**
   * Processes a feed response directly (for testing).
   * Handles both 'discussions' and 'items' formats.
   */
  processFeed(r: T.FeedAPIResponse): void {
    let drs: T.ShallowDiscussionResponse[] = [];
    if ("discussions" in r) {
      drs = r.discussions;
    } else if ("items" in r && r.items) {
      drs = r.items
        ?.filter((item) => item.ref_type === "discussion")
        .map((item) => item.ref)
        .map((d): T.ShallowDiscussionResponse => {
          // Ensure we're only using actual Discussion types
          if ('messages' in d && 'members' in d) {
            return {
              discussion: d as T.Discussion,
              messages: d.messages as T.Message[],
              user_ids: d.members as T.User["id"][],
            }
          } else {
            throw new Error("Invalid discussion type");
          }
        }) || [];
    }
    this.transaction(() => {
      r.users.forEach((u) => this.addUser(u));
      r.groups.forEach((g) => this.addGroup(g));
      drs?.forEach((sdr) => this.addShallowDiscussionResponse(sdr));
      if ("items" in r) {
        r.items?.forEach((item) => this.addFeedItem(item));
      }
    });
  }

  async _fetchFeed(fq: T.FeedQuery): Promise<{ drs: T.DiscussionResponse[] }> {
    const r = await this._gatzClient.getFeed(fq);
    let drs: T.ShallowDiscussionResponse[]
    if ("discussions" in r) {
      drs = r.discussions;
    } else {
      drs = r.items
        ?.filter((item) => item.ref_type === "discussion")
        .map((item) => item.ref)
        .map((d): T.ShallowDiscussionResponse => {
          // Ensure we're only using actual Discussion types
          if ('messages' in d && 'members' in d) {
            return {
              discussion: d as T.Discussion,
              messages: d.messages as T.Message[],
              user_ids: d.members as T.User["id"][],
            }
          } else {
            throw new Error("Invalid discussion type");
          }
        });
    }
    this.transaction(() => {
      r.users.forEach((u) => this.addUser(u));
      r.groups.forEach((g) => this.addGroup(g));
      drs?.forEach((sdr) => this.addShallowDiscussionResponse(sdr));
      if ("items" in r) {
        r.items?.forEach((item) => this.addFeedItem(item));
      }
    });
    return { drs: drs.map((sdr) => this.getDRById(sdr.discussion.id)) };
  }

  _incomingFeed: { items: Set<T.FeedItem["id"]> } = { items: new Set() };

  /**
   * Returns count of pending incoming feed items.
   * 
   * Key functionality and invariants:
   * - [set-size] Returns size of incoming items Set
   * - [zero-when-empty] Returns 0 for empty incoming feed
   * - [no-side-effects] Pure getter function
   * 
   * @returns Number of incoming feed items
   */
  countIncomingFeedItems(): number {
    return this._incomingFeed.items.size;
  }

  /**
   * Adds new feed items to the incoming feed tracker.
   * 
   * Key functionality and invariants:
   * - [set-merge] Merges new items with existing incoming items
   * - [immutable-update] Creates new Set instead of mutating
   * - [listener-notification] Immediately notifies incoming listeners
   * - [deduplication] Set ensures no duplicate IDs
   * 
   * This pattern allows:
   * - Accumulating new items from multiple feed updates
   * - User control over when to integrate new items
   * - Visual indication of pending updates
   * 
   * @param feed - Object containing Set of new item IDs
   */
  addIncomingFeed(feed: IncomingFeedDiscussions): void {
    const current = this._incomingFeed;
    this._incomingFeed = {
      items: new Set(Array.from(current.items).concat(Array.from(feed.items))), // [set-merge] [immutable-update] [deduplication]
    };
    this._callIncomingFeedListeners(); // [listener-notification]
  }

  /**
   * Clears all incoming feed items.
   * 
   * Key functionality and invariants:
   * - [complete-reset] Removes all tracked incoming items
   * - [listener-notification] Notifies listeners of empty state
   * - [new-set] Creates fresh empty Set
   * 
   * Used when:
   * - User chooses to view new items
   * - Feed is refreshed
   * - Incoming items are integrated
   */
  resetIncomingFeed() {
    this._incomingFeed = { items: new Set() }; // [complete-reset] [new-set]
    this._callIncomingFeedListeners(); // [listener-notification]
  }

  // listeners for the count of incoming feed items
  _incomingFeedListeners: Record<ListenerId, (items: Set<T.FeedItem["id"]>) => void> = {};

  listenToIncoming(listener: (items: Set<T.FeedItem["id"]>) => void): ListenerId {
    const lid = this._getListenerId();
    this._incomingFeedListeners[lid] = listener;
    return lid;
  }

  removeIncomingFeedListener(lid: ListenerId) {
    if (this._incomingFeedListeners[lid]) {
      delete this._incomingFeedListeners[lid];
    }
  }

  _lastIncomingFeedItems: Set<T.FeedItem["id"]> = new Set();
  _callIncomingFeedListeners() {
    const items = this._incomingFeed.items;
    if (items.size !== this._lastIncomingFeedItems.size ||
      Array.from(items).some(id => !this._lastIncomingFeedItems.has(id))
    ) {
      Object.values(this._incomingFeedListeners).forEach((l) => l(items));
      this._lastIncomingFeedItems = new Set(items);
    }
  }

  /**
   * Integrates incoming feed by clearing tracker and updating UI.
   * 
   * Key functionality and invariants:
   * - [clear-incoming] Resets incoming feed tracker
   * - [ui-refresh] Triggers DR list listener update
   * - [two-step-process] Clear tracker then refresh UI
   * 
   * This ensures:
   * - Incoming badge/count is cleared
   * - Feed UI refreshes to show new items
   * - Clean state for next incoming batch
   */
  integrateIncomingFeed() {
    this.resetIncomingFeed(); // [clear-incoming]
    this._callDRListeners(); // [ui-refresh] [two-step-process]
  }

  /**
   * Processes incoming feed data and tracks new items.
   * 
   * Key functionality and invariants:
   * - [new-item-detection] Identifies truly new items not already in DB
   * - [dual-format-support] Handles both discussion and item feed formats
   * - [transaction-batching] Uses transaction for atomic updates
   * - [incoming-tracking] Tracks new item IDs for user notification
   * - [hydration-handling] Extracts discussions from hydrated items
   * 
   * This pattern ensures:
   * - Users can see count of new items before integration
   * - All related data is stored atomically
   * - Both feed formats are properly handled
   * 
   * The processing includes:
   * - Detecting new discussions and items
   * - Extracting embedded discussions from items
   * - Storing users, groups, discussions, and items
   * - Tracking incoming item IDs separately
   * 
   * @param r - Feed API response in either format
   */
  async processIncomingFeed(r: T.FeedAPIResponse | T.DiscussionFeedAPIResponse): Promise<void> {
    // check if there are new incoming discussions or contact requests
    let incomingDrIds = new Set<T.Discussion["id"]>();
    let discussions: T.ShallowDiscussionResponse[] = [];
    if ("discussions" in r) { // [dual-format-support]
      if (r.discussions && r.discussions.length > 0) {
        incomingDrIds = getNewDrIds(this.getAllDRs(), r.discussions); // [new-item-detection]
        discussions = r.discussions;
      }
    }

    let incomingFeedItemIds = new Set<T.FeedItem["id"]>();
    let items = [];
    if ("items" in r) { // [dual-format-support]
      if (r.items && r.items.length > 0) {
        incomingFeedItemIds = getNewFeedItemIds(this.getAllFeedItems(), r.items); // [new-item-detection]
        items = r.items;
        const drs: T.ShallowDiscussionResponse[] = items
          .filter((item) => item.ref_type === "discussion")
          .map((item) => item.ref)
          .map((d: T.HydratedDiscussion): T.ShallowDiscussionResponse => { // [hydration-handling]
            return {
              discussion: d,
              messages: d.messages,
              user_ids: d.members,
            }
          });
        discussions = discussions.concat(drs);
      }
    }

    // add the new users and groups to the db since they don't affect the feed ordering
    this.transaction(() => { // [transaction-batching]
      (r.users || []).forEach((u) => this.addUser(u));
      (r.groups || []).forEach((g) => this.addGroup(g));

      // Store just the IDs in the incoming feed
      this.addIncomingFeed({ items: incomingFeedItemIds }); // [incoming-tracking]

      discussions.forEach((sdr) => this.addShallowDiscussionResponse(sdr));
      items.forEach((item) => this.addFeedItem(item));
    });
  }

  async _prepareFeed(fq: T.FeedQuery): Promise<void> {
    const r = await this._gatzClient.getFeed(fq);
    this.processIncomingFeed(r);
  }

  async _cachedFetchFeed(
    fq: T.FeedQuery,
  ): Promise<{ drs: T.DiscussionResponse[] }> {
    const cacheKey = JSON.stringify(fq);
    const lastResult = this._lastFeedFetchTs.get(cacheKey);

    // is there something in the cache?
    if (lastResult) {
      const { ts, result } = lastResult;
      const now = new Date();
      const timeSinceCache = now.getTime() - ts.getTime();
      // is the cache fresh?
      if (timeSinceCache < CACHE_LIFE_MILLIS) {
        return result;
      }
    }

    // there is nothing in the cache or it is stale
    const result = await this._fetchFeed(fq);
    const ts = new Date();
    this._lastFeedFetchTs.set(cacheKey, { ts, result });
    return result;
  }

  // Feed Hooks API

  // There are multiple ways to reload the feed
  // 1. Automatically on start, before there is anything to render
  //    - There should be a loading indicator in place of the screen if there is nothing
  //    - But there shuold be something returned _right away_ if there is anything in the db

  // 2. By pulling from the top when pulling or loading for the first time
  //    - The feed should still be visible
  //    - But there should be a RefreshIndicator at the top

  /**
   * Refreshes the feed with optional caching.
   * 
   * Key functionality and invariants:
   * - [cache-control] Hard refresh bypasses cache, soft uses cache
   * - [default-hard] Defaults to hard refresh for fresh data
   * - [returns-promise] Returns promise with discussion responses
   * - [side-effects] Updates database with fetched data
   * 
   * This pattern provides:
   * - Control over cache usage for performance
   * - Fresh data by default
   * - Cached data for rapid updates
   * 
   * @param feedQuery - Query parameters for feed fetch
   * @param options - Refresh options including cache control
   * @returns Promise resolving to discussion responses
   */
  refreshFeed(feedQuery: T.FeedQuery, { hardRefresh }: { hardRefresh: boolean } = { hardRefresh: true }) {
    if (hardRefresh) { // [cache-control] [default-hard]
      return this._fetchFeed(feedQuery);
    } else {
      return this._cachedFetchFeed(feedQuery);
    }
  }

  // 3. From the bottom when scrolling down.
  //    - The feed should be visible, and there should be a loading indicator at the bottom

  /**
   * Loads more feed items for pagination.
   * 
   * Key functionality and invariants:
   * - [pagination-support] Uses last_id for cursor-based pagination
   * - [appends-data] Adds to existing feed, doesn't replace
   * - [client-coordination] Gets last_id from GatzClient
   * 
   * @param feedQuery - Base query parameters for feed
   * @returns Promise resolving to newly loaded discussion responses
   */
  loadBottomFeed(feedQuery: T.FeedQuery) {
    const last_id = this._gatzClient.lastIdForFeed(feedQuery); // [client-coordination]
    return this._fetchFeed({ ...feedQuery, last_id }); // [pagination-support] [appends-data]
  }

  // These are two separate states that are handled separately and should update
  // separate components. But both end up putting drs into the local db which then
  // re-renders the entire feed
  // So, the question is "which small component shows their loading"

  /**
   * Performs a search and stores the results.
   * 
   * Key functionality and invariants:
   * - [api-call] Makes search API call via GatzClient
   * - [empty-handling] Returns empty array for no results
   * - [transaction-batching] Uses transaction for bulk updates
   * - [data-storage] Stores users, groups, and discussions
   * - [returns-drs] Returns full discussion responses
   * 
   * This pattern ensures:
   * - Search results are stored for offline access
   * - Related data (users, groups) is available
   * - Efficient bulk storage with single render
   * 
   * @param opts - Search query parameters
   * @returns Promise resolving to discussion responses
   */
  async _fetchSearch(opts: T.SearchQuery): Promise<{ drs: T.DiscussionResponse[] }> {
    const r = await this._gatzClient.getSearch(opts); // [api-call]
    if (r.discussions.length === 0) { // [empty-handling]
      return { drs: [] };
    } else {
      this.transaction(() => { // [transaction-batching]
        r.users.forEach((u) => this.addUser(u)); // [data-storage]
        r.groups.forEach((g) => this.addGroup(g)); // [data-storage]
        r.discussions.forEach((d) => this.addDiscussion(d.discussion)); // [data-storage]
        r.discussions.forEach((sdr) => this.addShallowDiscussionResponse(sdr)); // [data-storage]
      });
      return { drs: r.discussions.map((d) => this.getDRById(d.discussion.id)) }; // [returns-drs]
    }
  }

}

const CACHE_LIFE_MILLIS = 30 * 1000;

// This is the data that we hold in the db before refreshing the feed
// so that the user can choose when to refresh the feed
export type IncomingFeedDiscussions = { items: Set<T.FeedItem["id"]> }
