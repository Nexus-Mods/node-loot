#include "util.h"
#include <map>

const char *convertEdgeType(loot::EdgeType edgeType) {
  static std::map<loot::EdgeType, const char*> edgeMap{
    { loot::EdgeType::group, "group" },
    { loot::EdgeType::hardcoded, "hardcoded" },
    { loot::EdgeType::master, "master" },
    { loot::EdgeType::masterFlag, "masterFlag" },
    { loot::EdgeType::masterlistLoadAfter, "masterlistLoadAfter" },
    { loot::EdgeType::masterlistRequirement, "masterlistRequirement" },
    { loot::EdgeType::userLoadAfter, "userlistLoadAfter" },
    { loot::EdgeType::userRequirement, "userlistRequirement" },
    { loot::EdgeType::overlap, "overlap" },
    { loot::EdgeType::tieBreak, "tieBreak" }
  };

  auto iter = edgeMap.find(edgeType);
  return (iter != edgeMap.end())
    ? iter->second
    : "";
}
