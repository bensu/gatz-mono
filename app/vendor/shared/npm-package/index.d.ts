
export type CRDT = any;
export type Clock = any;
export type UUID = string;

export function new_lww(clock: Clock, value: any): CRDT;
export function new_min_wins(value: any): CRDT;
export function new_max_wins(value: any): CRDT;
export function new_grow_only_set(values: any[]): CRDT;
export function new_lww_set(clock: Clock, values: any[]): CRDT;

export function merge_crdts(a: CRDT, b: CRDT): CRDT;
export function apply_delta(crdt: CRDT, delta: CRDT): CRDT;
export function get_value(crdt: CRDT): any;

export function new_hlc(node_id: UUID): Clock;
// export function random_uuid(): UUID;
export function read_crdt(edn_str: string): CRDT;

export function read_edn(edn_str: string): any;

// ============================================================
// Sync Engine

export type SyncEngine = any;

type EdnClient = any;

export function new_sync_engine(base_url: string, token: string, user_id: UUID): SyncEngine;
export function handle_ws_edn(sync: SyncEngine, edn: any): void;

// User sync
export function subscribe_to_me(sync: SyncEngine, listener_name: string, listener: (user: any) => void): { user: Promise<any>, unsubscribe: () => void };
export function merge_to_me(sync: SyncEngine, delta: any): void;
export function set_full_name(sync: SyncEngine, full_name: string): void;
export function set_twitter_username(sync: SyncEngine, twitter_username: string): void;
export function set_website_url(sync: SyncEngine, website_url: string): void;
export function set_profile_picture(sync: SyncEngine, url: string): void;
export function set_location_setting(sync: SyncEngine, enabled: boolean): void;
export function disable_notification_settings(sync: SyncEngine): void;
export function enable_notification_settings(sync: SyncEngine): void;
export type NotificationField = "overall" | "activity" | "subscribe_on_comment" | "suggestions_from_gatz" | "friend_accepted";
export function set_notification_settings_field(sync: SyncEngine, field: NotificationField, value: string | boolean): void;
export function register_push_token(sync: SyncEngine, token: string): void;
