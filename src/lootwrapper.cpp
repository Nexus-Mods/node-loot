#include "lootwrapper.h"
#undef function

#include <map>
#include <future>
#include <sstream>
#include <memory>
#include <iostream>
#include <clocale>
#ifdef WIN32
#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include "exceptions.h"
#endif
#include "string_cast.h"
#include "util.h"

template<typename T>
Napi::Value toNAPI(Napi::Env &env, const T &input);

template<typename T>
T fromNAPI(const Napi::Value &info);

template<>
Napi::Value toNAPI<loot::Tag>(Napi::Env &env, const loot::Tag &input) {
  Napi::Object res = Napi::Object::New(env);
  res.Set("condition", input.GetCondition());
  res.Set("name", input.GetName());
  res.Set("isAddition", input.IsAddition());
  res.Set("isConditional", input.IsConditional());

  return res;
}

template<typename T>
Napi::Value toNAPI(Napi::Env &env, const std::vector<T> &input) {
  Napi::Array result = Napi::Array::New(env, input.size());
  uint32_t index = 0;
  for (const auto &iter : input) {
    result.Set(index++, toNAPI(env, iter));
  }
  return result;
}

template<>
Napi::Value toNAPI<loot::MessageContent>(Napi::Env &env, const loot::MessageContent &input) {
  Napi::Object res = Napi::Object::New(env);

  res.Set("text", input.GetText());
  res.Set("language", input.GetLanguage());

  return res;
}

template<>
Napi::Value toNAPI<loot::Message>(Napi::Env &env, const loot::Message &input) {
  Napi::Object res = Napi::Object::New(env);
  res.Set("condition", input.GetCondition());
  res.Set("content", toNAPI(env, input.GetContent()));
  res.Set("type", static_cast<unsigned int>(input.GetType()));
  res.Set("isConditional", input.IsConditional());

  return res;
}

template<>
Napi::Value toNAPI<loot::PluginCleaningData>(Napi::Env &env, const loot::PluginCleaningData &input) {
  Napi::Object res = Napi::Object::New(env);
  res.Set("cleaningUtility", input.GetCleaningUtility());
  res.Set("crc", input.GetCRC());
  res.Set("deletedNavmeshCount", input.GetDeletedNavmeshCount());
  res.Set("deletedReferenceCount", input.GetDeletedReferenceCount());
  res.Set("info", toNAPI(env, input.GetInfo()));
  res.Set("itmCount", input.GetITMCount());

  return res;
}

template<>
Napi::Value toNAPI<loot::File>(Napi::Env &env, const loot::File &input) {
  Napi::Object res = Napi::Object::New(env);
  res.Set("condition", input.GetCondition());
  res.Set("displayName", input.GetDisplayName());
  res.Set("name", static_cast<std::string>(input.GetName()));
  res.Set("isConditional", input.IsConditional());

  return res;
}

template<>
Napi::Value toNAPI<loot::Location>(Napi::Env &env, const loot::Location &input) {
  Napi::Object res = Napi::Object::New(env);
  res.Set("name", input.GetName());
  res.Set("url", input.GetURL());

  return res;
}

template<>
Napi::Value toNAPI<loot::Vertex>(Napi::Env &env, const loot::Vertex &input) {
  Napi::Object res = Napi::Object::New(env);

  res.Set("name", input.GetName());
  auto edgeType = input.GetTypeOfEdgeToNextVertex();
  res.Set("typeOfEdgeToNextVertex", edgeType.has_value() ? convertEdgeType(edgeType.value()) : "");

  return res;
}

template<>
Napi::Value toNAPI<loot::Group>(Napi::Env &env, const loot::Group &input) {
  Napi::Object res = Napi::Object::New(env);

  res.Set("afterGroups", toNAPI(env, input.GetAfterGroups()));
  res.Set("description", input.GetDescription());
  res.Set("name", input.GetName());

  return res;
}

template<>
Napi::Value toNAPI<std::string>(Napi::Env &env, const std::string &input) {
  return Napi::String::From(env, input);
}

template<typename T>
std::vector<T> fromNAPIArr(const Napi::Value &info) {
  if (!info.IsArray()) {
    throw std::runtime_error("expected array");
  }

  Napi::Object arr = info.ToObject();

  std::vector<T> res;
  for (uint32_t i = 0; ; ++i) {
    if (arr.Get(i).IsUndefined()) {
      break;
    }
    res.push_back(fromNAPI<T>(arr.Get(i)));
  }
  return res;
}

template<>
std::string fromNAPI(const Napi::Value &info) {
  return info.ToString().Utf8Value();
}

