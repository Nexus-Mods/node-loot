export class File {
	name: string;
	displayName: string;
	condition: string;
}

export class Location {
	url: string;
	name: string;
}

export class Group {
	name: string;
	afterGroups: string[];
	description: string;
}

export type LogCallback = (level: number, message: string) => void;
export type ForkFunction = (module: string, args: string[]) => void;

export class Loot {
  constructor(gameId: string, gamePath: string, gameLocalPath: string, language: string, logCallback: LogCallback);

  loadLists(masterlistPath: string, userlistPath: string, preludePath: string): void;
  loadPlugins(pluginPaths: string[], loadHeadersOnly: boolean): void;
  getPlugin(pluginName: string): PluginInterface | undefined;
  getPluginMetadata(pluginName: string, includeUserMetadata?: boolean, evaluateConditions?: boolean): PluginMetadata | undefined;
  sortPlugins(pluginNames: string[]): string[];
  setLoadOrder(pluginNames: string[]): void;
  getLoadOrder(): string[];
  loadCurrentLoadOrderState(): void;
  isPluginActive(pluginName: string): boolean;
  getGroups(includeUserGroups: boolean): Group[];
  getUserGroups(): Group[];
  setUserGroups(groups: Group[]): void;
  getGroupsPath(fromGroupName: string, toGroupName: string): Vertex[];
  getGeneralMessages(evaluateConditions: boolean): Message[];
  clearConditionCache(): void;
}

/** Each native Loot method as LootAsync runs it in the worker. */
type Promised<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R ? (...args: A) => Promise<R> : never;
};

export interface LootAsync extends Promised<Loot> {}

export class LootAsync {
  private constructor();
  static create(gameId: string, gamePath: string, gameLocalPath: string, language: string, logCallback: LogCallback, onFork?: ForkFunction): Promise<LootAsync>;
  restart(): Promise<void>;
  close(): void;
  isClosed(): boolean;
  setLogLevel(level: LogLevel): Promise<void>;
}

/** The rejection of a LootAsync call made after close. */
export class AlreadyClosed extends Error {}

/** The rejection of the calls waiting on a worker that went away. */
export class RemoteDied extends Error {
  call: string;
  /** The socket error that ended it, where one was reported. */
  code: string | undefined;
}

/** The rejection of a call on a plugin libloot has not loaded. */
export class PluginNotLoaded extends Error {
  plugin: string;
  func: string;
  currentlyLoaded: string[];
}

/** The rejection of a call the worker answered with something that is not a message. */
export class InvalidResponse extends Error {
  call: string;
  frameBytes: number;
}

export class Message {
	type: number;
	content: MessageContent[];
	condition: string;
}

export class MessageContent {
	text: string;
	language: string;
}

export class PluginCleaningData {
	crc: number;
	itmCount: number;
	deletedReferenceCount: number;
	deletedNavmeshCount: number;
	cleaningUtility: string;
}

export class PluginMetadata {
	messages: Message[];
	name: string;
  	group: string;
	tags: Tag[];
	cleanInfo: PluginCleaningData[];
	dirtyInfo: PluginCleaningData[];
	incompatibilities: File[];
	loadAfterFiles: File[];
	locations: Location[];
	requirements: File[];
}

export class Tag {
	isAddition: boolean;
	name: string;
	condition: string;
}

export class Vertex {
	name: string;
	typeOfEdgeToNextVertex: string;
}

export class PluginInterface {
	name: string;
	version: string | null;
	headerVersion: number | null;
	masters: string[];
	bashTags: Tag[];

	crc: number | null;
	isMaster: boolean;
	isLightPlugin: boolean;
	isValidAsLightPlugin: boolean;
	IsMediumPlugin: boolean;
	IsValidAsMediumPlugin: boolean;
	IsUpdatePlugin: boolean;
	IsValidAsUpdatePlugin: boolean;
	IsBlueprintPlugin: boolean;
	isEmpty: boolean;
	loadsArchive: boolean;
}

export const LogLevel: {
	readonly trace: 0;
	readonly debug: 1;
	readonly info: 2;
	readonly warning: 3;
	readonly error: 4;
};
export type LogLevel = (typeof LogLevel)[keyof typeof LogLevel];

export function IsCompatible(major: number, minor: number, patch: number): boolean;
export function SetLogLevel(level: LogLevel): void;
