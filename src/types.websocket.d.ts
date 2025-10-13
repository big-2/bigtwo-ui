/* tslint:disable */
/* eslint-disable */
/**
/* This file was automatically generated from pydantic models by running pydantic2ts.
/* Do not modify it by hand - just update the pydantic models and then re-run the script
*/

/**
 * Enum for WebSocket message types.
 */
export type MessageType =
    | "CHAT"
    | "MOVE"
    | "PLAYERS_LIST"
    | "LEAVE"
    | "HOST_CHANGE"
    | "MOVE_PLAYED"
    | "TURN_CHANGE"
    | "ERROR"
    | "START_GAME"
    | "GAME_STARTED"
    | "GAME_WON"
    | "GAME_RESET"
    | "BOT_ADDED"
    | "BOT_REMOVED";

/**
 * Model for chat messages.
 */
export interface ChatMessage {
    type: "CHAT";
    payload: ChatPayload;
    meta?: WebSocketMessageMeta;
}
export interface ChatPayload {
    sender_uuid: string;
    content: string;
}
/**
 * Metadata for WebSocket messages.
 */
export interface WebSocketMessageMeta {
    timestamp?: string;
    player_id?: string | null;
}
/**
 * Model for error messages.
 */
export interface ErrorMessage {
    type: "ERROR";
    payload: ErrorPayload;
    meta?: WebSocketMessageMeta;
}
export interface ErrorPayload {
    message: string;
}
/**
 * Model for host change messages.
 */
export interface HostChangeMessage {
    type: "HOST_CHANGE";
    payload: HostChangePayload;
    meta?: WebSocketMessageMeta;
}
export interface HostChangePayload {
    host: string;
}
/**
 * Model for leave messages.
 */
export interface LeaveMessage {
    type: "LEAVE";
    payload: LeavePayload;
    meta?: WebSocketMessageMeta;
}
export interface LeavePayload {
    player: string;
}
/**
 * Model for move messages.
 */
export interface MoveMessage {
    type: "MOVE";
    payload: MovePayload;
    meta?: WebSocketMessageMeta;
}
export interface MovePayload {
    cards: string[];
}
/**
 * Model for move played messages.
 */
export interface MovePlayedMessage {
    type: "MOVE_PLAYED";
    payload: MovePlayedPayload;
    meta?: WebSocketMessageMeta;
}
export interface MovePlayedPayload {
    player: string;
    cards: string[];
}
/**
 * Model for players list messages.
 */
export interface PlayersListMessage {
    type: "PLAYERS_LIST";
    payload: PlayersListPayload;
    meta?: WebSocketMessageMeta;
}
export interface PlayersListPayload {
    players: string[];
    mapping: { [uuid: string]: string };
}
/**
 * Model for turn change messages.
 */
export interface TurnChangeMessage {
    type: "TURN_CHANGE";
    payload: TurnChangePayload;
    meta?: WebSocketMessageMeta;
}
export interface TurnChangePayload {
    player: string;
}
/**
 * Model for game started messages.
 */
export interface GameStartedMessage {
    type: "GAME_STARTED";
    payload: GameStartedPayload;
    meta?: WebSocketMessageMeta;
}
export interface GameStartedPayload {
    current_turn: string;
    cards: string[];
    player_list: string[];
    last_played_cards?: string[];
    last_played_by?: string;
}
/**
 * Model for game won messages.
 */
export interface GameWonMessage {
    type: "GAME_WON";
    payload: GameWonPayload;
    meta?: WebSocketMessageMeta;
}
export interface GameWonPayload {
    winner: string;
}
/**
 * Model for game reset messages.
 */
export interface GameResetMessage {
    type: "GAME_RESET";
    payload: GameResetPayload;
    meta?: WebSocketMessageMeta;
}
export interface GameResetPayload {
    // Empty payload - just signals that game should reset to lobby
}
/**
 * Model for bot added messages.
 */
export interface BotAddedMessage {
    type: "BOT_ADDED";
    payload: BotAddedPayload;
    meta?: WebSocketMessageMeta;
}
export interface BotAddedPayload {
    bot_uuid: string;
    bot_name: string;
}
/**
 * Model for bot removed messages.
 */
export interface BotRemovedMessage {
    type: "BOT_REMOVED";
    payload: BotRemovedPayload;
    meta?: WebSocketMessageMeta;
}
export interface BotRemovedPayload {
    bot_uuid: string;
}
/**
 * Base model for all WebSocket messages.
 */
export interface WebSocketMessage {
    type: MessageType;
    payload: {
        [k: string]: unknown;
    };
    meta?: WebSocketMessageMeta;
}
