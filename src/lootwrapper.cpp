#include "lootwrapper.h"
#undef function

#include <map>
#include <future>
#include <nan.h>
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

struct UnsupportedGame : public std::runtime_error {
  UnsupportedGame() : std::runtime_error("game not supported") {}
};

struct BusyException : public std::runtime_error {
  BusyException() : std::runtime_error("Loot connection is busy") {}
};

inline v8::Local<v8::Value> CyclicalInteractionException(v8::Local<v8::Context> context, loot::CyclicInteractionError &err) {
  v8::Local<v8::Object> exception = Nan::Error(Nan::New<v8::String>(err.what()).ToLocalChecked()).As<v8::Object>();
  std::vector<loot::Vertex> errCycle = err.GetCycle();
  v8::Local<v8::Array> cycle = Nan::New<v8::Array>();

  int idx = 0;
  for (const auto &iter : errCycle) {
    v8::Local<v8::Object> vert = Nan::New<v8::Object>();
    std::string name = iter.GetName();
    auto n = Nan::New<v8::String>(name.c_str());
    auto n2 = n.ToLocalChecked();
    vert->Set(context, "name"_n, n2);
    vert->Set(context, "typeOfEdgeToNextVertex"_n, Nan::New<v8::String>(Vertex::convertEdgeType(*iter.GetTypeOfEdgeToNextVertex())).ToLocalChecked());
    cycle->Set(context, idx++, vert);
  }
  exception->Set(context, "cycle"_n, cycle);

  return exception;
}

inline v8::Local<v8::Value> InvalidParameter(
  v8::Local<v8::Context> context,
  const char *func,
  const char *arg,
  const char *value) {

  std::string message = std::string("Invalid value passed to \"") + func + "\"";
  v8::Local<v8::Object> res = Nan::Error(message.c_str()).As<v8::Object>();
  res->Set(context, "arg"_n, Nan::New(arg).ToLocalChecked());
  res->Set(context, "value"_n, Nan::New(value).ToLocalChecked());
  res->Set(context, "func"_n, Nan::New(func).ToLocalChecked());

  return res;
}

inline v8::Local<v8::Value> LOOTError(
  v8::Local<v8::Context> context,
  const char *func,
  const char *what) {

  std::string message = std::string("LOOT operation \"") + func + "\" failed: " + what;
  v8::Local<v8::Object> res = Nan::Error(message.c_str()).As<v8::Object>();
  res->Set(context, "func"_n, Nan::New(func).ToLocalChecked());

  return res;
}

template <typename T> v8::Local<v8::Value> ToV8(v8::Local<v8::Context> context, const T &value) {
  return Nan::New(value);
}

template <> v8::Local<v8::Value> ToV8(v8::Local<v8::Context> context, const std::vector<std::string> &value) {
  v8::Local<v8::Array> res = Nan::New<v8::Array>();
  uint32_t counter = 0;
  for (const std::string &val : value) {
    res->Set(context, counter++, Nan::New(val.c_str()).ToLocalChecked());
  }
  return res;
}

template <typename ResT>
class Worker : public Nan::AsyncWorker {
public:
  Worker(std::function<ResT()> func, Nan::Callback *appCallback, std::function<void()> internalCallback)
    : Nan::AsyncWorker(appCallback)
    , m_Func(func)
    , m_IntCallback(internalCallback)
  {
  }

  void Execute() {
    try {
      m_Result = m_Func();
    }
    catch (const std::exception &e) {
      SetErrorMessage(e.what());
    }
    catch (...) {
      SetErrorMessage("unknown exception");
    }
  }

  void HandleOKCallback() {
    Nan::HandleScope scope;

    v8::Local<v8::Value> argv[] = {
      Nan::Null()
      , ToV8(m_Result)
    };

    m_IntCallback();
    callback->Call(2, argv);
  }

  void HandleErrorCallback() {
    m_IntCallback();
    Nan::AsyncWorker::HandleErrorCallback();
  }

private:
  ResT m_Result;
  std::function<ResT()> m_Func;
  std::function<void()> m_IntCallback;
};

template <>
class Worker<void> : public Nan::AsyncWorker {
public:
  Worker(std::function<void()> func, Nan::Callback *appCallback, std::function<void()> internalCallback)
    : Nan::AsyncWorker(appCallback)
    , m_Func(func)
    , m_IntCallback(internalCallback)
  {
  }

  void Execute() {
    try {
      m_Func();
    }
    catch (const std::exception &e) {
      SetErrorMessage(e.what());
    }
    catch (...) {
      SetErrorMessage("unknown exception");
    }
  }

  void HandleOKCallback() {
    Nan::HandleScope scope;

    v8::Local<v8::Value> argv[] = {
      Nan::Null()
    };

    m_IntCallback();
    callback->Call(1, argv);
  }