template<>
loot::Group fromNAPI(const Napi::Value &info) {
  Napi::Object obj = info.As<Napi::Object>();
  return loot::Group(
    obj.Get("name").ToString().Utf8Value(),
    fromNAPIArr<std::string>(obj.Get("afterGroups")),
    obj.Get("description").ToString().Utf8Value());
}

loot::GameType convertGameId(Napi::Env &env, const std::string &gameId) {
  std::map<std::string, loot::GameType> gameMap{
    { "morrowind", loot::GameType::tes3 },
    { "oblivion", loot::GameType::tes4 },
    { "skyrim", loot::GameType::tes5 },
    { "skyrimse", loot::GameType::tes5se },
    { "skyrimvr", loot::GameType::tes5vr },
    { "fallout3", loot::GameType::fo3 },
    { "falloutnv", loot::GameType::fonv },
    { "fallout4", loot::GameType::fo4 },
    { "fallout4vr", loot::GameType::fo4vr }
  };

  auto iter = gameMap.find(gameId);
  if (iter == gameMap.end()) {
    throw UnsupportedGame(env);
  }
  return iter->second;
}

std::wstring u8Tou16(const std::string &input) {
  return toWC(input.c_str(), CodePage::UTF8, input.length());
}

Loot::Loot(const Napi::CallbackInfo &info)
  : Napi::ObjectWrap<Loot>(info)
  , m_Language(info[3].ToString())
  , m_LogCallback(Napi::ThreadSafeFunction::New(info.Env(), info[4].As<Napi::Function>(), "logcb", 0, 1))
{
  try {
    // logging is a bit complex I'm afraid because loot logs messages from different threads and we can only invoke
    // the js callback from the main process.
    // Napi::ThreadSafeFunction helps with that. From the thread we invoke the ThreadSafeFunction which transfers the log
    // message in a C++ object via queue to the main thread where this mainThreadCB is invoked which then invokes the
    // javascript callback

    auto mainThreadCB = [](Napi::Env env, Napi::Function jsCallback, std::tuple<int, std::string> *value) {
      jsCallback.Call({ Napi::Number::New(env, std::get<0>(*value)), Napi::String::New(env, std::get<1>(*value)) });
    };

    loot::SetLoggingCallback([&info, this, mainThreadCB](loot::LogLevel level, const char *message) {
      // auto env = this->m_LogCallback.Env();
      auto data = new std::tuple(static_cast<int>(level), std::string(message));
      this->m_LogCallback.BlockingCall(data, mainThreadCB);
    });


    auto gameId = convertGameId(info.Env(), info[0].ToString().Utf8Value());
    std::wstring gamePath = u8Tou16(info[1].ToString().Utf8Value());
    std::wstring gameLocalPath = u8Tou16(info[2].ToString().Utf8Value());
    auto gamePathFS = std::filesystem::path(gamePath);
    auto gameLocalPathFS = std::filesystem::path(gameLocalPath);
    m_Game = loot::CreateGameHandle(gameId, gamePath, gameLocalPath);
  } catch (const std::filesystem::filesystem_error &e) {
    throw ErrnoException(info.Env(), e.code().value(), __FUNCTION__, e.path1().generic_u8string().c_str());
  } catch (const std::exception &e) {
    throw ExcWrap(info.Env(), __FUNCTION__, e);
  }
  catch (...) {
    napi_throw_error(info.Env(), "UNKNOWN", "unknown exception");
  }
}


Napi::Value Loot::updateMasterlist(const Napi::CallbackInfo &info) {

  try {
    bool res = m_Game->GetDatabase()->UpdateMasterlist(u8Tou16(info[0].ToString().Utf8Value()), info[1].ToString(), info[2].ToString());
    return Napi::Boolean::New(info.Env(), res);
  } catch (const std::filesystem::filesystem_error &e) {
    throw ErrnoException(info.Env(), e.code().value(), __FUNCTION__, e.path1().generic_u8string().c_str());
  } catch (const std::exception &e) {
    throw LOOTError(info.Env(), "updateMasterlist", e.what());
  }
}

Napi::Value Loot::loadLists(const Napi::CallbackInfo &info)
{
  try {
    m_Game->GetDatabase()->LoadLists(u8Tou16(info[0].ToString().Utf8Value()), u8Tou16(info[1].ToString().Utf8Value()));
  } catch (const std::filesystem::filesystem_error &e) {
    throw ErrnoException(info.Env(), e.code().value(), __FUNCTION__, e.path1().generic_u8string().c_str());
  } catch (const std::exception &e) {
    throw LOOTError(info.Env(), "loadLists", e.what());
  }
  return info.Env().Undefined();
}

