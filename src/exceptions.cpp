#include "exceptions.h"
#include "string_cast.h"
#include "util.h"
#include <napi.h>
#include <optional>

#ifdef WIN32
#include <windows.h>

std::wstring strerror(unsigned long errorno) {
  wchar_t *errmsg = nullptr;

  LCID lcid;
  GetLocaleInfoEx(L"en-US", LOCALE_RETURN_NUMBER | LOCALE_ILANGUAGE, reinterpret_cast<LPWSTR>(&lcid), sizeof(lcid));

  FormatMessageW(FORMAT_MESSAGE_ALLOCATE_BUFFER | FORMAT_MESSAGE_FROM_SYSTEM |
    FORMAT_MESSAGE_IGNORE_INSERTS, nullptr, errorno,
    lcid, (LPWSTR)&errmsg, 0, nullptr);

  if (errmsg) {
    for (int i = (wcslen(errmsg) - 1);
      (i >= 0) && ((errmsg[i] == '\n') || (errmsg[i] == '\r'));
      --i) {
      errmsg[i] = '\0';
    }

    return errmsg;
  }
  else {
    return L"Unknown error";
  }
}

#endif // WIN32

Napi::Error ErrnoException(const Napi::Env &env, unsigned long lastError, const char * func, const char * path) {

#ifdef WIN32
  std::wstring errStr = strerror(lastError);
  std::string err = toMB(errStr.c_str(), CodePage::UTF8, errStr.size());
#else
  std::string err = strerror(lastError);
#endif

  Napi::Error res = Napi::Error::New(env, err.c_str());
  res.Set("code", Napi::Number::From(env, lastError));
  res.Set("path", path);
  res.Set("func", func);

  return res;
}

Napi::Error ExcWrap(const Napi::Env &env, const char *func, const std::exception &e) {
  Napi::Error res = Napi::Error::New(env, e.what());
  res.Set("func", func);
  return res;
}


Napi::Error UnsupportedGame(const Napi::Env & env) {
  return Napi::Error::New(env, "game not supported");
}

Napi::Error BusyException(const Napi::Env & env) {
  return Napi::Error::New(env, "Loot connection is busy");
}

Napi::Error CyclicalInteractionException(const Napi::Env &env, loot::CyclicInteractionError & err) {
  Napi::Error res = Napi::Error::New(env, err.what());
  
  std::vector<loot::Vertex> errCycle = err.GetCycle();
  Napi::Array cycle = Napi::Array::New(env);
  
  int idx = 0;
  for (const auto &iter : errCycle) {
    Napi::Object vert = Napi::Object::New(env);
    vert.Set("name", iter.GetName());
    auto edgeType = iter.GetTypeOfEdgeToNextVertex();
    vert.Set("typeOfEdgeToNextVertex", edgeType.has_value() ? convertEdgeType(edgeType.value()) : "");
    cycle.Set(idx++, vert);
  }
  res.Set("cycle", cycle);
  
  return res;
}

Napi::Error InvalidParameter(const Napi::Env &env, const char *func, const char *arg, const char *value) {
  Napi::Error res = Napi::Error::New(env, "Invalid value passed to function");
  res.Set("arg", arg);
  res.Set("value", value);
  res.Set("func", func);
  
  return res;
}

Napi::Error LOOTError(const Napi::Env &env, const char *func, const char *what) {
  Napi::Error res = Napi::Error::New(env, what);
  res.Set("func", func);
  
  return res;
}

Napi::Error PluginNotLoaded(const Napi::Env &env, const char *func, const char *what) {
  return PluginNotLoaded(env, func, what, std::nullopt);
}

Napi::Error PluginNotLoaded(
  const Napi::Env &env,
  const char* func,
  const char* what,
  const std::optional<std::vector<std::shared_ptr<const loot::PluginInterface>>>& currentlyLoaded = std::nullopt
) {
  Napi::Error res = Napi::Error::New(env, what);
  std::string errorStr(what);
  std::string pluginName;
  size_t start = errorStr.find('"');
  if (start != std::string::npos) {
    size_t end = errorStr.find('"', start + 1);
    if (end != std::string::npos && end > start + 1) {
      pluginName = errorStr.substr(start + 1, end - start - 1);
    }
  }
  res.Set("name", "PluginNotLoaded");
  res.Set("plugin", pluginName);
  res.Set("func", func);

  // Convert currentlyLoaded to an array of plugin names if provided
  if (currentlyLoaded.has_value()) {
    const auto& loaded = currentlyLoaded.value();
    Napi::Array arr = Napi::Array::New(env, loaded.size());
    for (size_t i = 0; i < loaded.size(); ++i) {
      if (loaded[i]) {
        arr.Set(i, loaded[i]->GetName());
      } else {
        arr.Set(i, env.Null());
      }
    }
    res.Set("currentlyLoaded", arr);
  }

  return res;
}