  void HandleErrorCallback() {
    m_IntCallback();
    Nan::AsyncWorker::HandleErrorCallback();
  }

private:
  std::function<void()> m_Func;
  std::function<void()> m_IntCallback;
};

std::wstring u8Tou16(const std::string &input) {
  return toWC(input.c_str(), CodePage::UTF8, input.length());
}

Loot::Loot(std::string gameId, std::string gamePath, std::string gameLocalPath, std::string language,
           LogFunc logCallback)
  : m_Language(language)
  , m_LogCallback(logCallback)
{
  v8::Local<v8::Context> context = Nan::GetCurrentContext();
  v8::Isolate* isolate = context->GetIsolate();

  try {
    /*
    TODO: Disabled for now because it causes the process to hang when calling sortPlugins.
    loot::SetLoggingCallback([this](loot::LogLevel level, const char *message) {
      this->m_LogCallback(static_cast<int>(level), message);
    });
    */
    m_Game = loot::CreateGameHandle(convertGameId(gameId), u8Tou16(gamePath), u8Tou16(gameLocalPath));
  } catch (const std::filesystem::filesystem_error &e) {
#ifdef WIN32
    isolate->ThrowException(WinApiException(context, e.code().value(), __FUNCTION__, e.path1().generic_u8string().c_str()));
#else
    isolate->ThrowException(Nan::ErrnoException(e.code().value(), __FUNCTION__, nullptr, e.path1().generic_u8string().c_str()));
#endif
  } catch (const std::exception &e) {
    Nan::ThrowError(e.what());
  }
  catch (...) {
    Nan::ThrowError("unknown exception");
  }
}

bool Loot::updateMasterlist(std::string masterlistPath, std::string remoteUrl, std::string remoteBranch) {
  v8::Local<v8::Context> context = Nan::GetCurrentContext();
  v8::Isolate* isolate = context->GetIsolate();

  try {
    return m_Game->GetDatabase()->UpdateMasterlist(u8Tou16(masterlistPath), remoteUrl, remoteBranch);
  } catch (const std::filesystem::filesystem_error &e) {
#ifdef WIN32
    isolate->ThrowException(WinApiException(context, e.code().value(), __FUNCTION__, e.path1().generic_u8string().c_str()));
#else
    isolate->ThrowException(Nan::ErrnoException(e.code().value(), __FUNCTION__, nullptr, e.path1().generic_u8string().c_str()));
#endif
  } catch (const std::exception &e) {
    isolate->ThrowException(LOOTError(context, "updateMasterlist", e.what()));
  }
  return false;
}

void Loot::loadLists(std::string masterlistPath, std::string userlistPath)
{
  v8::Local<v8::Context> context = Nan::GetCurrentContext();
  v8::Isolate* isolate = context->GetIsolate();

  try {
    m_Game->GetDatabase()->LoadLists(u8Tou16(masterlistPath), u8Tou16(userlistPath));
  } catch (const std::filesystem::filesystem_error &e) {
#ifdef WIN32
    isolate->ThrowException(WinApiException(context, e.code().value(), __FUNCTION__, e.path1().generic_u8string().c_str()));
#else
    isolate->ThrowException(Nan::ErrnoException(e.code().value(), __FUNCTION__, nullptr, e.path1().generic_u8string().c_str()));
#endif
  } catch (const std::exception &e) {
    isolate->ThrowException(LOOTError(context, "loadLists", e.what()));
  }
}

void Loot::loadPlugins(std::vector<std::string> plugins, bool loadHeadersOnly) {
  v8::Local<v8::Context> context = Nan::GetCurrentContext();
  v8::Isolate* isolate = context->GetIsolate();

  try {
    m_Game->LoadPlugins(plugins, loadHeadersOnly);
  } catch (const std::filesystem::filesystem_error &e) {
#ifdef WIN32
    isolate->ThrowException(WinApiException(context, e.code().value(), __FUNCTION__, e.path1().generic_u8string().c_str()));
#else
    isolate->ThrowException(Nan::ErrnoException(e.code().value(), __FUNCTION__, nullptr, e.path1().generic_u8string().c_str()));
#endif
  } catch (const std::exception &e) {
    isolate->ThrowException(LOOTError(context, "loadPlugins", e.what()));
  }
}

