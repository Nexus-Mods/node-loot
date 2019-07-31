import { Buffer } from "nbind/dist/shim";

export class NBindBase { free?(): void }

export class File extends NBindBase {
	/** std::string name; -- Read-only */
	name: string;

	/** std::string displayName; -- Read-only */
	displayName: string;
}

export class Location extends NBindBase {
	/** std::string URL; -- Read-only */
	URL: string;

	/** std::string name; -- Read-only */
	name: string;
}

export class Group extends NBindBase {
	name: string;
	afterGroups: string[];
}

export type LogCallback = (level: number, message: string) => void;
export type ForkFunction = (module: string, args: string[]) => void;

export class Loot extends NBindBase {
  constructor(gameId: string, gamePath: string, gameLocalPath: string, language: string, logCallback: LogCallback);
  
  updateMasterlist(masterlistPath: string, repoUrl: string, repoBranch: string): boolean;
  getMasterlistRevision(masterlistPath: string, getShortId: boolean): MasterlistInfo;
  loadLists(masterlistPath: string, userlistPath: string): void;
  loadPlugins(plugins: string[], loadHeadersOnly: boolean): void;
  getPlugin(pluginName: string): PluginInterface;
  getPluginMetadata(pluginName: string): PluginMetadata;
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
};

export class MasterlistInfo extends NBindBase {
	revisionId: string;
	revisionDate: string;
	isModified: boolean;
}

export class Message extends NBindBase {
	/** std::string value(const std::string &); */
	value(language: string): string;

	/** uint32_t type; -- Read-only */
	type: number;
}

export class MessageContent extends NBindBase {
	/** std::string text; -- Read-only */
	text: string;

	/** std::string language; -- Read-only */
	language: string;
}

export class PluginCleaningData extends NBindBase {
	/** uint32_t CRC; -- Read-only */
	CRC: number;

	/** uint32_t ITMCount; -- Read-only */
	itmCount: number;

	/** uint32_t deletedReferenceCount; -- Read-only */
	deletedReferenceCount: number;

	/** uint32_t deletedNavmeshCount; -- Read-only */
	deletedNavmeshCount: number;

	/** std::string cleaningUtility; -- Read-only */
	cleaningUtility: string;

	/** std::vector<MessageContent> info; -- Read-only */
	info: MessageContent[];
}

export class PluginMetadata extends NBindBase {
	/** std::vector<Message> messages; -- Read-only */
	messages: Message[];

	/** std::string name; -- Read-only */
	name: string;

	/** std::vector<Tag> tags; -- Read-only */
	tags: Tag[];

	/** std::vector<PluginCleaningData> cleanInfo; -- Read-only */
	cleanInfo: PluginCleaningData[];

	/** std::vector<PluginCleaningData> dirtyInfo; -- Read-only */
	dirtyInfo: PluginCleaningData[];

	/** Priority globalPriority; -- Read-only */
	globalPriority: Priority;

	/** std::vector<File> incompatibilities; -- Read-only */
	incompatibilities: File[];

	/** std::vector<File> loadAfterFiles; -- Read-only */
	loadAfterFiles: File[];

	/** Priority localPriority; -- Read-only */
	localPriority: Priority;

	/** std::vector<Location> locations; -- Read-only */
	locations: Location[];

	/** std::vector<File> requirements; -- Read-only */
	requirements: File[];

	/** bool IsEnabled; -- Read-only */
	IsEnabled: boolean;
}

export class Priority extends NBindBase {
	/** int16_t value; -- Read-only */
	value: number;

	/** bool IsExplicit; -- Read-only */
	IsExplicit: boolean;
}

export class Tag extends NBindBase {
	/** bool IsAddition; -- Read-only */
	IsAddition: boolean;

	/** std::string name; -- Read-only */
	name: string;
}

export class Vertex extends NBindBase {
	name: string;
	typeOfEdgeToNextVertex: string;
}

export class PluginInterface extends NBindBase {
	name: string;
	version: string;
	masters: string[];
	bashTags: Tag[];
 
	getCRC: number;
	isMaster: boolean;
	isLightMaster: boolean;
	isValidAsLightMaster: boolean;
	isEmpty: boolean;
	loadsArchive: boolean;
}

/** bool IsCompatible(uint32_t, uint32_t, uint32_t); */
export function IsCompatible(major: number, minor: number, patch: number): boolean;