Napi::Value Loot::loadPlugins(const Napi::CallbackInfo &info) {
  try {
    m_Game->LoadPlugins(fromNAPIArr<std::string>(info[0]), info[1].ToBoolean());
  } catch (const std::filesystem::filesystem_error &e) {
    throw ErrnoException(info.Env(), e.code().value(), __FUNCTION__, e.path1().generic_u8string().c_str());
  } catch (const std::exception &e) {
    throw LOOTError(info.Env(), "loadPlugins", e.what());
  }
  return info.Env().Undefined();
}

Napi::Value Loot::getPluginMetadata(const Napi::CallbackInfo &info) {
  try {
    Napi::Value res = Napi::Object::New(info.Env());

    std::optional<loot::PluginMetadata> meta = m_Game->GetDatabase()->GetPluginMetadata(info[0].ToString(), true, true);
    if (meta.has_value()) {
      // previously throw an exception here but this is *not* an error, it happens for all plugins
      // that have no data
      Napi::Object res = Napi::Object::New(info.Env());
      res.Set("cleanInfo", toNAPI(info.Env(), meta->GetCleanInfo()));
      res.Set("dirtyInfo", toNAPI(info.Env(), meta->GetDirtyInfo()));
      res.Set("group", meta->GetGroup().value_or(""));
      res.Set("incompatibilities", toNAPI(info.Env(), meta->GetIncompatibilities()));
      res.Set("loadAfterFiles", toNAPI(info.Env(), meta->GetLoadAfterFiles()));
      res.Set("locations", toNAPI(info.Env(), meta->GetLocations()));
      res.Set("messages", toNAPI(info.Env(), meta->GetMessages()));
      res.Set("name", meta->GetName());
      res.Set("requirements", toNAPI(info.Env(), meta->GetRequirements()));
      res.Set("tags", toNAPI(info.Env(), meta->GetTags()));
      return res;
    }
  } catch (const std::filesystem::filesystem_error &e) {
    throw ErrnoException(info.Env(), e.code().value(), __FUNCTION__, e.path1().generic_u8string().c_str());
  } catch (const std::exception &e) {
    throw LOOTError(info.Env(), "getPluginMetadata", e.what());
  }

  return info.Env().Undefined();
}

Napi::Value Loot::getPlugin(const Napi::CallbackInfo &info) {
  try {
    auto plugin = m_Game->GetPlugin(info[0].ToString());
    if (plugin.get() == nullptr) {
      return info.Env().Undefined();
    }

    Napi::Object res = Napi::Object::New(info.Env());
    res.Set("bashTags", toNAPI(info.Env(), plugin->GetBashTags()));
    auto crc = plugin->GetCRC();
    res.Set("crc", crc.has_value() ? Napi::Value::From(info.Env(), crc.value()) : info.Env().Null());
    res.Set("headerVersion", plugin->GetHeaderVersion());
    res.Set("masters", toNAPI(info.Env(), plugin->GetMasters()));
    res.Set("name", plugin->GetName());
    auto version = plugin->GetVersion();
    res.Set("version", version.has_value() ? Napi::Value::From(info.Env(), version.value()) : (info.Env().Null()));
    res.Set("isEmpty", plugin->IsEmpty());
    res.Set("isLightMaster", plugin->IsLightMaster());
    res.Set("isMaster", plugin->IsMaster());
    res.Set("isValidAsLightMaster", plugin->IsValidAsLightMaster());
    res.Set("loadsArchive", plugin->LoadsArchive());
    return res;
  } catch (const std::filesystem::filesystem_error &e) {
    throw ErrnoException(info.Env(), e.code().value(), __FUNCTION__, e.path1().generic_u8string().c_str());
  } catch (const std::exception &e) {
    throw LOOTError(info.Env(), "getPlugin", e.what());
  }
  return info.Env().Undefined();
}

Napi::Value Loot::getMasterlistRevision(const Napi::CallbackInfo &info) {
  auto res = Napi::Object::New(info.Env());

  try {
    auto rev = m_Game->GetDatabase()->GetMasterlistRevision(u8Tou16(info[0].ToString()), info[1].ToBoolean());
    res.Set("isModified", rev.is_modified);
    res.Set("revisionDate", rev.revision_date);
    res.Set("revisionId", rev.revision_id);
  } catch (const std::filesystem::filesystem_error &e) {
    throw ErrnoException(info.Env(), e.code().value(), __FUNCTION__, e.path1().generic_u8string().c_str());
  } catch (const std::exception &e) {
    throw LOOTError(info.Env(), "getMasterlistRevision", e.what());
  }
  return res;
}