PluginMetadata Loot::getPluginMetadata(std::string plugin)
{
  v8::Local<v8::Context> context = Nan::GetCurrentContext();
  v8::Isolate* isolate = context->GetIsolate();

  try {
    auto metaData = m_Game->GetDatabase()->GetPluginMetadata(plugin, true, true);
    if (!metaData.has_value()) {
      // previously throw an exception here but this is *not* an error, it happens for all plugins
      // that have no data
      return PluginMetadata(loot::PluginMetadata(), m_Language);
    }
    return PluginMetadata(*metaData, m_Language);
  } catch (const std::filesystem::filesystem_error &e) {
#ifdef WIN32
    isolate->ThrowException(WinApiException(context, e.code().value(), __FUNCTION__, e.path1().generic_u8string().c_str()));
#else
    isolate->ThrowException(Nan::ErrnoException(e.code().value(), __FUNCTION__, nullptr, e.path1().generic_u8string().c_str()));
#endif
  } catch (const std::exception &e) {
    isolate->ThrowException(LOOTError(context, "getPluginMetadata", e.what()));
  }
  return PluginMetadata(loot::PluginMetadata(), m_Language);
}

PluginInterface Loot::getPlugin(const std::string &pluginName)
{
  v8::Local<v8::Context> context = Nan::GetCurrentContext();
  v8::Isolate* isolate = context->GetIsolate();

  try {
    auto plugin = m_Game->GetPlugin(pluginName);
    if (plugin.get() == nullptr) {
      NBIND_ERR("Invalid plugin name");
    }
    return PluginInterface(plugin);
  } catch (const std::filesystem::filesystem_error &e) {
#ifdef WIN32
    isolate->ThrowException(WinApiException(context, e.code().value(), __FUNCTION__, e.path1().generic_u8string().c_str()));
#else
    isolate->ThrowException(Nan::ErrnoException(e.code().value(), __FUNCTION__, nullptr, e.path1().generic_u8string().c_str()));
#endif
  } catch (const std::exception &e) {
    isolate->ThrowException(LOOTError(context, "getPlugin", e.what()));
  }
  return PluginInterface(std::shared_ptr<loot::PluginInterface>());
}

MasterlistInfo Loot::getMasterlistRevision(std::string masterlistPath, bool getShortId) const {
  v8::Local<v8::Context> context = Nan::GetCurrentContext();
  v8::Isolate* isolate = context->GetIsolate();

  try {
    return m_Game->GetDatabase()->GetMasterlistRevision(u8Tou16(masterlistPath), getShortId);
  } catch (const std::filesystem::filesystem_error &e) {
#ifdef WIN32
    isolate->ThrowException(WinApiException(context, e.code().value(), __FUNCTION__, e.path1().generic_u8string().c_str()));
#else
    isolate->ThrowException(Nan::ErrnoException(e.code().value(), __FUNCTION__, nullptr, e.path1().generic_u8string().c_str()));
#endif
  } catch (const std::exception &e) {
    isolate->ThrowException(LOOTError(context, "getMasterlistRevision", e.what()));
  }
  return loot::MasterlistInfo();
}

std::vector<std::string> Loot::sortPlugins(std::vector<std::string> input)
{
  v8::Local<v8::Context> context = Nan::GetCurrentContext();
  v8::Isolate* isolate = context->GetIsolate();

  try {
    return m_Game->SortPlugins(input);
  } catch (loot::CyclicInteractionError &e) {
    isolate->ThrowException(CyclicalInteractionException(context, e));
  } catch (const std::filesystem::filesystem_error &e) {
#ifdef WIN32
    isolate->ThrowException(WinApiException(context, e.code().value(), __FUNCTION__, e.path1().generic_u8string().c_str()));
#else
    isolate->ThrowException(Nan::ErrnoException(e.code().value(), __FUNCTION__, nullptr, e.path1().generic_u8string().c_str()));
#endif
  } catch (const std::exception &e) {
    isolate->ThrowException(LOOTError(context, "sortPlugins", e.what()));
  }
  return std::vector<std::string>();
}

void Loot::setLoadOrder(std::vector<std::string> input) {
  try {
    m_Game->SetLoadOrder(input);
  } catch (const std::exception &e) {
    v8::Local<v8::Context> context = Nan::GetCurrentContext();
    v8::Isolate* isolate = context->GetIsolate();

    isolate->ThrowException(LOOTError(context, "setLoadOrder", e.what()));
  }
}

std::vector<std::string> Loot::getLoadOrder() const {
  try {
    return m_Game->GetLoadOrder();
  } catch (const std::exception &e) {
    v8::Local<v8::Context> context = Nan::GetCurrentContext();
    v8::Isolate* isolate = context->GetIsolate();
    isolate->ThrowException(LOOTError(context, "getLoadOrder", e.what()));
  }
  return std::vector<std::string>();
}

void Loot::loadCurrentLoadOrderState() {
  try {
    return m_Game->LoadCurrentLoadOrderState();
  } catch (const std::exception &e) {
    v8::Local<v8::Context> context = Nan::GetCurrentContext();
    v8::Isolate* isolate = context->GetIsolate();
    isolate->ThrowException(LOOTError(context, "loadCurrentLoadOrderState", e.what()));
  }
}

