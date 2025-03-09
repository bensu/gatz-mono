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