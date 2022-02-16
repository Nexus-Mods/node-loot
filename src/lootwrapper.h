#pragma once

#include <loot/api.h>
#include <functional>
#include <map>
#include <memory>
#include <set>
#include <unordered_set>
#include <napi.h>

typedef std::function<void(int level, const char *message)> LogFunc;

class Loot : public Napi::ObjectWrap<Loot> {

public:

  static Napi::Object Init(Napi::Env env, Napi::Object exports) {
    Napi::Function func = DefineClass(env, "Loot", {
      InstanceMethod("updateFile", &Loot::updateFile),
      InstanceMethod("loadLists", &Loot::loadLists),
      InstanceMethod("loadPlugins", &Loot::loadPlugins),
      InstanceMethod("loadCurrentLoadOrderState", &Loot::loadCurrentLoadOrderState),
      InstanceMethod("getMasterlistRevision", &Loot::getMasterlistRevision),
      InstanceMethod("getPlugin", &Loot::getPlugin),
      InstanceMethod("getPluginMetadata", &Loot::getPluginMetadata),
      InstanceMethod("getLoadOrder", &Loot::getLoadOrder),
      InstanceMethod("getGroups", &Loot::getGroups),
      InstanceMethod("getUserGroups", &Loot::getUserGroups),
      InstanceMethod("getGroupsPath", &Loot::getGroupsPath),
      InstanceMethod("getGeneralMessages", &Loot::getGeneralMessages),
      InstanceMethod("isPluginActive", &Loot::isPluginActive),
      InstanceMethod("setLoadOrder", &Loot::setLoadOrder),
      InstanceMethod("setUserGroups", &Loot::setUserGroups),
      InstanceMethod("sortPlugins", &Loot::sortPlugins)
      });
    exports.Set("Loot", func);
    return exports;
  }

  Loot(const Napi::CallbackInfo &info);

  Napi::Value updateFile(const Napi::CallbackInfo &info);

  Napi::Value loadLists(const Napi::CallbackInfo &info);

  Napi::Value loadPlugins(const Napi::CallbackInfo &info);

  Napi::Value loadCurrentLoadOrderState(const Napi::CallbackInfo &info);

  Napi::Value getMasterlistRevision(const Napi::CallbackInfo &info);

  Napi::Value getPlugin(const Napi::CallbackInfo &info);

  Napi::Value getPluginMetadata(const Napi::CallbackInfo &info);

  Napi::Value getLoadOrder(const Napi::CallbackInfo &info);

  Napi::Value getGroups(const Napi::CallbackInfo &info);

  Napi::Value getUserGroups(const Napi::CallbackInfo &info);

  Napi::Value getGroupsPath(const Napi::CallbackInfo &info);

  Napi::Value getGeneralMessages(const Napi::CallbackInfo &info);

  Napi::Value isPluginActive(const Napi::CallbackInfo &info);

  Napi::Value setLoadOrder(const Napi::CallbackInfo &info);

  Napi::Value setUserGroups(const Napi::CallbackInfo &info);

  Napi::Value sortPlugins(const Napi::CallbackInfo &info);

private:

  std::string m_Language;
  std::shared_ptr<loot::GameInterface> m_Game;
  Napi::ThreadSafeFunction m_LogCallback;

};