bool Loot::isPluginActive(const std::string &pluginName) const {
  try {
    return m_Game->IsPluginActive(pluginName);
  } catch (const std::exception &e) {
    v8::Local<v8::Context> context = Nan::GetCurrentContext();
    v8::Isolate* isolate = context->GetIsolate();
    isolate->ThrowException(LOOTError(context, "isPluginActive", e.what()));
  }
  return false;
}

std::vector<Group> Loot::getGroups(bool includeUserMetadata) const
{
  try {
    return transform<Group>(m_Game->GetDatabase()->GetGroups(includeUserMetadata));
  } catch (const std::exception &e) {
    v8::Local<v8::Context> context = Nan::GetCurrentContext();
    v8::Isolate* isolate = context->GetIsolate();
    isolate->ThrowException(LOOTError(context, "getGroups", e.what()));
  }
  return std::vector<Group>();
}

std::vector<Group> Loot::getUserGroups() const {
  try {
    return transform<Group>(m_Game->GetDatabase()->GetUserGroups());
  } catch (const std::exception &e) {
    v8::Local<v8::Context> context = Nan::GetCurrentContext();
    v8::Isolate* isolate = context->GetIsolate();
    isolate->ThrowException(LOOTError(context, "getUserGroups", e.what()));
  }
  return std::vector<Group>();
}

void Loot::setUserGroups(const std::vector<Group>& groups) {
  try {
    std::unordered_set<loot::Group> result;
    for (const auto &ele : groups) {
      result.insert(ele);
    }
    m_Game->GetDatabase()->SetUserGroups(result);
  } catch (const std::exception &e) {
    v8::Local<v8::Context> context = Nan::GetCurrentContext();
    v8::Isolate* isolate = context->GetIsolate();
    isolate->ThrowException(LOOTError(context, "setUserGroups", e.what()));
  }
}

std::vector<Vertex> Loot::getGroupsPath(const std::string &fromGroupName, const std::string &toGroupName) const {
  try {
    return transform<Vertex>(m_Game->GetDatabase()->GetGroupsPath(fromGroupName, toGroupName));
  } catch (const std::exception &e) {
    v8::Local<v8::Context> context = Nan::GetCurrentContext();
    v8::Isolate* isolate = context->GetIsolate();
    isolate->ThrowException(LOOTError(context, "getGroupsPath", e.what()));
  }
  return std::vector<Vertex>();
}

std::vector<Message> Loot::getGeneralMessages(bool evaluateConditions) const {
  try {
    const std::vector<loot::Message> messages = m_Game->GetDatabase()->GetGeneralMessages(evaluateConditions);
    std::vector<Message> result;
    for (const auto &msg : messages) {
      result.push_back(Message(msg, m_Language));
    }
    return result;
  } catch (const std::exception &e) {
    v8::Local<v8::Context> context = Nan::GetCurrentContext();
    v8::Isolate* isolate = context->GetIsolate();
    isolate->ThrowException(LOOTError(context, "getGeneralMessages", e.what()));
  }
  return std::vector<Message>();
}

loot::GameType Loot::convertGameId(const std::string &gameId) const {
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
    throw UnsupportedGame();
  }
  return iter->second;
}

PluginMetadata::PluginMetadata(const loot::PluginMetadata &reference, const std::string &language)
  : m_Wrapped(reference), m_Language(language)
{
}

void PluginMetadata::toJS(nbind::cbOutput output) const {
  auto group = GetGroup();
  output(GetName(), GetMessages(), GetTags(), GetCleanInfo(), GetDirtyInfo(),
    GetIncompatibilities(), GetLoadAfterFiles(), GetLocations(), GetRequirements(),
    IsEnabled(), group.has_value() ? *group : std::string());
}

inline MasterlistInfo::MasterlistInfo(loot::MasterlistInfo info)
{
  this->revision_id = info.revision_id;
  this->revision_date = info.revision_date;
  this->is_modified = info.is_modified;
}

inline void MasterlistInfo::toJS(nbind::cbOutput output) const {
  output(revision_id, revision_date, is_modified);
}

inline std::string MasterlistInfo::getRevisionId() const {
  return revision_id;
}

inline std::string MasterlistInfo::getRevisionDate() const {
  return revision_date;
}

inline bool MasterlistInfo::getIsModified() const {
  return is_modified;
}

void SetErrorLanguageEN() {
#ifdef WIN32
  ULONG count = 1;
  WCHAR wszLanguages[32];
  wsprintfW(wszLanguages, L"%04X%c", MAKELANGID(LANG_ENGLISH, SUBLANG_DEFAULT), 0);
  SetProcessPreferredUILanguages(MUI_LANGUAGE_ID, wszLanguages, &count);
#endif
}
