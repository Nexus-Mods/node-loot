#include "util.h"
#include <map>

const char *convertEdgeType(loot::EdgeType edgeType) {
  static std::map<loot::EdgeType, const char*> edgeMap{
    { loot::EdgeType::userGroup, "userGroup" },
    { loot::EdgeType::masterlistGroup, "masterlistGroup" },
    { loot::EdgeType::hardcoded, "hardcoded" },
    { loot::EdgeType::master, "master" },
    { loot::EdgeType::masterFlag, "masterFlag" },
    { loot::EdgeType::masterlistLoadAfter, "masterlistLoadAfter" },
    { loot::EdgeType::masterlistRequirement, "masterlistRequirement" },
    { loot::EdgeType::userLoadAfter, "userlistLoadAfter" },
    { loot::EdgeType::userRequirement, "userlistRequirement" },
    { loot::EdgeType::assetOverlap, "assetOverlap" },
    { loot::EdgeType::recordOverlap, "recordOverlap" },
    { loot::EdgeType::tieBreak, "tieBreak" }
  };

  auto iter = edgeMap.find(edgeType);
  return (iter != edgeMap.end())
    ? iter->second
    : "";
}
