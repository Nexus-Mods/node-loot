#pragma once


#ifdef WIN32
#include <windows.h>
#endif // WIN32
#include <exception>
#include <napi.h>
#include <loot/api.h>

Napi::Error ErrnoException(const Napi::Env &env
                           , unsigned long lastError
                           , const char *func = nullptr
                           , const char* path = nullptr);
Napi::Error ExcWrap(const Napi::Env &env, const char *func, const std::exception &e);

Napi::Error UnsupportedGame(const Napi::Env &env);

Napi::Error BusyException(const Napi::Env &env);

Napi::Error CyclicalInteractionException(const Napi::Env &env, loot::CyclicInteractionError &err);

Napi::Error InvalidParameter(const Napi::Env &env, const char *func, const char *arg, const char *value);

Napi::Error LOOTError(const Napi::Env &env, const char *func, const char *what);



