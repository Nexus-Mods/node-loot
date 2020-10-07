function attachBindings(binding) {
  binding.bind('PluginMetadata',
               function(name, messages, tags, cleanInfo, dirtyInfo,
                        incompatibilities, loadAfterFiles, locations,
                        requirements, group) {
                 this.name = name;
                 this.messages = messages;
                 this.tags = tags;
                 this.cleanInfo = cleanInfo;
                 this.dirtyInfo = dirtyInfo;
                 this.group = group;
                 this.incompatibilities = incompatibilities;
                 this.loadAfterFiles = loadAfterFiles;
                 this.locations = locations;
                 this.requirements = requirements;
               });

  binding.bind('PluginInterface',
               function(name, version, masters, bashTags, crc,
                        isMaster, isLightMaster, isValidAsLightMaster, isEmpty, loadsArchive) {
                 this.name = name;
                 this.version = version;
                 this.masters = masters;
                 this.bashTags = bashTags;
                 this.crc = crc;
                 this.isMaster = isMaster;
                 this.isLightMaster = isLightMaster;
                 this.isValidAsLightMaster = isValidAsLightMaster;
                 this.isEmpty = isEmpty;
                 this.loadsArchive = loadsArchive;
               });

  binding.bind('Message', function(type, value) {
    this.type = type;
    this.value = value;
  });

  binding.bind('File', function(name, displayName) {
    this.name = name;
    this.displayName = displayName;
  });

  binding.bind('Group', function(name, loadAfter) {
    this.name = name;
    this.loadAfter = loadAfter;
  });

  binding.bind('MasterlistInfo', function(revisionId, revisionDate, isModified) {
    this.revisionId = revisionId;
    this.revisionDate = revisionDate;
    this.isModified = isModified;
  });

  binding.bind('Tag', function(name, isAddition, isConditional, condition) {
    this.name = name;
    this.isAddition = isAddition;
    this.isConditional = isConditional;
    this.condition = condition;
  });

  binding.bind('MessageContent', function(text) {
    this.text = text;
  });

  binding.bind('Location', function(name, url) {
    this.name = name;
    this.url = url;
  });

  binding.bind('Vertex', function(name, edgeType) {
    this.name = name;
    this.typeOfEdgeToNextVertex = edgeType;
  });

  binding.bind('PluginCleaningData', function(cleaningUtility, crc, deletedNavmeshCount, deletedReferenceCount,
                                              itmCount, info) {
    this.cleaningUtility = cleaningUtility;
    this.crc = crc;
    this.deletedNavmeshCount = deletedNavmeshCount;
    this.deletedReferenceCount = deletedReferenceCount;
    this.itmCount = itmCount;
    this.info = info;
  });
}

module.exports = attachBindings;
