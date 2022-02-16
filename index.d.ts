export class File {
	name: string;
	displayName: string;
}

export class Location {
	URL: string;
	name: string;
}

export class Group {
	name: string;
	afterGroups: string[];
}

export type LogCallback = (level: number, message: string) => void;
export type ForkFunction = (module: string, args: string[]) => void;

export class Loot {
  constructor(gameId: string, gamePath: string, gameLocalPath: string, language: string, logCallback: LogCallback);
  
  updateMasterlist(masterlistPath: string, repoUrl: string, repoBranch: string): boolean;
  getMasterlistRevision(masterlistPath: string, getShortId: boolean): MasterlistInfo;
  loadLists(masterlistPath: string, userlistPath: string): void;
  loadPlugins(plugins: string[], loadHeadersOnly: boolean): void;
  getPlugin(pluginName: string): PluginInterface;
  getPluginMetadata(pluginName: string, includeUserMetadata: boolean, evaluateConditions: boolean): PluginMetadata;
  sortPlugins(pluginNames: string[]): string[];
  setLoadOrder(pluginNames: string[]): void;
  getLoadOrder(): string[];
  loadCurrentLoadOrderState(): void;
  isPluginActive(pluginName: string): boolean;
  getGroups(includeUserGroups: boolean): Group[];
  getUserGroups(): Group[];
  setUserGroups(groups: Group[]);
  getGroupsPath(fromGroupName: string, toGroupName: string): Vertex[];
  getGeneralMessages(evaluateConditions: boolean): Message[];
}

export class LootAsync {
	static create(gameId: string, gamePath: string, gameLocalPath: string, language: string, logCallback: LogCallback, onFork: ForkFunction, callback: (err: Error, loot: LootAsync) => void);
	restart(callback: (err: Error) => void);
  close(): void;

  updateMasterlist(masterlistPath: string, repoUrl: string, repoBranch: string, callback: (err: Error, didUpdate: boolean) => void): void;
  getMasterlistRevision(masterlistPath: string, getShortId: boolean, callback: (err: Error, info: MasterlistInfo) => void): void;
  loadLists(masterlistPath: string, userlistPath: string, callback: (err: Error) => void): void;
  loadPlugins(plugins: string[], loadHeadersOnly: boolean): void;
  getPlugin(pluginName: string): PluginInterface;
  getPluginMetadata(pluginName: string, callback: (err: Error, meta: PluginMetadata) => void): void;
  getPluginMetadata(pluginName: string, includeUserMetadata: boolean, evaluateConditions: boolean, callback: (err: Error, meta: PluginMetadata) => void): void;
  sortPlugins(pluginNames: string[], callback: (err: Error, sorted: string[]) => void): void;
  setLoadOrder(pluginNames: string[]): void;
  getLoadOrder(): string[];
  loadCurrentLoadOrderState(): void;
  isPluginActive(pluginName: string): boolean;
  getGroups(includeUserGroups: boolean): Group[];
  getUserGroups(): Group[];
  setUserGroups(groups: Group[]);
  getGroupsPath(fromGroupName: string, toGroupName: string): Vertex[];
  getGeneralMessages(evaluateConditions: boolean): Message[];
}

export class MasterlistInfo {
	revisionId: string;
	revisionDate: string;
	isModified: boolean;
}

export class Message {
	type: number;
	content: string | Array<{ text: string, language: string }>;
	condition: string;
	isConditional: boolean;
}

export class MessageContent {
	text: string;
	language: string;
}

export class PluginCleaningData {
	CRC: number;
	itmCount: number;
	deletedReferenceCount: number;
	deletedNavmeshCount: number;
	cleaningUtility: string;
	info: MessageContent[];
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
	isConditional: boolean;
	name: string;
	condition: string;
}

export class Vertex {
	name: string;
	typeOfEdgeToNextVertex: string;
}

export class PluginInterface {
	name: string;
	version: string;
	masters: string[];
	bashTags: Tag[];
 
	crc: number;
	isMaster: boolean;
	isLightMaster: boolean;
	isValidAsLightMaster: boolean;
	isEmpty: boolean;
	loadsArchive: boolean;
}

export function IsCompatible(major: number, minor: number, patch: number): boolean;