Napi::Value Loot::sortPlugins(const Napi::CallbackInfo &info) {
  try {
    return toNAPI(info.Env(), m_Game->SortPlugins(fromNAPIArr<std::string>(info[0].As<Napi::Array>())));
  } catch (loot::CyclicInteractionError &e) {
    throw CyclicalInteractionException(info.Env(), e);
  } catch (const std::filesystem::filesystem_error &e) {
    throw ErrnoException(info.Env(), e.code().value(), __FUNCTION__, e.path1().generic_u8string().c_str());
  } catch (const std::exception &e) {
    throw LOOTError(info.Env(), "sortPlugins", e.what());
  }
}

Napi::Value Loot::setLoadOrder(const Napi::CallbackInfo &info) {
  try {
    m_Game->SetLoadOrder(fromNAPIArr<std::string>(info[0].As<Napi::Array>()));
    return info.Env().Undefined();
  } catch (const std::exception &e) {
    throw LOOTError(info.Env(), "setLoadOrder", e.what());
  }
}

Napi::Value Loot::getLoadOrder(const Napi::CallbackInfo &info) {
  try {
    return toNAPI(info.Env(), m_Game->GetLoadOrder());
  } catch (const std::exception &e) {
    throw LOOTError(info.Env(), "getLoadOrder", e.what());
  }
}

Napi::Value Loot::loadCurrentLoadOrderState(const Napi::CallbackInfo &info) {
  try {
    m_Game->LoadCurrentLoadOrderState();
  } catch (const std::exception &e) {
    throw LOOTError(info.Env(), "loadCurrentLoadOrderState", e.what());
  }
  return Napi::Value();
}

Napi::Value Loot::isPluginActive(const Napi::CallbackInfo &info) {
  try {
    return Napi::Boolean::New(info.Env(), m_Game->IsPluginActive(info[0].ToString()));
  } catch (const std::exception &e) {
    throw LOOTError(info.Env(), "isPluginActive", e.what());
  }
}

Napi::Value Loot::getGroups(const Napi::CallbackInfo &info) {
  try {
    return toNAPI(info.Env(), m_Game->GetDatabase()->GetGroups(info[0].ToBoolean()));
  } catch (const std::exception &e) {
    throw LOOTError(info.Env(), "getGroups", e.what());
  }
}

Napi::Value Loot::getUserGroups(const Napi::CallbackInfo &info) {
  try {
    return toNAPI(info.Env(), m_Game->GetDatabase()->GetUserGroups());
  } catch (const std::exception &e) {
    throw LOOTError(info.Env(), "getUserGroups", e.what());
  }
}

Napi::Value Loot::setUserGroups(const Napi::CallbackInfo &info) {
  try {
    m_Game->GetDatabase()->SetUserGroups(fromNAPIArr<loot::Group>(info[0]));
    return info.Env().Undefined();
  } catch (const std::exception &e) {
    throw LOOTError(info.Env(), "setUserGroups", e.what());
  }
}

Napi::Value Loot::getGroupsPath(const Napi::CallbackInfo &info) {
  try {
    return toNAPI(info.Env(), m_Game->GetDatabase()->GetGroupsPath(info[0].ToString(), info[1].ToString()));
  } catch (const std::exception &e) {
    throw LOOTError(info.Env(), "getGroupsPath", e.what());
  }
}

Napi::Value Loot::getGeneralMessages(const Napi::CallbackInfo &info) {
  try {
    return toNAPI(info.Env(), m_Game->GetDatabase()->GetGeneralMessages(info[0].ToBoolean()));
  } catch (const std::exception &e) {
    throw LOOTError(info.Env(), "getGeneralMessages", e.what());
  }
}

void SetErrorLanguageEN() {
#ifdef WIN32
  ULONG count = 1;
  WCHAR wszLanguages[32];
  wsprintfW(wszLanguages, L"%04X%c", MAKELANGID(LANG_ENGLISH, SUBLANG_DEFAULT), 0);
  SetProcessPreferredUILanguages(MUI_LANGUAGE_ID, wszLanguages, &count);
#endif
}

Napi::Boolean IsCompatible(const Napi::CallbackInfo &info) {
  return Napi::Boolean::New(info.Env(), loot::IsCompatible(info[0].ToNumber().Int32Value(), info[1].ToNumber().Int32Value(), info[2].ToNumber().Int32Value()));
}

Napi::Object InitAll(Napi::Env env, Napi::Object exports) {
  exports.Set("IsCompatible", Napi::Function::New(env, IsCompatible));
  Loot::Init(env, exports);
  return exports;
}

NODE_API_MODULE(loot, InitAll)

